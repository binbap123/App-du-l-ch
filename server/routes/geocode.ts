import { Router } from "express";
import { limits } from "../lib/rateLimit.js";
import { parseBody, sendError } from "../lib/http.js";
import { geocodeQuery } from "../lib/validate.js";

export const geocodeRouter = Router();

/**
 * TODO(agent-data): GET /api/geocode?q=&city=
 * - Thứ tự: khớp tên trong VERIFIED_VIETNAM_PLACES (geo_source "verified") → Nominatim (geo_source "geocoded").
 * - Nominatim: https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&limit=1
 *   header User-Agent "WanderAI/1.0 (personal project)", tối đa 1 request/giây (hàng đợi), cache TTLCache vô hạn.
 * - Chỉ nhận kết quả trong bbox Việt Nam (lat 8.0–23.5, lng 102.0–110.0).
 * Response: { success: true, data: { lat, lng, geo_source, display_name } | null }
 */
geocodeRouter.get("/api/geocode", limits.geocode, (req, res) => {
  const q = parseBody(geocodeQuery, req.query, res);
  if (!q) return;
  return sendError(res, 501, "NOT_IMPLEMENTED", "Geocode đang được phát triển");
});
