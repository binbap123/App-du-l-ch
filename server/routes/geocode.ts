import { Router } from "express";
import { limits } from "../lib/rateLimit.js";
import { parseBody } from "../lib/http.js";
import { geocodeQuery } from "../lib/validate.js";
import { TTLCache, normalizeKey } from "../lib/cache.js";
import { VERIFIED_VIETNAM_PLACES } from "../../src/data/placesData.js";

/**
 * GET /api/geocode?q=&city=
 * Thứ tự: khớp tên trong VERIFIED_VIETNAM_PLACES ("verified") → Nominatim ("geocoded").
 * Nominatim: ≤ 1 request/giây toàn server (hàng đợi), timeout 8s, chỉ nhận toạ độ trong bbox Việt Nam,
 * cache 30 ngày (kể cả "không tìm thấy"). Nominatim lỗi → data: null (không 500).
 * Response: { success: true, data: { lat, lng, geo_source, display_name } | null }
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  geo_source: "verified" | "geocoded";
  display_name: string;
}

export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
export const NOMINATIM_USER_AGENT = "WanderAI/1.0 (personal project)";
const NOMINATIM_TIMEOUT_MS = 8_000;
const DAY = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 30 * DAY;
/** Lỗi mạng/HTTP chỉ cache ngắn để không khoá 1 địa điểm suốt 30 ngày vì sự cố tạm thời. */
const ERROR_CACHE_TTL_MS = 10 * 60 * 1000;

export const VN_BBOX = { minLat: 8.0, maxLat: 23.5, minLng: 102.0, maxLng: 110.0 };

export function isInVietnam(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VN_BBOX.minLat &&
    lat <= VN_BBOX.maxLat &&
    lng >= VN_BBOX.minLng &&
    lng <= VN_BBOX.maxLng
  );
}

const geocodeCache = new TTLCache<GeocodeResult | null>(5000, CACHE_TTL_MS);
const inFlight = new Map<string, Promise<GeocodeResult | null>>();

// ---------- Khớp DB nội bộ đã xác minh ----------

export function matchVerifiedPlace(q: string, city?: string): GeocodeResult | null {
  const qKey = normalizeKey(q);
  const cityKey = normalizeKey((city || "").split("-")[0]);
  if (!qKey) return null;

  const candidates = VERIFIED_VIETNAM_PLACES.filter((p) => {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return false;
    const nameKey = normalizeKey(p.name);
    if (nameKey === qKey) return true;
    // Khớp một phần chỉ khi chuỗi đủ dài, tránh "an" khớp "Hội An".
    if (qKey.length >= 5 && nameKey.includes(qKey)) return true;
    if (nameKey.length >= 5 && qKey.includes(nameKey)) return true;
    return false;
  });
  if (candidates.length === 0) return null;

  const sameCity = cityKey
    ? candidates.filter((p) => {
        const pc = normalizeKey(p.city);
        return pc.includes(cityKey) || cityKey.includes(pc);
      })
    : candidates;
  // Có city nhưng không ứng viên nào cùng thành phố → không coi là khớp (tránh nhầm địa điểm trùng tên).
  if (cityKey && sameCity.length === 0) return null;

  const exact = sameCity.find((p) => normalizeKey(p.name) === qKey);
  const best = exact || sameCity[0];
  return {
    lat: best.lat as number,
    lng: best.lng as number,
    geo_source: "verified",
    display_name: best.address ? `${best.name}, ${best.address}` : best.name,
  };
}

// ---------- Hàng đợi Nominatim (≤ 1 request/giây toàn server) ----------

let minIntervalMs = 1000;
let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function enqueueNominatim<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const wait = lastRequestAt + minIntervalMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return task();
  });
  // Lỗi của task không được làm gãy hàng đợi.
  queueTail = run.catch(() => undefined);
  return run;
}

async function fetchNominatim(q: string, city: string): Promise<{ result: GeocodeResult | null; ok: boolean }> {
  const text = city ? `${q}, ${city}` : q;
  const params = new URLSearchParams({ format: "jsonv2", countrycodes: "vn", limit: "1", q: text });
  try {
    const r = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT, "Accept-Language": "vi" },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
    const data = await r.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return { result: null, ok: true };
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!isInVietnam(lat, lng)) return { result: null, ok: true };
    return {
      result: { lat, lng, geo_source: "geocoded", display_name: String(first.display_name || text) },
      ok: true,
    };
  } catch (err: any) {
    console.error("[geocode] Nominatim error:", err?.message);
    return { result: null, ok: false };
  }
}

export async function geocode(q: string, city = ""): Promise<GeocodeResult | null> {
  const verified = matchVerifiedPlace(q, city);
  if (verified) return verified;

  const key = normalizeKey(q, city);
  const cached = geocodeCache.get(key);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const p = enqueueNominatim(() => fetchNominatim(q, city))
    .then(({ result, ok }) => {
      geocodeCache.set(key, result, ok ? CACHE_TTL_MS : ERROR_CACHE_TTL_MS);
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/** Chỉ dùng trong test. */
export function __resetGeocodeForTests(opts: { minIntervalMs?: number } = {}) {
  geocodeCache.clear();
  inFlight.clear();
  queueTail = Promise.resolve();
  lastRequestAt = 0;
  minIntervalMs = opts.minIntervalMs ?? 1000;
}

export const geocodeRouter = Router();

geocodeRouter.get("/api/geocode", limits.geocode, async (req, res) => {
  const q = parseBody(geocodeQuery, req.query, res);
  if (!q) return;
  const data = await geocode(q.q, q.city);
  res.json({ success: true, data });
});
