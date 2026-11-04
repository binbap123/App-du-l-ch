/**
 * Hàm thuần cho giao diện (không đụng DOM) — ngày thật từ start_date, ô nhập chi phí, lọc điểm đến.
 */
import { normalizeName } from "../components/map/mapUtils";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

/** Ngày của chuyến đi (UTC, tránh lệch múi giờ) cho dayIdx 0-based. null nếu start_date thiếu/sai. */
export function dateForDay(startDate: string | undefined | null, dayIdx: number): Date | null {
  const m = ISO_DATE.exec((startDate || "").trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const base = new Date(Date.UTC(y, mo - 1, d));
  // Loại ngày không tồn tại (vd 2026-02-31 bị Date tự đẩy sang tháng 3).
  if (base.getUTCFullYear() !== y || base.getUTCMonth() !== mo - 1 || base.getUTCDate() !== d) return null;
  return new Date(base.getTime() + Math.max(0, Math.trunc(dayIdx)) * 86_400_000);
}

export function isValidIsoDate(s: string | undefined | null): boolean {
  return dateForDay(s, 0) !== null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "T7 08/11" */
export function formatShortDate(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}`;
}

/** "Ngày 1 · T7 08/11", hoặc "Ngày 1" khi chưa có ngày bắt đầu. */
export function dayLabel(startDate: string | undefined | null, dayIdx: number, dayNumber?: number): string {
  const n = dayNumber || dayIdx + 1;
  const date = dateForDay(startDate, dayIdx);
  return date ? `Ngày ${n} · ${formatShortDate(date)}` : `Ngày ${n}`;
}

/** "08/11 – 10/11/2026" cho chuyến nhiều ngày, "08/11/2026" cho 1 ngày. Rỗng nếu thiếu start_date. */
export function tripDateRange(startDate: string | undefined | null, dayCount: number): string {
  const first = dateForDay(startDate, 0);
  if (!first) return "";
  const last = dateForDay(startDate, Math.max(0, dayCount - 1))!;
  const full = (d: Date) => `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  if (dayCount <= 1) return full(first);
  const sameYear = first.getUTCFullYear() === last.getUTCFullYear();
  const head = sameYear ? `${pad2(first.getUTCDate())}/${pad2(first.getUTCMonth() + 1)}` : full(first);
  return `${head} – ${full(last)}`;
}

/** Chuỗi người dùng gõ → số đồng (chỉ giữ chữ số). Rỗng → 0. */
export function parseCostInput(raw: string): number {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 12);
  return digits ? Number(digits) : 0;
}

/** 65000 → "65.000" (dấu chấm hàng nghìn, không phụ thuộc ICU). */
export function formatThousands(n: number): string {
  const v = Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Tổng chi phí các điểm trong lịch trình. */
export function sumScheduleCost(days: { schedule?: { cost_vnd?: number }[] }[]): number {
  return days.reduce((acc, d) => acc + (d.schedule || []).reduce((s, it) => s + (Number(it.cost_vnd) || 0), 0), 0);
}

/** Lọc thẻ điểm đến theo từ khóa (bỏ dấu, không phân biệt hoa thường). */
export function filterByQuery<T>(items: T[], query: string, fields: (item: T) => (string | undefined)[]): T[] {
  const q = normalizeName(query);
  if (!q) return items;
  return items.filter((it) => fields(it).some((f) => normalizeName(f || "").includes(q)));
}

/** Tên file xuất dữ liệu: wanderai-chuyen-di-2026-11-04.json */
export function exportFileName(now: Date = new Date()): string {
  return `wanderai-chuyen-di-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.json`;
}
