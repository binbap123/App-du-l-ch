import type { TabType } from "./types";

/**
 * Bản đồ URL của app. Phase 0 chỉ map các tab cũ sang URL.
 * TODO(phase-2): thêm /trips/:id, /trips/:id/edit, /place/:id và tách App.tsx thành src/pages/*.
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

export function tabFromPath(pathname: string): TabType {
  if (pathname.startsWith("/trips/edit")) return "builder";
  if (pathname.startsWith("/trips")) return "itinerary";
  if (pathname.startsWith("/chat")) return "ai_assistant";
  if (pathname.startsWith("/trending")) return "trending";
  if (pathname.startsWith("/settings")) return "settings";
  return "explore";
}
