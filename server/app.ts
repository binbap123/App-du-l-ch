import express from "express";
import { isGeminiConfigured, GEMINI_MODEL } from "./lib/gemini.js";
import { sendError } from "./lib/http.js";
import { itineraryRouter } from "./routes/itinerary.js";
import { chatRouter } from "./routes/chat.js";
import { suggestRouter } from "./routes/suggest.js";
import { placesRouter } from "./routes/places.js";
import { geocodeRouter } from "./routes/geocode.js";
import { trendingRouter } from "./routes/trending.js";
import { itinerariesRouter } from "./routes/itineraries.js";

/** Tạo Express app (không listen) — dùng chung cho server thật và test. */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Render/Cloud Run đứng sau proxy → cần để rate limit lấy đúng IP.
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", geminiAvailable: isGeminiConfigured(), model: GEMINI_MODEL });
  });

  app.use(itineraryRouter);
  app.use(chatRouter);
  app.use(suggestRouter);
  app.use(placesRouter);
  app.use(geocodeRouter);
  app.use(trendingRouter);
  app.use(itinerariesRouter); // @deprecated — Agent Data xóa

  app.use("/api", (_req, res) => sendError(res, 404, "NOT_FOUND", "API không tồn tại"));

  // JSON lỗi (body quá lớn, JSON hỏng...) thay vì trang HTML.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.path.startsWith("/api")) return next(err);
    const status = err?.status || err?.statusCode || 500;
    const code = err?.type === "entity.too.large" ? "PAYLOAD_TOO_LARGE" : status === 400 ? "INVALID_JSON" : "SERVER_ERROR";
    console.error("[api error]", code, err?.message);
    return sendError(res, status, code, status >= 500 ? "Lỗi máy chủ" : "Yêu cầu không hợp lệ");
  });

  return app;
}
