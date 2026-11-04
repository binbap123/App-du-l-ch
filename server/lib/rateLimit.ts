import rateLimit from "express-rate-limit";

function limiter(perMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút." },
    },
  });
}

/** Giới hạn theo PLAN.md mục 2.3 */
export const limits = {
  generate: limiter(5),
  chat: limiter(10),
  suggest: limiter(10),
  placesSearch: limiter(20),
  geocode: limiter(30),
  read: limiter(60),
};
