import { Router } from "express";
import { limits } from "../lib/rateLimit.js";
import { parseBody, sendError } from "../lib/http.js";
import { suggestBody } from "../lib/validate.js";

export const suggestRouter = Router();

/**
 * TODO(agent-ai): POST /api/suggest
 * Body: { destination, dayIndex, existingPlaces[] }
 * Response: { success: true, source: "gemini" | "cache" | "verified", data: ScheduleItem[] (4 phần tử) }
 * Thay thế MOCK_TRAY_SUGGESTIONS trong builder. Ưu tiên địa điểm có trong placesData nếu phù hợp.
 */
suggestRouter.post("/api/suggest", limits.suggest, (req, res) => {
  const body = parseBody(suggestBody, req.body, res);
  if (!body) return;
  return sendError(res, 501, "NOT_IMPLEMENTED", "Tính năng gợi ý đang được phát triển");
});
