/**
 * Hàm thuần cho bản đồ (không import leaflet → test được trong môi trường node).
 */
import type { GeoSource, ScheduleItem, WanderItineraryData } from "../../types";
import { VERIFIED_VIETNAM_PLACES, type PlaceSearchResult } from "../../data/placesData";

/** 7 màu ngày dễ phân biệt, đủ tối để chữ trắng đọc được và nổi trên nền bản đồ OSM. */
export const DAY_COLORS = [
  "#E8590C", // cam
  "#1971C2", // xanh dương
  "#2F9E44", // xanh lá
  "#7048E8", // tím
  "#C2255C", // hồng đậm
  "#0C8599", // xanh ngọc
  "#8D5524", // nâu
] as const;

/** Màu theo chỉ số ngày (0-based), xoay vòng nếu > 7 ngày. */
export function dayColor(dayIdx: number): string {
  const n = DAY_COLORS.length;
  const i = Number.isFinite(dayIdx) ? Math.trunc(dayIdx) : 0;
  return DAY_COLORS[((i % n) + n) % n];
}

/** Bỏ dấu tiếng Việt, đ→d, viết thường, chỉ giữ chữ/số, gộp khoảng trắng. */
export function normalizeName(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalizeName(s).split(" ").filter(Boolean);
}

/**
 * Điểm tương đồng tên 0..1: 1 nếu tên này chứa trọn tên kia (sau chuẩn hoá),
 * ngược lại là tỉ lệ token của tên ngắn hơn xuất hiện trong tên dài hơn.
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = tokens(a);
  const tb = tokens(b);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  // "chứa trọn" chỉ tính khi tên ngắn đủ cụ thể (≥ 3 từ), tránh "Chợ" khớp mọi chợ.
  if (short.length >= 3 && (` ${na} `.includes(` ${nb} `) || ` ${nb} `.includes(` ${na} `))) return 1;
  const longSet = new Set(long);
  const hit = short.filter((t) => longSet.has(t)).length;
  return short.length ? hit / short.length : 0;
}

export const MATCH_THRESHOLD = 0.8;

/**
 * Tìm địa điểm đã xác minh trong placesData theo tên (bỏ dấu).
 * `city` (điểm đến) dùng để ưu tiên khi nhiều kết quả cùng điểm, không loại hẳn
 * (vd. trip "Đà Nẵng" có điểm ở Hội An / Bà Nà).
 */
export function matchVerifiedPlace(
  name: string,
  city?: string,
  places: PlaceSearchResult[] = VERIFIED_VIETNAM_PLACES
): PlaceSearchResult | undefined {
  if (tokens(name).length < 2) return undefined;
  const nCity = normalizeName(city || "");
  let best: { p: PlaceSearchResult; score: number } | undefined;
  for (const p of places) {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    let score = nameSimilarity(name, p.name);
    if (score < MATCH_THRESHOLD) continue;
    const pc = normalizeName(p.city);
    if (nCity && pc && (nCity.includes(pc) || pc.includes(nCity))) score += 0.05;
    if (!best || score > best.score) best = { p, score };
  }
  return best?.p;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  geo_source?: GeoSource;
}

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Toạ độ có sẵn trên item, hoặc khớp placesData. Trả undefined nếu cần geocode. */
export function resolveLocalCoords(item: ScheduleItem, destination?: string): GeoPoint | undefined {
  if (isValidLatLng(item.lat, item.lng)) {
    return { lat: item.lat as number, lng: item.lng as number, geo_source: item.geo_source };
  }
  const m = matchVerifiedPlace(item.place_name, destination);
  if (m && isValidLatLng(m.lat, m.lng)) return { lat: m.lat as number, lng: m.lng as number, geo_source: "verified" };
  return undefined;
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Chuỗi tìm kiếm dạng chữ cho một điểm: "tên, gợi ý địa chỉ, điểm đến" (bỏ phần trống/trùng). */
export function placeTextQuery(item: Pick<ScheduleItem, "place_name" | "address_hint">, destination?: string): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const raw of [item.place_name, item.address_hint, destination]) {
    const s = (raw || "").trim();
    const k = normalizeName(s);
    if (!s || !k || seen.has(k)) continue;
    // bỏ điểm đến nếu đã nằm trong địa chỉ
    if (raw === destination && [...seen].some((x) => x.includes(k))) continue;
    seen.add(k);
    parts.push(s);
  }
  return parts.join(", ");
}

/** Danh sách các ngày có ít nhất 1 điểm (giữ chỉ số gốc trong trip.itinerary). */
export function daysWithItems(trip: WanderItineraryData): number[] {
  return (trip.itinerary || [])
    .map((d, i) => ((d?.schedule?.length ?? 0) > 0 ? i : -1))
    .filter((i) => i >= 0);
}

export function formatVnd(v: number): string {
  if (!v) return "Miễn phí";
  return `${Math.round(v).toLocaleString("vi-VN")} đ`;
}
