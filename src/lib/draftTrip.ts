import type { WanderItineraryData } from "../types";
import { isValidTrip } from "./tripStore";

/**
 * Bản nháp chưa lưu (vd vừa mở từ chat) cho route /trips/edit.
 * Giữ trong sessionStorage để reload vẫn mở lại được; đóng tab thì mất.
 */
export const DRAFT_TRIP_KEY = "wanderai.draftTrip";

export function readDraftTrip(): WanderItineraryData | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_TRIP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidTrip(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDraftTrip(trip: WanderItineraryData | null): void {
  try {
    if (trip) sessionStorage.setItem(DRAFT_TRIP_KEY, JSON.stringify(trip));
    else sessionStorage.removeItem(DRAFT_TRIP_KEY);
  } catch {
    /* private mode / quota — bản nháp chỉ còn trong bộ nhớ */
  }
}
