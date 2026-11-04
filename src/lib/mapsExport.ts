/**
 * Xuất lịch trình sang Google Maps (link URL thường, không cần API key).
 * Mỗi ngày một link chỉ đường; Google giới hạn 9 waypoint (không tính origin/destination).
 */
import type { ScheduleItem, WanderItineraryData } from "../types";
import { isValidLatLng, placeTextQuery } from "../components/map/mapUtils";

export const MAX_WAYPOINTS = 9;

/** "lat,lng" nếu item có toạ độ, ngược lại "tên, địa chỉ, điểm đến". */
export function itemLocationQuery(item: ScheduleItem, destination?: string): string {
  if (isValidLatLng(item.lat, item.lng)) return `${item.lat},${item.lng}`;
  return placeTextQuery(item, destination);
}

/** Chọn tối đa `max` phần tử, rải đều để giữ hình dạng tuyến (luôn giữ thứ tự gốc). */
export function sampleEvenly<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr.slice();
  if (max <= 0) return [];
  const out: T[] = [];
  const step = arr.length / max;
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step + step / 2)]);
  return out;
}

/** Link chỉ đường Google Maps cho một ngày (dayIdx 0-based). null nếu ngày không có điểm. */
export function buildDayDirectionsUrl(trip: WanderItineraryData, dayIdx: number): string | null {
  const schedule = trip.itinerary?.[dayIdx]?.schedule || [];
  const destination = trip.meta?.destination;
  const stops = schedule.map((it) => itemLocationQuery(it, destination)).filter(Boolean);
  if (stops.length === 0) return null;

  const base = "https://www.google.com/maps/dir/?api=1";
  if (stops.length === 1) return `${base}&destination=${encodeURIComponent(stops[0])}`;

  const origin = stops[0];
  const dest = stops[stops.length - 1];
  const middle = sampleEvenly(stops.slice(1, -1), MAX_WAYPOINTS);
  let url = `${base}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`;
  if (middle.length) url += `&waypoints=${middle.map(encodeURIComponent).join("%7C")}`;
  return url;
}

/**
 * Link cho mọi ngày có điểm. `day` là day_number (hoặc chỉ số + 1 nếu thiếu),
 * `dayIdx` là chỉ số 0-based trong trip.itinerary (dùng cho màu ngày).
 */
export function buildTripDirectionsUrls(trip: WanderItineraryData): { day: number; dayIdx: number; url: string }[] {
  const out: { day: number; dayIdx: number; url: string }[] = [];
  (trip.itinerary || []).forEach((d, i) => {
    const url = buildDayDirectionsUrl(trip, i);
    if (url) out.push({ day: d?.day_number || i + 1, dayIdx: i, url });
  });
  return out;
}
