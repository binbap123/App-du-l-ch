import { Router } from "express";
import { limits } from "../lib/rateLimit.js";
import { parseBody } from "../lib/http.js";
import { suggestBody } from "../lib/validate.js";
import { TTLCache, normalizeKey } from "../lib/cache.js";
import { generateJson, isGeminiConfigured, GeminiError } from "../lib/gemini.js";
import { suggestResponseSchema } from "../schemas/itinerary.js";
import { SUGGEST_SYSTEM_INSTRUCTION, buildSuggestPrompt } from "../prompts/suggest.js";
import { VERIFIED_VIETNAM_PLACES, type PlaceSearchResult } from "../../src/data/placesData.js";
import { cityMatches, normName, normalizeScheduleItem, sanitizeBadge } from "./itinerary.js";

export const SUGGESTION_COUNT = 4;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cache = new TTLCache<{ source: "gemini" | "verified"; data: any[] }>(300, CACHE_TTL_MS);

/** Chỉ dùng trong test. */
export function __clearSuggestCacheForTests() {
  cache.clear();
}

/** Hai tên địa điểm có phải cùng một nơi không (bỏ dấu, chứa nhau). */
export function samePlace(a: string, b: string): boolean {
  const x = normName(a);
  const y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 6 && ` ${long} `.includes(` ${short} `);
}

function isExcluded(name: string, exclude: string[]): boolean {
  return exclude.some((e) => samePlace(name, e));
}

const SLOT_BY_CATEGORY: Record<string, { time_slot: string; time_period: string }> = {
  attraction: { time_slot: "08:30 - 10:30", time_period: "morning" },
  nature: { time_slot: "08:30 - 10:30", time_period: "morning" },
  food_specialty: { time_slot: "11:30 - 12:30", time_period: "afternoon" },
  cafe: { time_slot: "15:00 - 16:30", time_period: "afternoon" },
  shopping: { time_slot: "18:00 - 19:30", time_period: "evening" },
  nightlife: { time_slot: "20:00 - 22:00", time_period: "night" },
  accommodation: { time_slot: "14:00 - 15:00", time_period: "afternoon" },
};

/** Đổi địa điểm đã xác minh sang ScheduleItem (không mang theo số liệu view/rating). */
export function verifiedToScheduleItem(p: PlaceSearchResult): any {
  const slot = SLOT_BY_CATEGORY[p.category] || { time_slot: "09:00 - 10:30", time_period: "morning" };
  return {
    id: `sg_${p.id}`,
    ...slot,
    place_name: p.name,
    category: p.category,
    category_icon: p.category_icon,
    address_hint: p.address,
    recommended_dish_or_activity: p.recommended_dish_or_activity,
    cost_vnd: p.cost_vnd,
    social_trend: {
      is_viral: !!p.social_trend?.is_viral,
      platform: p.social_trend?.platform || "none",
      badge_label: sanitizeBadge(p.social_trend?.badge_label) || p.category_label,
    },
    ui_card: { badge_color: "#E2A854", quick_description: p.quick_description },
    image_url: p.photo_url,
    lat: p.lat,
    lng: p.lng,
    geo_source: "verified",
  };
}

/** Địa điểm đã xác minh cùng thành phố, chưa có trong ngày; xoay vòng theo dayIndex để mỗi ngày khác nhau. */
export function verifiedCandidates(destination: string, dayIndex: number, exclude: string[]): PlaceSearchResult[] {
  const pool = VERIFIED_VIETNAM_PLACES.filter(
    (p) => typeof p.lat === "number" && cityMatches(p.city, destination) && !isExcluded(p.name, exclude)
  );
  if (pool.length <= SUGGESTION_COUNT) return pool;
  const offset = (dayIndex * SUGGESTION_COUNT) % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

export const suggestRouter = Router();

/**
 * POST /api/suggest
 * Body: { destination, dayIndex, existingPlaces[] }
 * Response: { success: true, source: "verified" | "gemini" | "cache", data: ScheduleItem[] (≤ 4), message? }
 * - Đủ 4 địa điểm đã xác minh cùng thành phố → trả luôn, không gọi Gemini.
 * - Thiếu → gọi Gemini bổ sung (cache 24h theo destination + existingPlaces đã sort).
 * - Không có key / Gemini lỗi → chỉ trả verified (có thể < 4, kể cả 0), kèm message.
 */
suggestRouter.post("/api/suggest", limits.suggest, async (req, res) => {
  const body = parseBody(suggestBody, req.body, res);
  if (!body) return;

  const { destination, dayIndex } = body;
  const existing = body.existingPlaces.filter(Boolean);
  const verified = verifiedCandidates(destination, dayIndex, existing)
    .slice(0, SUGGESTION_COUNT)
    .map(verifiedToScheduleItem);

  if (verified.length >= SUGGESTION_COUNT) {
    return res.json({ success: true, source: "verified", data: verified });
  }

  const key = normalizeKey("suggest", destination, ...[...existing].map((p) => normName(p)).sort());
  const cached = cache.get(key);
  if (cached) return res.json({ success: true, source: "cache", data: cached.data });

  if (!isGeminiConfigured()) {
    return res.json({
      success: true,
      source: "verified",
      data: verified,
      message: verified.length
        ? "Chưa kết nối AI nên chỉ có gợi ý từ dữ liệu đã xác minh."
        : "Chưa kết nối AI và chưa có dữ liệu đã xác minh cho điểm đến này.",
    });
  }

  const need = SUGGESTION_COUNT - verified.length;
  const exclude = [...existing, ...verified.map((v) => v.place_name)];
  try {
    const parsed = await generateJson<{ suggestions?: any[] }>({
      contents: buildSuggestPrompt({ destination, dayIndex, count: need + 2, exclude }),
      systemInstruction: SUGGEST_SYSTEM_INSTRUCTION,
      responseSchema: suggestResponseSchema,
    });
    const extra: any[] = [];
    for (const raw of Array.isArray(parsed?.suggestions) ? parsed.suggestions : []) {
      if (extra.length >= need) break;
      const name = String(raw?.place_name ?? "").trim();
      if (!name || isExcluded(name, exclude) || extra.some((x) => samePlace(x.place_name, name))) continue;
      const item = normalizeScheduleItem(raw, destination, `sg_ai_${extra.length + 1}`);
      item.id = `sg_ai_${normName(name).replace(/\s+/g, "_").slice(0, 40)}`;
      extra.push(item);
    }
    const data = [...verified, ...extra];
    cache.set(key, { source: "gemini", data });
    return res.json({ success: true, source: extra.length ? "gemini" : "verified", data });
  } catch (err) {
    const e = err as GeminiError;
    console.error("[suggest]", e.code, e.message);
    return res.json({
      success: true,
      source: "verified",
      data: verified,
      errorCode: e.code,
      message:
        e.code === "RATE_LIMITED"
          ? "AI đã hết lượt miễn phí tạm thời, chỉ hiện gợi ý đã xác minh."
          : "AI đang không phản hồi, chỉ hiện gợi ý đã xác minh.",
    });
  }
});
