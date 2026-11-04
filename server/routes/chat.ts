import { Router } from "express";
import { generateJson, GeminiError } from "../lib/gemini.js";
import { limits } from "../lib/rateLimit.js";
import { parseBody } from "../lib/http.js";
import { chatBody } from "../lib/validate.js";
import { chatResponseSchema, looksLikeItinerary } from "../schemas/itinerary.js";
import { buildChatSystemInstruction, type ChatIntentKind } from "../prompts/chat.js";
import { getSampleItinerary, extractDestinationFromText } from "../../src/data/sampleItineraries.js";
import { postProcessItinerary, cityMatches, normName } from "./itinerary.js";

export const MAX_HISTORY_TURNS = 10;

type Turn = { sender?: "user" | "ai"; text?: string };

/**
 * Đổi history UI sang `contents` của Gemini: bỏ lượt AI ở đầu (lời chào), giữ N lượt cuối,
 * gộp các lượt liên tiếp cùng vai trò để luôn xen kẽ user/model.
 */
export function toGeminiContents(history: Turn[], message: string) {
  const trimmed = history.filter((m) => m.sender && m.text).slice(-MAX_HISTORY_TURNS);
  while (trimmed.length && trimmed[0].sender !== "user") trimmed.shift();

  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of [...trimmed, { sender: "user" as const, text: message }]) {
    const role = m.sender === "user" ? "user" : "model";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n\n${m.text}`;
    else contents.push({ role, parts: [{ text: m.text! }] });
  }
  return contents;
}

/* ------------------------------------------------------------------ */
/* Phân loại ý định (chạy local, không tốn call Gemini)                 */
/* ------------------------------------------------------------------ */

/** Điểm đến nhận diện được trên chuỗi đã bỏ dấu (thứ tự: cụ thể → chung). */
const KNOWN_DESTINATIONS: Array<[RegExp, string]> = [
  [/\b(vinh )?ha long\b|\bquang ninh\b|\bbai chay\b|\btuan chau\b/, "Vịnh Hạ Long"],
  [/\bphu quoc\b/, "Phú Quốc"],
  [/\bda lat\b|\bdalat\b/, "Đà Lạt"],
  [/(?<!nguyen )\bhue\b|\bco do\b/, "Cố đô Huế"],
  [/\bninh binh\b|\btrang an\b|\btam coc\b/, "Ninh Bình"],
  [/\bquy nhon\b|\bbinh dinh\b/, "Quy Nhơn"],
  [/\bphu yen\b|\btuy hoa\b/, "Phú Yên"],
  [/\bha giang\b|\bdong van\b/, "Hà Giang"],
  [/\bsa ?pa\b|\blao cai\b|\bfansipan\b/, "Sa Pa"],
  [/\bnha trang\b|\bkhanh hoa\b/, "Nha Trang"],
  [/\bda nang\b|\bdanang\b/, "Đà Nẵng"],
  [/\bhoi an\b/, "Hội An"],
  [/\bha noi\b|\bhanoi\b|\bho guom\b/, "Hà Nội"],
  [/\bho chi minh\b|\bsai gon\b|\bsaigon\b|\btp ?hcm\b|\bhcm\b/, "TP. Hồ Chí Minh"],
  [/\bcan tho\b|\bmien tay\b|\bcai rang\b/, "Cần Thơ"],
  [/\bvung tau\b/, "Vũng Tàu"],
  [/\bphan thiet\b|\bmui ne\b|\bbinh thuan\b/, "Phan Thiết - Mũi Né"],
  [/\bcat ba\b|\bhai phong\b/, "Cát Bà - Hải Phòng"],
  [/\bcon dao\b/, "Côn Đảo"],
  [/\bmoc chau\b/, "Mộc Châu"],
  [/\bmai chau\b/, "Mai Châu"],
  [/\bpu luong\b/, "Pù Luông"],
  [/\bly son\b/, "Lý Sơn"],
  [/\btam dao\b/, "Tam Đảo"],
  [/\bbuon ma thuot\b|\bbuon me thuot\b/, "Buôn Ma Thuột"],
  [/\bcao bang\b|\bban gioc\b/, "Cao Bằng"],
  [/\bmu cang chai\b/, "Mù Cang Chải"],
  [/\bchau doc\b|\ban giang\b/, "Châu Đốc - An Giang"],
  [/\bben tre\b/, "Bến Tre"],
  [/\bquang binh\b|\bphong nha\b|\bdong hoi\b/, "Quảng Bình"],
];

/** Từ không thể là tên điểm đến (dùng để lọc kết quả regex của extractDestinationFromText). */
const NON_PLACE_WORDS = new Set(
  "choi an uong dau gi nao sao khong minh toi ban cho voi nhe di ngay dem the nay kia o mot hai ba bon nam may bien nui gan xa re dep ngon nhat va hay la co".split(
    " "
  )
);
const QUESTION_WORDS = /\b(dau|gi|nao|sao|khong|bao nhieu|may)\b/;

const DURATION_RE =
  /\b(\d{1,2})\s*n(?:gay)?\s*(?:\d{1,2}\s*d(?:em)?)?\b|\b(\d{1,2})\s*days?\b|\bcuoi tuan\b|\btrong ngay\b/;
const STRONG_PLANNING_RE =
  /\b(lich trinh|ke hoach|len lich|len plan|plan|itinerary|tour|hanh trinh|goi y lich|thiet ke chuyen di|sap xep chuyen di)\b/;
/** Động từ sửa (có dấu) — chạy trên chuỗi lowercase gốc. */
const EDIT_VERB_RE = /(đổi|thay|sửa|thêm|bớt|bỏ|xoá|xóa|chuyển|dời|giảm|tăng|rút gọn|kéo dài|cập nhật|điều chỉnh)/;
/** Động từ sửa khi người dùng gõ không dấu — chỉ dùng nếu câu không có dấu (tránh "sữa", "thấy"...). */
const EDIT_VERB_PLAIN_RE = /\b(doi|thay doi|thay the|thay|sua|them|bot|bo|xoa|chuyen|giam|tang|rut gon|keo dai|cap nhat|dieu chinh)\b/;
const HAS_DIACRITICS_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const DAY_REF_RE = /\b(ngay (thu )?\d{1,2}|ngay (dau|cuoi|cuoi cung)|buoi (sang|trua|chieu|toi|dem))\b/;

export interface ChatIntent {
  kind: ChatIntentKind;
  /** Điểm đến nhận diện được (null nếu không chắc chắn). */
  destination: string | null;
  /** Số ngày người dùng nêu rõ (null nếu không nêu). */
  requestedDays: number | null;
}

/** Nhận diện điểm đến: danh sách đã biết trước, sau đó regex của extractDestinationFromText (có lọc). */
export function detectDestination(message: string): string | null {
  const n = normName(message);
  for (const [re, name] of KNOWN_DESTINATIONS) if (re.test(n)) return name;

  const { city } = extractDestinationFromText(message);
  // extractDestinationFromText mặc định trả "Vịnh Hạ Long" khi không thấy gì — Hạ Long đã được kiểm ở trên.
  if (!city || city === "Vịnh Hạ Long") return null;
  const cn = normName(city);
  const words = cn.split(" ").filter(Boolean);
  if (!words.length || QUESTION_WORDS.test(cn) || words.every((w) => NON_PLACE_WORDS.has(w))) return null;
  // Tên riêng thường viết hoa trong câu gốc; nếu không, chỉ chấp nhận khi câu có ý lập kế hoạch rõ ràng.
  const idx = message.toLowerCase().indexOf(city.toLowerCase());
  const original = idx >= 0 ? message.slice(idx, idx + city.length) : city;
  const capitalized = /^\p{Lu}/u.test(original);
  if (capitalized || STRONG_PLANNING_RE.test(n)) return city.trim();
  return null;
}

/** Số ngày nêu rõ trong câu ("3N2Đ", "3 ngày", "cuối tuần" = 2, "trong ngày" = 1). */
export function detectRequestedDays(message: string): number | null {
  const n = normName(message);
  const m = n.match(DURATION_RE);
  if (!m) return null;
  if (m[0] === "cuoi tuan") return 2;
  if (m[0] === "trong ngay") return 1;
  const d = parseInt(m[1] || m[2], 10);
  return Number.isFinite(d) && d > 0 ? Math.min(d, 10) : null;
}

/**
 * Phân loại ý định tin nhắn chat.
 * - edit_itinerary: có lịch trình hiện tại và câu có động từ sửa / nhắc tới ngày-buổi, không đổi sang điểm đến khác.
 * - new_itinerary: nhận ra điểm đến VÀ (có thời lượng HOẶC từ khoá lập kế hoạch).
 * - general: còn lại.
 */
export function classifyChatIntent(message: string, opts: { currentItinerary?: any } = {}): ChatIntent {
  const n = normName(message);
  const lower = message.toLowerCase();
  const destination = detectDestination(message);
  const requestedDays = detectRequestedDays(message);
  const hasPlanning = STRONG_PLANNING_RE.test(n);

  if (opts.currentItinerary) {
    const currentDest = opts.currentItinerary?.meta?.destination;
    const switchesDestination =
      !!destination && !!currentDest && !cityMatches(destination, currentDest) && (requestedDays !== null || hasPlanning);
    const wantsEdit =
      (HAS_DIACRITICS_RE.test(message) ? EDIT_VERB_RE.test(lower) : EDIT_VERB_PLAIN_RE.test(n)) || DAY_REF_RE.test(n);
    if (!switchesDestination && wantsEdit) {
      return { kind: "edit_itinerary", destination: destination || currentDest || null, requestedDays };
    }
  }

  if (destination && (requestedDays !== null || hasPlanning)) {
    return { kind: "new_itinerary", destination, requestedDays };
  }
  return { kind: "general", destination, requestedDays };
}

/** Giữ API cũ (tests/server.test.ts dùng). */
export function looksLikeItineraryRequest(message: string): boolean {
  return classifyChatIntent(message).kind === "new_itinerary";
}

function durationLabel(days: number | null): string {
  if (!days) return "3N2Đ";
  return days === 1 ? "1N" : `${days}N${days - 1}Đ`;
}

/* ------------------------------------------------------------------ */
/* Route                                                              */
/* ------------------------------------------------------------------ */

export const chatRouter = Router();

chatRouter.post("/api/chat", limits.chat, async (req, res) => {
  const body = parseBody(chatBody, req.body, res);
  if (!body) return;

  const history = body.history.length ? body.history : body.conversationHistory || [];
  const message = body.message;
  const current = looksLikeItinerary(body.currentItinerary) ? (body.currentItinerary as any) : null;
  const intent = classifyChatIntent(message, { currentItinerary: current });

  try {
    const parsed = await generateJson<{ reply?: string; itinerary?: any }>({
      contents: toGeminiContents(history, message),
      systemInstruction: buildChatSystemInstruction({
        currentItinerary: current,
        intent: intent.kind,
        requestedDays: intent.kind === "new_itinerary" ? intent.requestedDays : null,
      }),
      responseSchema: chatResponseSchema,
    });

    let reply = parsed.reply || "Mình chưa hiểu rõ ý bạn, bạn nói thêm chút được không?";
    let itinerary: any = null;
    if (looksLikeItinerary(parsed.itinerary)) {
      const { data, dayMismatch } = postProcessItinerary(parsed.itinerary, {
        // Khi sửa ("thêm 1 ngày") con số không phải tổng số ngày → không ép.
        expectedDays: intent.kind === "new_itinerary" ? intent.requestedDays : null,
        original: current,
        logTag: "chat",
      });
      itinerary = data;
      if (dayMismatch && dayMismatch.got < dayMismatch.expected) {
        reply += `\n\n⚠️ Lưu ý: AI mới tạo được ${dayMismatch.got}/${dayMismatch.expected} ngày. Bạn có thể nhắn "thêm ngày" hoặc tự bổ sung trong Trình thiết kế.`;
      }
    }
    return res.json({ success: true, reply, itinerary, source: "gemini", intent: intent.kind });
  } catch (err) {
    const e = err as GeminiError;
    console.error("[chat]", e.code, e.message);

    const why =
      e.code === "NO_KEY"
        ? "Hiện chưa kết nối AI"
        : e.code === "RATE_LIMITED"
          ? "AI đã hết lượt miễn phí tạm thời"
          : "AI đang không phản hồi";

    // Chỉ trả lịch trình mẫu khi thực sự là yêu cầu lịch trình mới VÀ nhận ra điểm đến — và nói rõ là mẫu.
    if (intent.kind === "new_itinerary" && intent.destination) {
      const sample = postProcessItinerary(getSampleItinerary(intent.destination, durationLabel(intent.requestedDays)), {
        logTag: "sample",
      }).data;
      return res.json({
        success: true,
        reply: `${why}, nên mình gửi bạn **lịch trình mẫu** ${sample.itinerary.length} ngày cho **${sample.meta.destination}** (không phải do AI tạo riêng cho bạn). Bạn có thể mở nó trong Trình thiết kế và chỉnh lại theo ý mình.`,
        itinerary: sample,
        source: "sample",
        intent: intent.kind,
        errorCode: e.code,
      });
    }

    if (intent.kind === "edit_itinerary") {
      return res.json({
        success: true,
        reply: `${why}, nên mình chưa sửa được lịch trình lúc này. Lịch trình hiện tại vẫn giữ nguyên — bạn có thể thử lại sau hoặc tự chỉnh trong Trình thiết kế.`,
        itinerary: null,
        source: "error",
        intent: intent.kind,
        errorCode: e.code,
      });
    }

    return res.json({
      success: true,
      reply:
        e.code === "RATE_LIMITED"
          ? "AI đã hết lượt miễn phí tạm thời. Bạn thử lại sau ít phút nhé!"
          : e.code === "NO_KEY"
            ? 'Trợ lý AI chưa được cấu hình. Bạn vẫn có thể hỏi "Lịch trình Đà Lạt 3N2Đ" để xem lịch trình mẫu.'
            : e.code === "TIMEOUT"
              ? "AI phản hồi quá lâu. Bạn thử lại sau nhé!"
              : "Xin lỗi, AI đang gặp sự cố. Bạn thử lại sau nhé!",
      itinerary: null,
      source: "error",
      intent: intent.kind,
      errorCode: e.code,
    });
  }
});
