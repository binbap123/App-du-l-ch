/**
 * Geocode các điểm thiếu toạ độ qua /api/geocode (server lo Nominatim + cache).
 * - Gọi TUẦN TỰ (một hàng đợi chung cho cả app), cache trong RAM theo key.
 * - Lỗi (kể cả 501 khi endpoint chưa có) → điểm đó trả null, UI bỏ qua.
 * - Server trả 501 NOT_IMPLEMENTED → tắt geocode cho cả phiên, không spam request.
 */
import { useEffect, useState } from "react";
import { ApiError, fetchJson } from "../lib/api";
import { isValidLatLng, normalizeName, type GeoPoint } from "../components/map/mapUtils";
import type { GeoSource } from "../types";

export interface GeocodeRequest {
  q: string;
  city?: string;
}

interface GeocodeResponse {
  success: true;
  data: { lat: number; lng: number; geo_source?: GeoSource; display_name?: string } | null;
}

const cache = new Map<string, GeoPoint | null>();
const inflight = new Map<string, Promise<GeoPoint | null>>();
let queue: Promise<unknown> = Promise.resolve();
let disabled = false;

/** Lỗi tạm thời → không cache, lần mount sau thử lại. */
const TRANSIENT = new Set(["RATE_LIMITED", "TIMEOUT", "NETWORK", "ABORTED"]);

export function geocodeKey(q: string, city?: string): string {
  return `${normalizeName(q)}|${normalizeName(city || "")}`;
}

export function geocodeOnce(q: string, city?: string): Promise<GeoPoint | null> {
  const key = geocodeKey(q, city);
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = queue.then(async (): Promise<GeoPoint | null> => {
    if (disabled) return null;
    const params = new URLSearchParams({ q: q.slice(0, 200) });
    if (city) params.set("city", city.slice(0, 60));
    try {
      const res = await fetchJson<GeocodeResponse>(`/api/geocode?${params}`, { timeoutMs: 15_000 });
      const d = res?.data;
      const point = d && isValidLatLng(d.lat, d.lng) ? { lat: d.lat, lng: d.lng, geo_source: d.geo_source || "geocoded" } : null;
      cache.set(key, point);
      return point;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 501 || err.code === "NOT_IMPLEMENTED") disabled = true;
        if (!TRANSIENT.has(err.code)) cache.set(key, null);
      }
      return null;
    } finally {
      inflight.delete(key);
    }
  });
  queue = p.catch(() => undefined);
  inflight.set(key, p);
  return p;
}

export interface UseGeocodeResult {
  /** key (geocodeKey) → toạ độ, hoặc null nếu không xác định được. Chưa có key = đang chờ. */
  results: Record<string, GeoPoint | null>;
  pending: boolean;
}

export function useGeocode(requests: GeocodeRequest[]): UseGeocodeResult {
  const reqKey = JSON.stringify(requests.map((r) => [r.q, r.city || ""]));
  const [state, setState] = useState<UseGeocodeResult>({ results: {}, pending: requests.length > 0 });

  useEffect(() => {
    let cancelled = false;
    const list = JSON.parse(reqKey) as [string, string][];
    const initial: Record<string, GeoPoint | null> = {};
    const missing: [string, string][] = [];
    for (const [q, city] of list) {
      const k = geocodeKey(q, city);
      if (cache.has(k)) initial[k] = cache.get(k) ?? null;
      else if (!missing.some(([mq, mc]) => geocodeKey(mq, mc) === k)) missing.push([q, city]);
    }
    setState({ results: initial, pending: missing.length > 0 });
    if (!missing.length) return;

    (async () => {
      for (const [q, city] of missing) {
        const r = await geocodeOnce(q, city || undefined);
        if (cancelled) return;
        const k = geocodeKey(q, city);
        setState((prev) => ({ ...prev, results: { ...prev.results, [k]: r } }));
      }
      if (!cancelled) setState((prev) => ({ ...prev, pending: false }));
    })();
    return () => {
      cancelled = true;
    };
  }, [reqKey]);

  return state;
}
