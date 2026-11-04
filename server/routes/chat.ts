import { Router } from "express";
import { generateJson, GeminiError } from "../lib/gemini.js";
import { limits } from "../lib/rateLimit.js";
import { parseBody } from "../lib/http.js";
import { chatBody } from "../lib/validate.js";
import { chatResponseSchema, looksLikeItinerary } from "../schemas/itinerary.js";
import { WANDER_CHAT_SYSTEM_INSTRUCTION } from "../prompts/wander.js";
import { getSampleItinerary, extractDestinationFromText } from "../../src/data/sampleItineraries.js";

// TODO(agent-ai): dùng currentItinerary để sửa lịch trình, phân loại ý định tốt hơn, lưu chat phía client.

export const MAX_HISTORY_TURNS = 10;

/** Đổi history UI sang `contents` của Gemini: bỏ lời chào AI ở đầu, giữ N lượt cuối. */
export function toGeminiContents(history: { sender?: "user" | "ai"; text?: string }[], message: string) {
  const trimmed = history.filter((m) => m.sender && m.text).slice(-MAX_HISTORY_TURNS);
  while (trimmed.length && trimmed[0].sender !== "user") trimmed.shift();
  return [
    ...trimmed.map((m) => ({ role: m.sender === "user" ? "user" : "model", parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];
}

const ITINERARY_HINTS = ["lịch trình", "kế hoạch", "lên lịch", "thiết kế", "tour", "n2đ", "n1đ", "n3đ", "n4đ", "ngày"];
export function looksLikeItineraryRequest(message: string): boolean {
  const m = message.toLowerCase();
  return ITINERARY_HINTS.some((h) => m.includes(h));
}

export const chatRouter = Router();

chatRouter.post("/api/chat", limits.chat, async (req, res) => {
  const body = parseBody(chatBody, req.body, res);
  if (!body) return;

  const history = body.history.length ? body.history : body.conversationHistory || [];
  const message = body.message;

  try {
    const parsed = await generateJson<{ reply?: string; itinerary?: any }>({
      contents: toGeminiContents(history, message),
      systemInstruction: WANDER_CHAT_SYSTEM_INSTRUCTION,
      responseSchema: chatResponseSchema,
    });
    const itinerary = looksLikeItinerary(parsed.itinerary) ? parsed.itinerary : null;
    return res.json({
      reply: parsed.reply || "Mình chưa hiểu rõ ý bạn, bạn nói thêm chút được không?",
      itinerary,
      source: "gemini",
    });
  } catch (err) {
    const e = err as GeminiError;
    console.error("[chat]", e.code, e.message);

    // Chỉ trả lịch trình mẫu khi người dùng thực sự hỏi về lịch trình — và nói rõ đó là mẫu.
    if (looksLikeItineraryRequest(message)) {
      const { city, duration } = extractDestinationFromText(message);
      const sample = getSampleItinerary(city, duration);
      const why =
        e.code === "NO_KEY"
          ? "Hiện chưa kết nối AI"
          : e.code === "RATE_LIMITED"
            ? "AI đã hết lượt miễn phí tạm thời"
            : "AI đang không phản hồi";
      return res.json({
        reply: `${why}, nên mình gửi bạn **lịch trình mẫu** ${sample.itinerary.length} ngày cho **${sample.meta.destination}**. Bạn có thể mở nó trong Trình thiết kế và chỉnh lại theo ý mình.`,
        itinerary: sample,
        source: "sample",
        errorCode: e.code,
      });
    }

    return res.json({
      reply:
        e.code === "RATE_LIMITED"
          ? "AI đã hết lượt miễn phí tạm thời. Bạn thử lại sau ít phút nhé!"
          : e.code === "NO_KEY"
            ? "Trợ lý AI chưa được cấu hình. Bạn vẫn có thể hỏi \"Lịch trình Đà Lạt 3N2Đ\" để xem lịch trình mẫu."
            : "Xin lỗi, AI đang gặp sự cố. Bạn thử lại sau nhé!",
      itinerary: null,
      source: "error",
      errorCode: e.code,
    });
  }
});
