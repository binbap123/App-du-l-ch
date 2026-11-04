import { z } from "zod";

/** Chuỗi người dùng nhập: trim, bỏ ký tự điều khiển, giới hạn độ dài. */
export const userText = (max = 500) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max, `Tối đa ${max} ký tự`));

export const optionalUserText = (max = 500) => userText(max).optional().default("");

export const generateItineraryBody = z.object({
  destination: optionalUserText(100),
  duration: optionalUserText(20),
  preferences: optionalUserText(500),
  budget: optionalUserText(50),
});

export const chatTurn = z.object({
  sender: z.enum(["user", "ai"]),
  text: userText(4000),
});

export const chatBody = z.object({
  message: userText(500).pipe(z.string().min(1, "Tin nhắn trống")),
  /** Chỉ giữ 10 lượt gần nhất */
  history: z.array(chatTurn).max(20).optional().default([]),
  /** Kiểu cũ — AIAssistantView hiện tại gửi field này; Agent AI sẽ chuyển sang `history`. */
  conversationHistory: z.array(chatTurn).max(50).optional(),
  /** Lịch trình đang xem, để AI sửa tiếp. Validate lỏng; route tự kiểm tra cấu trúc. */
  currentItinerary: z.unknown().optional(),
});

export const suggestBody = z.object({
  destination: userText(100).pipe(z.string().min(1)),
  dayIndex: z.number().int().min(0).max(14).default(0),
  existingPlaces: z.array(userText(200)).max(30).default([]),
});

export const placesSearchBody = z.object({
  query: optionalUserText(120),
  city: optionalUserText(60),
  category: optionalUserText(30),
});

export const geocodeQuery = z.object({
  q: userText(200).pipe(z.string().min(2)),
  city: optionalUserText(60),
});
