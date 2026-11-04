import type { WanderItineraryData } from "../types";
import { DEFAULT_ITINERARY_DANANG } from "../data/mockData";

/**
 * Lưu chuyến đi trên trình duyệt (D1 = localStorage). Mỗi trình duyệt/profile có dữ liệu riêng,
 * server không giữ state. Mọi truy cập localStorage đều bọc try/catch: private mode, quota đầy,
 * hoặc storage bị chặn → vẫn chạy bằng bản in-memory, không crash.
 */

export const TRIPS_STORAGE_KEY = "wanderai.trips.v1";
export const CURRENT_TRIP_KEY = "wanderai.currentTripId";
const STORE_VERSION = 1;

export interface TripStoreData {
  version: 1;
  trips: WanderItineraryData[];
}

export interface ImportResult {
  added: number;
  skipped: number;
}

type Listener = () => void;

let memory: TripStoreData | null = null;
/** Chuỗi raw lần cuối đọc/ghi — để không parse lại khi localStorage không đổi. */
let lastRaw: string | null = null;
/** true khi localStorage không dùng được (đọc hoặc ghi lỗi) → dùng bản in-memory. */
let storageBroken = false;
const listeners = new Set<Listener>();

function getStorage(): Storage | null {
  try {
    const s = (globalThis as any).localStorage as Storage | undefined;
    return s ?? null;
  } catch {
    return null;
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function generateTripId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Validate tối thiểu: có meta.destination (chuỗi) và mảng itinerary. */
export function isValidTrip(v: unknown): v is WanderItineraryData {
  const t = v as any;
  return (
    !!t &&
    typeof t === "object" &&
    !!t.meta &&
    typeof t.meta === "object" &&
    typeof t.meta.destination === "string" &&
    t.meta.destination.trim().length > 0 &&
    Array.isArray(t.itinerary)
  );
}

function seedData(): TripStoreData {
  const now = new Date().toISOString();
  const sample: WanderItineraryData = {
    ...clone(DEFAULT_ITINERARY_DANANG),
    id: DEFAULT_ITINERARY_DANANG.id || generateTripId(),
    created_at: now,
    updated_at: now,
  };
  return { version: STORE_VERSION, trips: [sample] };
}

/** Parse dữ liệu đã lưu; chấp nhận cả dạng cũ là mảng trần (migrate). Trả null nếu hỏng. */
function parseStored(raw: string): TripStoreData | null {
  try {
    const parsed = JSON.parse(raw);
    const list: unknown[] | null = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.trips)
        ? parsed.trips
        : null;
    if (!list) return null;
    const trips = list.filter(isValidTrip).map((t) => (t.id ? t : { ...t, id: generateTripId() }));
    return { version: STORE_VERSION, trips };
  } catch {
    return null;
  }
}

function persist(data: TripStoreData): boolean {
  memory = data;
  const raw = JSON.stringify(data);
  const storage = getStorage();
  if (!storage) {
    storageBroken = true;
    return false;
  }
  try {
    storage.setItem(TRIPS_STORAGE_KEY, raw);
    lastRaw = raw;
    storageBroken = false;
    return true;
  } catch (err) {
    console.warn("[tripStore] Không ghi được localStorage, giữ tạm trong bộ nhớ:", err);
    storageBroken = true;
    return false;
  }
}

function load(): TripStoreData {
  // Đã từng ghi lỗi → bản in-memory mới nhất, đừng đọc lại dữ liệu cũ trong storage.
  if (storageBroken && memory) return memory;

  const storage = getStorage();
  let raw: string | null;
  try {
    if (!storage) throw new Error("localStorage không khả dụng");
    raw = storage.getItem(TRIPS_STORAGE_KEY);
  } catch {
    storageBroken = true;
    if (!memory) memory = seedData();
    return memory;
  }

  if (raw === null) {
    // Lần chạy đầu: seed 1 lịch trình mẫu để màn hình không trống.
    const seeded = seedData();
    persist(seeded);
    return seeded;
  }

  if (memory && raw === lastRaw) return memory;

  const parsed = parseStored(raw);
  if (!parsed) {
    // Dữ liệu hỏng: sao lưu bản raw rồi bắt đầu lại danh sách rỗng (không seed đè).
    try {
      storage!.setItem(`${TRIPS_STORAGE_KEY}.corrupt`, raw);
    } catch {
      /* ignore */
    }
    const empty: TripStoreData = { version: STORE_VERSION, trips: [] };
    persist(empty);
    return empty;
  }
  memory = parsed;
  lastRaw = raw;
  return parsed;
}

function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      console.error("[tripStore] listener error", err);
    }
  }
}

// ---------- API công khai ----------

export function listTrips(): WanderItineraryData[] {
  return load().trips;
}

export function getTrip(id: string): WanderItineraryData | undefined {
  return load().trips.find((t) => t.id === id);
}

/** Lưu (thêm mới hoặc cập nhật). Luôn gán id, created_at, updated_at. Trả về trip đã lưu. */
export function saveTrip(trip: WanderItineraryData): WanderItineraryData {
  const data = load();
  const now = new Date().toISOString();
  const id = trip.id || generateTripId();
  const existing = data.trips.find((t) => t.id === id);
  const saved: WanderItineraryData = {
    ...clone(trip),
    id,
    created_at: existing?.created_at || trip.created_at || now,
    updated_at: now,
  };
  const trips = existing ? data.trips.map((t) => (t.id === id ? saved : t)) : [saved, ...data.trips];
  persist({ version: STORE_VERSION, trips });
  notify();
  return saved;
}

export function deleteTrip(id: string): boolean {
  const data = load();
  const trips = data.trips.filter((t) => t.id !== id);
  if (trips.length === data.trips.length) return false;
  persist({ version: STORE_VERSION, trips });
  notify();
  return true;
}

export function exportTrips(): string {
  return JSON.stringify({ version: STORE_VERSION, exported_at: new Date().toISOString(), trips: load().trips }, null, 2);
}

/**
 * Nhập từ JSON (định dạng exportTrips, hoặc mảng trip, hoặc 1 trip).
 * Trip không hợp lệ hoặc trùng id đã có → skipped. Ném Error nếu JSON hỏng.
 */
export function importTrips(json: string): ImportResult {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("File JSON không hợp lệ");
  }
  const incoming: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && Array.isArray(parsed.trips)
      ? parsed.trips
      : [parsed];

  const data = load();
  const ids = new Set(data.trips.map((t) => t.id));
  const added: WanderItineraryData[] = [];
  let skipped = 0;
  const now = new Date().toISOString();

  for (const item of incoming) {
    if (!isValidTrip(item) || (item.id && ids.has(item.id))) {
      skipped++;
      continue;
    }
    const id = item.id || generateTripId();
    ids.add(id);
    added.push({ ...clone(item), id, created_at: item.created_at || now, updated_at: item.updated_at || now });
  }

  if (added.length > 0) {
    persist({ version: STORE_VERSION, trips: [...added, ...data.trips] });
    notify();
  }
  return { added: added.length, skipped };
}

/** false khi đang chạy bằng bộ nhớ tạm (private mode / quota đầy) — dữ liệu sẽ mất khi tải lại trang. */
export function isPersistent(): boolean {
  load();
  return !storageBroken;
}

/**
 * Đăng ký nhận thay đổi: trong tab hiện tại (saveTrip/deleteTrip/importTrips)
 * và từ tab khác (sự kiện `storage`). Trả về hàm huỷ đăng ký.
 */
export function subscribeTrips(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== TRIPS_STORAGE_KEY) return;
    // Tab khác đã ghi → bỏ bản in-memory, đọc lại.
    storageBroken = false;
    memory = null;
    lastRaw = null;
    listener();
  };
  const w = typeof window !== "undefined" ? window : null;
  w?.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    w?.removeEventListener("storage", onStorage);
  };
}

export function readCurrentTripId(): string | null {
  try {
    return getStorage()?.getItem(CURRENT_TRIP_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeCurrentTripId(id: string | null): void {
  try {
    const s = getStorage();
    if (!s) return;
    if (id) s.setItem(CURRENT_TRIP_KEY, id);
    else s.removeItem(CURRENT_TRIP_KEY);
  } catch {
    /* private mode — bỏ qua */
  }
}

/** Chỉ dùng trong test: xoá trạng thái in-memory. */
export function __resetTripStoreForTests(): void {
  memory = null;
  lastRaw = null;
  storageBroken = false;
  listeners.clear();
}
