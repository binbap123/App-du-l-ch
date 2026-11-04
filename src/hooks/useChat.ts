import { useCallback, useSyncExternalStore } from "react";
import type { ChatMessage, DataSource, WanderItineraryData } from "../types";
import { fetchJson, ApiError } from "../lib/api";

/**
 * Chat của trợ lý AI, lưu ở localStorage để chuyển tab / reload không mất.
 * State nằm trong một store cấp module (không phải trong component) nên câu trả lời
 * về sau khi người dùng đã chuyển tab vẫn được ghi lại.
 */

export const CHAT_STORAGE_KEY = "wanderai.chat.v1";
export const MAX_STORED_MESSAGES = 50;
/** Số tin gần nhất gửi lên server làm ngữ cảnh. */
export const HISTORY_TURNS = 10;
/** Server giới hạn mỗi lượt 4000 ký tự. */
const MAX_TURN_CHARS = 3800;
export const WELCOME_ID = "welcome";

export interface StoredChatMessage extends ChatMessage {
  /** Nguồn câu trả lời AI, để UI gắn nhãn "Lịch trình mẫu" khi `sample`. */
  source?: DataSource;
  /** Tin báo lỗi — không gửi làm history. */
  isError?: boolean;
}

interface ChatResponse {
  reply?: string;
  itinerary?: WanderItineraryData | null;
  source?: DataSource;
  errorCode?: string;
}

const nowLabel = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const newId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export function createWelcomeMessage(): StoredChatMessage {
  return {
    id: WELCOME_ID,
    sender: "ai",
    text: "Bạn có thể hỏi tôi bất cứ điều gì, từ việc tìm vé máy bay rẻ, đặt phòng khách sạn, cho đến việc lên một lịch trình chi tiết từng giờ.",
    timestamp: nowLabel(),
  };
}

/** History gửi server: bỏ lời chào và tin lỗi, giữ HISTORY_TURNS tin cuối, cắt tin quá dài. */
export function buildHistory(messages: StoredChatMessage[]): { sender: "user" | "ai"; text: string }[] {
  return messages
    .filter((m) => m.id !== WELCOME_ID && !m.isError && m.text?.trim())
    .slice(-HISTORY_TURNS)
    .map((m) => ({ sender: m.sender, text: m.text.length > MAX_TURN_CHARS ? m.text.slice(0, MAX_TURN_CHARS) + "…" : m.text }));
}

/** Lịch trình gần nhất trong cuộc trò chuyện (để AI sửa tiếp). */
export function findCurrentItinerary(messages: StoredChatMessage[]): WanderItineraryData | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === "ai" && messages[i].itineraryData) return messages[i].itineraryData;
  }
  return undefined;
}

function isValidMessage(m: any): m is StoredChatMessage {
  return !!m && typeof m.id === "string" && (m.sender === "user" || m.sender === "ai") && typeof m.text === "string";
}

function loadMessages(): StoredChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [createWelcomeMessage()];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.messages) ? parsed.messages.filter(isValidMessage) : [];
    return list.length ? list : [createWelcomeMessage()];
  } catch {
    return [createWelcomeMessage()];
  }
}

function persistMessages(messages: StoredChatMessage[]) {
  try {
    localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({ version: 1, messages: messages.slice(-MAX_STORED_MESSAGES) })
    );
  } catch {
    // localStorage đầy / bị chặn: chat vẫn chạy trong phiên hiện tại.
  }
}

/* ---------------------------- store ---------------------------- */

interface ChatState {
  messages: StoredChatMessage[];
  isLoading: boolean;
}

let state: ChatState = { messages: loadMessages(), isLoading: false };
/** Tăng mỗi lần clearChat để bỏ câu trả lời của cuộc trò chuyện cũ. */
let generation = 0;
const listeners = new Set<() => void>();

function setState(patch: Partial<ChatState>) {
  state = { ...state, ...patch };
  if (patch.messages) {
    if (state.messages.length > MAX_STORED_MESSAGES) state = { ...state, messages: state.messages.slice(-MAX_STORED_MESSAGES) };
    persistMessages(state.messages);
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

/** Gửi tin nhắn. Trả về false nếu đang bận hoặc tin rỗng. */
export async function sendChatMessage(text: string): Promise<boolean> {
  const query = text.trim();
  if (!query || state.isLoading) return false;

  const gen = generation;
  const history = buildHistory(state.messages);
  const currentItinerary = findCurrentItinerary(state.messages);
  const userMsg: StoredChatMessage = { id: newId(), sender: "user", text: query, timestamp: nowLabel() };
  setState({ messages: [...state.messages, userMsg], isLoading: true });

  let aiMsg: StoredChatMessage;
  try {
    const result = await fetchJson<ChatResponse>("/api/chat", {
      method: "POST",
      body: { message: query, history, ...(currentItinerary ? { currentItinerary } : {}) },
    });
    aiMsg = {
      id: newId(),
      sender: "ai",
      text: result.reply || "Xin lỗi, tôi gặp sự cố nhỏ. Hãy thử lại nhé!",
      timestamp: nowLabel(),
      itineraryData: result.itinerary || undefined,
      source: result.source,
      isError: result.source === "error",
    };
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.message
        : "Xin lỗi, hiện tại tôi không thể kết nối server. Hãy kiểm tra kết nối mạng và thử lại nhé!";
    aiMsg = { id: newId(), sender: "ai", text: message, timestamp: nowLabel(), source: "error", isError: true };
  }

  if (gen !== generation) return true; // người dùng đã bấm "Cuộc trò chuyện mới"
  setState({ messages: [...state.messages, aiMsg], isLoading: false });
  return true;
}

export function clearChat() {
  generation++;
  setState({ messages: [createWelcomeMessage()], isLoading: false });
}

/** Chỉ dùng trong test: nạp lại từ localStorage. */
export function __reloadChatForTests() {
  generation++;
  state = { messages: loadMessages(), isLoading: false };
  listeners.forEach((l) => l());
}

export function getChatState(): ChatState {
  return state;
}

export function useChat() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const sendMessage = useCallback((text: string) => sendChatMessage(text), []);
  const clear = useCallback(() => clearChat(), []);
  return {
    messages: snap.messages,
    isLoading: snap.isLoading,
    sendMessage,
    clearChat: clear,
    currentItinerary: findCurrentItinerary(snap.messages),
  };
}
