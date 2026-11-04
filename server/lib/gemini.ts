import { GoogleGenAI, ApiError } from "@google/genai";

/** Model ID đọc từ env để đổi model không cần sửa code. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
export const GEMINI_TIMEOUT_MS = 30_000;

export type GeminiErrorCode = "NO_KEY" | "RATE_LIMITED" | "TIMEOUT" | "BAD_RESPONSE" | "UPSTREAM";

export class GeminiError extends Error {
  constructor(public code: GeminiErrorCode, message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

let cachedClient: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/** Cho phép test thay client giả. */
export function __setGeminiClientForTests(client: GoogleGenAI | null) {
  cachedClient = client;
}

export interface GenerateJsonOptions {
  contents: unknown;
  systemInstruction?: string;
  responseSchema?: unknown;
  timeoutMs?: number;
}

/** Strip ```json fences nếu model lỡ trả markdown. */
export function parseModelJson<T>(raw: string | undefined): T {
  let text = (raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("BAD_RESPONSE", "Gemini trả về JSON không hợp lệ");
  }
}

/**
 * Gọi Gemini và parse JSON. Luôn ném GeminiError (có code) để route
 * quyết định fallback; không bao giờ tự trả dữ liệu mẫu ở đây.
 */
export async function generateJson<T>(opts: GenerateJsonOptions): Promise<T> {
  const ai = getGemini();
  if (!ai) throw new GeminiError("NO_KEY", "GEMINI_API_KEY chưa được cấu hình");

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: opts.contents as any,
      config: {
        abortSignal: controller.signal,
        ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
        responseMimeType: "application/json",
        ...(opts.responseSchema ? { responseSchema: opts.responseSchema as any } : {}),
      },
    });
    return parseModelJson<T>(response.text);
  } catch (err: any) {
    if (err instanceof GeminiError) throw err;
    if (controller.signal.aborted) {
      throw new GeminiError("TIMEOUT", `Gemini không phản hồi sau ${timeoutMs / 1000}s`);
    }
    if ((err instanceof ApiError && err.status === 429) || err?.status === 429 || err?.code === 429) {
      throw new GeminiError("RATE_LIMITED", "Đã hết quota Gemini miễn phí, thử lại sau");
    }
    throw new GeminiError("UPSTREAM", err?.message || "Lỗi khi gọi Gemini");
  } finally {
    clearTimeout(timer);
  }
}
