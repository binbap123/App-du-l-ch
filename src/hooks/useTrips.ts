import { useCallback, useEffect, useMemo, useState } from "react";
import type { WanderItineraryData } from "../types";
import * as store from "../lib/tripStore";

export interface UseTripsResult {
  trips: WanderItineraryData[];
  /** Trip đang chọn; nếu id đã lưu không còn → trip đầu tiên; danh sách rỗng → null. */
  currentTrip: WanderItineraryData | null;
  setCurrentTripId: (id: string | null) => void;
  saveTrip: (trip: WanderItineraryData) => WanderItineraryData;
  deleteTrip: (id: string) => boolean;
  /** false khi localStorage không dùng được — trip chỉ còn đến khi tải lại trang. */
  isPersistent: boolean;
}

/** Danh sách chuyến đi lưu trên localStorage (D1), đồng bộ giữa các tab qua sự kiện `storage`. */
export function useTrips(): UseTripsResult {
  const [trips, setTrips] = useState<WanderItineraryData[]>(() => store.listTrips());
  const [currentTripId, setCurrentTripIdState] = useState<string | null>(() => store.readCurrentTripId());
  const [isPersistent, setIsPersistent] = useState<boolean>(() => store.isPersistent());

  useEffect(() => {
    const refresh = () => {
      setTrips(store.listTrips());
      setIsPersistent(store.isPersistent());
    };
    // Đồng bộ lại phòng khi dữ liệu đổi giữa lần render đầu và lúc subscribe.
    refresh();
    return store.subscribeTrips(refresh);
  }, []);

  const setCurrentTripId = useCallback((id: string | null) => {
    setCurrentTripIdState(id);
    store.writeCurrentTripId(id);
  }, []);

  const saveTrip = useCallback((trip: WanderItineraryData) => store.saveTrip(trip), []);
  const deleteTrip = useCallback((id: string) => store.deleteTrip(id), []);

  const currentTrip = useMemo(
    () => (currentTripId ? trips.find((t) => t.id === currentTripId) : undefined) ?? trips[0] ?? null,
    [trips, currentTripId]
  );

  return { trips, currentTrip, setCurrentTripId, saveTrip, deleteTrip, isPersistent };
}
