import { Router } from "express";
import { generateJson, GeminiError } from "../lib/gemini.js";
import { TTLCache, normalizeKey } from "../lib/cache.js";
import { limits } from "../lib/rateLimit.js";
import { parseBody } from "../lib/http.js";
import { generateItineraryBody } from "../lib/validate.js";
import { itineraryResponseSchema, looksLikeItinerary } from "../schemas/itinerary.js";
import { WANDER_SYSTEM_INSTRUCTION } from "../prompts/wander.js";
import { getSampleItinerary, parseDurationDays } from "../../src/data/sampleItineraries.js";

// TODO(agent-ai): thêm lat/lng + geo_source cho từng điểm, hậu kiểm số ngày.

const cache = new TTLCache<any>(300);

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
Ngân sách dự kiến: ${budget}.`;

  try {
    const data = await generateJson<any>({
      contents: prompt,
      systemInstruction: WANDER_SYSTEM_INSTRUCTION,
      responseSchema: itineraryResponseSchema,
    });
    if (!looksLikeItinerary(data)) throw new GeminiError("BAD_RESPONSE", "Lịch trình AI trả về thiếu dữ liệu");
    cache.set(key, data);
    return res.json({ success: true, source: "gemini", data });
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
          : "AI tạm thời không phản hồi. Đây là lịch trình mẫu, bạn có thể thử lại sau.",
      data: getSampleItinerary(destination, duration),
    });
  }
});
