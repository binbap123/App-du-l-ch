import type { Response } from "express";
import { ZodError, type ZodSchema } from "zod";

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

export function sendError(res: Response, status: number, code: string, message: string) {
  const body: ApiErrorBody = { success: false, error: { code, message } };
  return res.status(status).json(body);
}

/** Parse body bằng zod; trả về null (và đã gửi 400) nếu sai. */
export function parseBody<T>(schema: ZodSchema<T>, body: unknown, res: Response): T | null {
  try {
    return schema.parse(body);
  } catch (err) {
    const msg =
      err instanceof ZodError
        ? err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ")
        : "Dữ liệu không hợp lệ";
    sendError(res, 400, "INVALID_INPUT", msg);
    return null;
  }
}
