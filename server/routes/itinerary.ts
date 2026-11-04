import { Router } from "express";
import { generateJson, GeminiError } from "../lib/gemini.js";
import { TTLCache, normalizeKey } from "../lib/cache.js";
import { limits } from "../lib/rateLimit.js";
import { parseBody } from "../lib/http.js";
import { generateItineraryBody } from "../lib/validate.js";
import { itineraryResponseSchema, looksLikeItinerary } from "../schemas/itinerary.js";
import { WANDER_SYSTEM_INSTRUCTION } from "../prompts/wander.js";
import { getSampleItinerary, parseDurationDays } from "../../src/data/sampleItineraries.js";
import { VERIFIED_VIETNAM_PLACES, type PlaceSearchResult } from "../../src/data/placesData.js";

/* ------------------------------------------------------------------ */
/* Hậu xử lý lịch trình AI (dùng chung cho generate, chat, suggest)    */
/* ------------------------------------------------------------------ */

/** Bounding box Việt Nam (gồm cả Phú Quốc, Côn Đảo). */
export const VN_BBOX = { minLat: 8, maxLat: 23.5, minLng: 102, maxLng: 110 } as const;

export function isInVietnam(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VN_BBOX.minLat &&
    lat <= VN_BBOX.maxLat &&
    lng >= VN_BBOX.minLng &&
    lng <= VN_BBOX.maxLng
  );
}

/** normalizeKey + bỏ dấu câu → chỉ còn chữ/số/khoảng trắng. */
export function normName(s: unknown): string {
  return normalizeKey(String(s ?? ""))
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CITY_ALIASES: Array<[RegExp, string]> = [
  [/\b(tp )?(thanh pho )?ho chi minh\b|\bsai gon\b|\btphcm\b|\bhcm\b/g, "ho chi minh"],
  [/\bvinh ha long\b/g, "ha long"],
  [/\bco do hue\b/g, "hue"],
];

function canonCity(s: unknown): string {
  let n = normName(s);
  for (const [re, rep] of CITY_ALIASES) n = n.replace(re, rep);
  return n.replace(/\btp\b/g, "").replace(/\s+/g, " ").trim();
}

/** Hai chuỗi thành phố có chỉ cùng một nơi không (bỏ dấu, chứa nhau). */
export function cityMatches(placeCity: string, hint: unknown): boolean {
  const a = canonCity(placeCity);
  const b = canonCity(hint);
  if (!a || !b) return false;
  return ` ${b} `.includes(` ${a} `) || ` ${a} `.includes(` ${b} `);
}

function verifiedKeys(name: string): { full: string; parts: string[] } {
  const full = normName(name);
  const parts = name
    .split(/\s+[-–&]\s+|[,()]/)
    .map(normName)
    .filter((k) => k.length >= 6);
  return { full, parts };
}

/**
 * Tìm địa điểm đã xác minh khớp `placeName` (so khớp bỏ dấu).
 * `cityHint` (điểm đến) và `addressHint` dùng để tránh khớp nhầm thành phố khác.
 */
export function matchVerifiedPlace(
  placeName: unknown,
  cityHint?: unknown,
  addressHint?: unknown
): PlaceSearchResult | null {
  const n = normName(placeName);
  if (n.length < 4) return null;
  const padded = ` ${n} `;
  for (const p of VERIFIED_VIETNAM_PLACES) {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    if (cityHint || addressHint) {
      const addr = normName(addressHint);
      const cityOk =
        (cityHint ? cityMatches(p.city, cityHint) : false) ||
        (addr ? ` ${addr} `.includes(` ${canonCity(p.city)} `) : false);
      if (!cityOk) continue;
    }
    const { full, parts } = verifiedKeys(p.name);
    if (n === full || parts.includes(n)) return p;
    // Model viết tắt tên dài (vd "Chùa Cầu" ⊂ "Chùa Cầu & Thả Đèn Hoa Đăng...")
    if (n.length >= 8 && ` ${full} `.includes(padded)) return p;
    // Model viết dài hơn (vd "Hồ Hoàn Kiếm (Hồ Gươm)")
    if (parts.some((k) => k.length >= 8 && padded.includes(` ${k} `))) return p;
  }
  return null;
}

const FAKE_STAT_RE =
  /\d[\d.,]*\s*(k|m|tr|triệu|trieu|nghìn|ngàn|ngan)?\s*\+?\s*(views?|lượt xem|luot xem|lượt thích|likes?|followers?|reviews?|đánh giá|danh gia)/gi;
const RATING_RE = /(\d([.,]\d)?\s*[★⭐]|[★⭐]\s*\d([.,]\d)?)/g;

/** Bỏ số liệu mạng xã hội/rating khỏi nhãn (không bao giờ hiển thị số bịa). */
export function sanitizeBadge(label: unknown): string {
  const cleaned = String(label ?? "")
    .replace(FAKE_STAT_RE, "")
    .replace(RATING_RE, "")
    .replace(/[\s•·|,:\-–]+$/g, "")
    .replace(/^[\s•·|,:\-–]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned && String(label ?? "").trim()) return "Nổi tiếng";
  return cleaned;
}

function toNum(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() !== "" && Number.isFinite(Number(x))) return Number(x);
  return undefined;
}

/** Gán toạ độ cho một ScheduleItem: verified > geocoded (giữ lại) > ai_estimate (trong bbox) > xoá. */
export function applyGeo(item: any, destination?: unknown): any {
  const verified = matchVerifiedPlace(item.place_name, destination, item.address_hint);
  if (verified) {
    item.lat = verified.lat;
    item.lng = verified.lng;
    item.geo_source = "verified";
    return item;
  }
  const lat = toNum(item.lat);
  const lng = toNum(item.lng);
  if (isInVietnam(lat, lng)) {
    item.lat = lat;
    item.lng = lng;
    // "geocoded" chỉ đến từ lịch trình gốc (Nominatim phía Agent Map), giữ nguyên.
    item.geo_source = item.geo_source === "geocoded" ? "geocoded" : "ai_estimate";
  } else {
    delete item.lat;
    delete item.lng;
    delete item.geo_source;
  }
  return item;
}

/** Chuẩn hoá một ScheduleItem: field bắt buộc, số, nhãn không số liệu, toạ độ. */
export function normalizeScheduleItem(raw: any, destination?: unknown, fallbackId = "item"): any {
  const item: any = { ...(raw || {}) };
  item.id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : fallbackId;
  item.time_slot = String(item.time_slot ?? "");
  item.time_period = String(item.time_period || "morning");
  item.place_name = String(item.place_name ?? "").trim();
  item.category = String(item.category || "other");
  item.category_icon = String(item.category_icon || "explore");
  item.address_hint = String(item.address_hint ?? "");
  item.recommended_dish_or_activity = String(item.recommended_dish_or_activity ?? "");
  item.cost_vnd = Math.max(0, Math.round(toNum(item.cost_vnd) ?? 0));
  const st = item.social_trend || {};
  item.social_trend = {
    ...st,
    is_viral: !!st.is_viral,
    platform: String(st.platform || "none"),
    badge_label: sanitizeBadge(st.badge_label),
  };
  const ui = item.ui_card || {};
  item.ui_card = {
    badge_color: String(ui.badge_color || "#E2A854"),
    quick_description: String(ui.quick_description || item.recommended_dish_or_activity || ""),
  };
  return applyGeo(item, destination);
}

export interface PostProcessOptions {
  /** Số ngày người dùng yêu cầu; thừa thì cắt, thiếu thì ghi log (không bịa ngày). */
  expectedDays?: number | null;
  /** Lịch trình gốc khi sửa qua chat — khôi phục image_url/toạ độ đã có cho điểm không đổi. */
  original?: any;
  logTag?: string;
}

export interface PostProcessResult {
  data: any;
  /** Có khi số ngày model trả về khác yêu cầu. */
  dayMismatch: { expected: number; got: number } | null;
}

function indexOriginalItems(original: any): Map<string, any> {
  const map = new Map<string, any>();
  if (!original || !Array.isArray(original.itinerary)) return map;
  for (const d of original.itinerary) {
    for (const it of Array.isArray(d?.schedule) ? d.schedule : []) {
      if (it?.id) map.set(`${it.id}|${normName(it.place_name)}`, it);
    }
  }
  return map;
}

/** Hậu xử lý lịch trình từ AI/mẫu. Không mutate input. */
export function postProcessItinerary(input: any, opts: PostProcessOptions = {}): PostProcessResult {
  const data = structuredClone(input);
  const destination = data?.meta?.destination;
  const originals = indexOriginalItems(opts.original);

  let days: any[] = Array.isArray(data.itinerary) ? data.itinerary.filter((d: any) => d && typeof d === "object") : [];
  days.sort((a, b) => (toNum(a.day_number) ?? 0) - (toNum(b.day_number) ?? 0));

  let dayMismatch: PostProcessResult["dayMismatch"] = null;
  const expected = opts.expectedDays;
  if (expected && expected > 0 && days.length !== expected) {
    dayMismatch = { expected, got: days.length };
    console.warn(`[${opts.logTag || "itinerary"}] model trả ${days.length} ngày, yêu cầu ${expected}`);
    if (days.length > expected) days = days.slice(0, expected);
  }

  const seenIds = new Set<string>();
  data.itinerary = days.map((d, di) => ({
    ...d,
    day_number: di + 1,
    day_title: String(d.day_title ?? `Ngày ${di + 1}`),
    schedule: (Array.isArray(d.schedule) ? d.schedule : []).map((raw: any, ii: number) => {
      const orig = raw?.id ? originals.get(`${raw.id}|${normName(raw.place_name)}`) : undefined;
      const merged = orig
        ? {
            ...raw,
            image_url: raw.image_url ?? orig.image_url,
            ui_card: raw.ui_card ?? orig.ui_card,
            social_trend: raw.social_trend ?? orig.social_trend,
            ...(orig.geo_source === "verified" || orig.geo_source === "geocoded"
              ? { lat: orig.lat, lng: orig.lng, geo_source: orig.geo_source }
              : {}),
          }
        : raw;
      const item = normalizeScheduleItem(merged, destination, `d${di + 1}_${ii + 1}`);
      if (seenIds.has(item.id)) item.id = `${item.id}_d${di + 1}_${ii + 1}`;
      seenIds.add(item.id);
      return item;
    }),
  }));

  if (data.meta) {
    data.meta.total_estimated_cost_vnd = Math.max(0, Math.round(toNum(data.meta.total_estimated_cost_vnd) ?? 0));
    data.meta.currency_symbol = data.meta.currency_symbol || "đ";
  }
  if (!data.map_config) data.map_config = { recommended_zoom: 13, search_center_hint: String(destination ?? "") };
  if (!data.budget_breakdown) {
    data.budget_breakdown = { food_and_drink_vnd: 0, attractions_and_activities_vnd: 0, transport_and_others_vnd: 0 };
  }
  if (!Array.isArray(data.local_insider_tips)) data.local_insider_tips = [];

  return { data, dayMismatch };
}

/* ------------------------------------------------------------------ */
/* Route                                                              */
/* ------------------------------------------------------------------ */

const cache = new TTLCache<any>(300);

/** Chỉ dùng trong test. */
export function __clearItineraryCacheForTests() {
  cache.clear();
}

export const itineraryRouter = Router();

itineraryRouter.post("/api/generate-itinerary", limits.generate, async (req, res) => {
  const body = parseBody(generateItineraryBody, req.body, res);
  if (!body) return;

  const destination = body.destination || "Đà Nẵng";
  const duration = body.duration || "3N2Đ";
  const days = parseDurationDays(duration);
  const preferences =
    body.preferences || "Săn đặc sản ẩm thực địa phương, điểm check-in nổi tiếng, thiên nhiên thư giãn";
  const budget = body.budget || "3.000.000 đ";

  const key = normalizeKey(destination, days, budget, preferences);
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, source: "cache", data: cached });

  const prompt = `Tạo lịch trình du lịch cho điểm đến: ${destination}, thời gian: ${duration} (BẮT BUỘC đủ ${days} ngày, day_number 1 đến ${days}).
Sở thích / yêu cầu: ${preferences}.
Ngân sách dự kiến: ${budget}.
Nhớ điền lat/lng ước lượng cho từng điểm.`;

  try {
    const raw = await generateJson<any>({
      contents: prompt,
      systemInstruction: WANDER_SYSTEM_INSTRUCTION,
      responseSchema: itineraryResponseSchema,
    });
    if (!looksLikeItinerary(raw)) throw new GeminiError("BAD_RESPONSE", "Lịch trình AI trả về thiếu dữ liệu");
    const { data, dayMismatch } = postProcessItinerary(raw, { expectedDays: days, logTag: "generate-itinerary" });
    // Thiếu ngày: vẫn trả nhưng không cache, để lần sau có cơ hội nhận bản đủ.
    if (!dayMismatch || dayMismatch.got > dayMismatch.expected) cache.set(key, data);
    return res.json({
      success: true,
      source: "gemini",
      data,
      ...(dayMismatch && dayMismatch.got < dayMismatch.expected
        ? { message: `AI chỉ tạo được ${dayMismatch.got}/${dayMismatch.expected} ngày. Bạn có thể thử lại hoặc tự thêm ngày.` }
        : {}),
    });
  } catch (err) {
    const e = err as GeminiError;
    console.error("[generate-itinerary]", e.code, e.message);
    return res.json({
      success: true,
      fallback: true,
      source: "sample",
      errorCode: e.code,
      message:
        e.code === "NO_KEY"
          ? "Chưa cấu hình Gemini. Đây là lịch trình mẫu."
          : e.code === "RATE_LIMITED"
            ? "AI đã hết lượt miễn phí tạm thời. Đây là lịch trình mẫu, bạn có thể thử lại sau."
            : "AI tạm thời không phản hồi. Đây là lịch trình mẫu, bạn có thể thử lại sau.",
      data: postProcessItinerary(getSampleItinerary(destination, duration), { logTag: "sample" }).data,
    });
  }
});
