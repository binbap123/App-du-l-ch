import type { TabType } from "./types";

/**
 * Bản đồ URL của app.
 * /trips            danh sách chuyến đi
 * /trips/:id        trang chi tiết
 * /trips/:id/edit   builder cho trip đã lưu
 * /trips/edit       builder cho bản nháp chưa lưu (vd vừa mở từ chat)
 */
export const PATHS = {
  explore: "/",
  trending: "/trending",
  ai_assistant: "/chat",
  itinerary: "/trips",
  builder: "/trips/edit",
  map: "/",
  settings: "/settings",
} as const satisfies Record<TabType, string>;

export const tripPath = (id: string) => `/trips/${encodeURIComponent(id)}`;
export const tripEditPath = (id: string) => `/trips/${encodeURIComponent(id)}/edit`;

export function tabFromPath(pathname: string): TabType {
  const p = pathname.replace(/\/+$/, "");
  if (p === "/trips/edit" || /^\/trips\/[^/]+\/edit$/.test(p)) return "builder";
  if (p.startsWith("/trips")) return "itinerary";
  if (p.startsWith("/chat")) return "ai_assistant";
  if (p.startsWith("/trending")) return "trending";
  if (p.startsWith("/settings")) return "settings";
  return "explore";
}
