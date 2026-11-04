/** Lỗi API chuẩn hoá cho UI. `code` khớp với server (RATE_LIMITED, INVALID_INPUT, TIMEOUT, NETWORK...). */
export class ApiError extends Error {
  constructor(public code: string, message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchJsonOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
}

/**
 * fetch + JSON + timeout. Ném ApiError khi mạng lỗi, timeout, HTTP lỗi hoặc body `{ success: false }`.
 * Dùng cho MỌI lời gọi /api ở frontend.
 */
export async function fetchJson<T = any>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { body, timeoutMs = 35_000, headers, signal, ...rest } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: body !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    if (controller.signal.aborted && !signal?.aborted) {
      throw new ApiError("TIMEOUT", "Máy chủ phản hồi quá lâu, vui lòng thử lại.");
    }
    if (signal?.aborted) throw new ApiError("ABORTED", "Đã huỷ yêu cầu");
    throw new ApiError("NETWORK", "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.");
  }
  clearTimeout(timer);

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("BAD_RESPONSE", "Máy chủ trả về dữ liệu không hợp lệ", res.status);
  }

  if (!res.ok || data?.success === false) {
    const err = data?.error;
    throw new ApiError(err?.code || `HTTP_${res.status}`, err?.message || "Đã có lỗi xảy ra", res.status);
  }
  return data as T;
}
