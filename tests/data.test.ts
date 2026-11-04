import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll, vi } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import * as store from "../src/lib/tripStore";
import { DEFAULT_ITINERARY_DANANG } from "../src/data/mockData";
import type { WanderItineraryData } from "../src/types";
import { createApp } from "../server/app";
import {
  __resetGeocodeForTests,
  isInVietnam,
  matchVerifiedPlace,
  NOMINATIM_USER_AGENT,
} from "../server/routes/geocode";
import { FALLBACK_TRENDING, sanitizeSpot } from "../server/routes/trending";

// ---------- localStorage giả ----------

class FakeStorage {
  data = new Map<string, string>();
  throwOnSet = false;
  throwOnGet = false;
  getItem(k: string) {
    if (this.throwOnGet) throw new Error("SecurityError");
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    if (this.throwOnSet) throw new Error("QuotaExceededError");
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
  key(i: number) {
    return Array.from(this.data.keys())[i] ?? null;
  }
  get length() {
    return this.data.size;
  }
}

function makeTrip(dest: string, extra: Partial<WanderItineraryData> = {}): WanderItineraryData {
  return {
    ...JSON.parse(JSON.stringify(DEFAULT_ITINERARY_DANANG)),
    id: undefined,
    meta: { ...DEFAULT_ITINERARY_DANANG.meta, destination: dest },
    ...extra,
  };
}

let fake: FakeStorage;
const g = globalThis as any;
const originalLocalStorage = g.localStorage;

describe("tripStore (localStorage)", () => {
  beforeEach(() => {
    fake = new FakeStorage();
    g.localStorage = fake;
    store.__resetTripStoreForTests();
  });
  afterEach(() => {
    g.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  it("lần chạy đầu seed 1 lịch trình mẫu có id và ghi vào key v1", () => {
    const trips = store.listTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toMatch(/^trip_\d+_[a-z0-9]+$/);
    expect(trips[0].meta.destination).toBe(DEFAULT_ITINERARY_DANANG.meta.destination);
    const raw = JSON.parse(fake.getItem(store.TRIPS_STORAGE_KEY)!);
    expect(raw.version).toBe(1);
    expect(raw.trips).toHaveLength(1);
  });

  it("không seed lại khi người dùng đã xoá hết trip", () => {
    const [seed] = store.listTrips();
    store.deleteTrip(seed.id!);
    store.__resetTripStoreForTests(); // giả lập reload trang
    expect(store.listTrips()).toHaveLength(0);
  });

  it("saveTrip gán id + timestamps, cập nhật giữ created_at, dữ liệu còn sau reload", async () => {
    const saved = store.saveTrip(makeTrip("Hội An"));
    expect(saved.id).toMatch(/^trip_/);
    expect(saved.created_at).toBeTruthy();
    expect(saved.updated_at).toBe(saved.created_at);

    await new Promise((r) => setTimeout(r, 5));
    const updated = store.saveTrip({ ...saved, meta: { ...saved.meta, summary: "đã sửa" } });
    expect(updated.id).toBe(saved.id);
    expect(updated.created_at).toBe(saved.created_at);
    expect(updated.updated_at! > saved.updated_at!).toBe(true);

    store.__resetTripStoreForTests(); // reload
    const again = store.getTrip(saved.id!);
    expect(again?.meta.summary).toBe("đã sửa");
    expect(store.listTrips()).toHaveLength(2); // seed + Hội An
  });

  it("saveTrip không làm thay đổi object truyền vào", () => {
    const input = makeTrip("Huế");
    store.saveTrip(input);
    expect(input.id).toBeUndefined();
  });

  it("deleteTrip", () => {
    const t = store.saveTrip(makeTrip("Huế"));
    expect(store.deleteTrip(t.id!)).toBe(true);
    expect(store.getTrip(t.id!)).toBeUndefined();
    expect(store.deleteTrip("khong_co")).toBe(false);
  });

  it("setItem ném lỗi (quota/private mode) → vẫn chạy bằng bộ nhớ, không crash", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.throwOnSet = true;
    const saved = store.saveTrip(makeTrip("Đà Lạt"));
    expect(store.getTrip(saved.id!)?.meta.destination).toBe("Đà Lạt");
    expect(store.isPersistent()).toBe(false);
    // Lần sau ghi được lại → trở về bình thường và ghi cả trip cũ.
    fake.throwOnSet = false;
    store.saveTrip(makeTrip("Sa Pa"));
    expect(store.isPersistent()).toBe(true);
    const raw = JSON.parse(fake.getItem(store.TRIPS_STORAGE_KEY)!);
    expect(raw.trips.map((t: any) => t.meta.destination)).toEqual(expect.arrayContaining(["Đà Lạt", "Sa Pa"]));
  });

  it("getItem ném lỗi → seed in-memory, CRUD vẫn chạy", () => {
    fake.throwOnGet = true;
    fake.throwOnSet = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(store.listTrips()).toHaveLength(1);
    const t = store.saveTrip(makeTrip("Cần Thơ"));
    expect(store.listTrips().map((x) => x.id)).toContain(t.id);
  });

  it("không có localStorage (SSR/test) → không crash", () => {
    delete g.localStorage;
    expect(() => store.listTrips()).not.toThrow();
    expect(store.saveTrip(makeTrip("Vũng Tàu")).id).toBeTruthy();
  });

  it("dữ liệu hỏng → sao lưu bản raw, bắt đầu danh sách rỗng", () => {
    fake.setItem(store.TRIPS_STORAGE_KEY, "{not json");
    expect(store.listTrips()).toEqual([]);
    expect(fake.getItem(`${store.TRIPS_STORAGE_KEY}.corrupt`)).toBe("{not json");
  });

  it("migrate dạng cũ là mảng trần, bỏ phần tử không hợp lệ", () => {
    fake.setItem(store.TRIPS_STORAGE_KEY, JSON.stringify([makeTrip("Nha Trang"), { foo: 1 }]));
    const trips = store.listTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBeTruthy();
  });

  it("export → import ở trình duyệt khác: thêm mới, bỏ qua trùng id và dữ liệu sai", () => {
    store.saveTrip(makeTrip("Phú Quốc"));
    const json = store.exportTrips();
    const exported = JSON.parse(json);
    expect(exported.version).toBe(1);
    expect(exported.trips).toHaveLength(2);

    // "trình duyệt khác"
    g.localStorage = new FakeStorage();
    store.__resetTripStoreForTests();
    store.listTrips(); // seed riêng của trình duyệt này
    const r1 = store.importTrips(json);
    expect(r1).toEqual({ added: 2, skipped: 0 });
    // import lại lần nữa → trùng id
    expect(store.importTrips(json)).toEqual({ added: 0, skipped: 2 });
    // trip không hợp lệ
    expect(store.importTrips(JSON.stringify([{ meta: {} }, { meta: { destination: "X" } }]))).toEqual({
      added: 0,
      skipped: 2,
    });
    // 1 trip lẻ, không id
    expect(store.importTrips(JSON.stringify(makeTrip("Quy Nhơn")))).toEqual({ added: 1, skipped: 0 });
    expect(store.listTrips()).toHaveLength(4);
    expect(() => store.importTrips("không phải json")).toThrow();
  });

  it("subscribeTrips nhận thông báo khi lưu/xoá", () => {
    const fn = vi.fn();
    const off = store.subscribeTrips(fn);
    const t = store.saveTrip(makeTrip("Hà Nội"));
    store.deleteTrip(t.id!);
    expect(fn).toHaveBeenCalledTimes(2);
    off();
    store.saveTrip(makeTrip("Hà Nội"));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("currentTripId đọc/ghi an toàn", () => {
    store.writeCurrentTripId("trip_1");
    expect(store.readCurrentTripId()).toBe("trip_1");
    store.writeCurrentTripId(null);
    expect(store.readCurrentTripId()).toBeNull();
    fake.throwOnGet = true;
    expect(store.readCurrentTripId()).toBeNull();
  });
});

// ---------- geocode ----------

describe("geocode helpers", () => {
  it("bbox Việt Nam", () => {
    expect(isInVietnam(16.06, 108.22)).toBe(true);
    expect(isInVietnam(13.75, 100.5)).toBe(false); // Bangkok
    expect(isInVietnam(35.68, 139.76)).toBe(false);
    expect(isInVietnam(NaN, 108)).toBe(false);
  });

  it("khớp DB đã xác minh khi bỏ dấu, có kiểm tra thành phố", () => {
    const m = matchVerifiedPlace("cau rong da nang", "Da Nang");
    expect(m?.geo_source).toBe("verified");
    expect(m?.lat).toBeCloseTo(16.0611, 3);
    expect(matchVerifiedPlace("Cầu Rồng", "Hà Nội")).toBeNull();
    expect(matchVerifiedPlace("an", "")).toBeNull();
  });
});

describe("GET /api/geocode (fetch Nominatim được mock)", () => {
  let server: Server;
  let base = "";
  const realFetch = globalThis.fetch;
  let nominatimCalls: string[] = [];
  let nominatimResponse: () => Promise<Response>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    __resetGeocodeForTests({ minIntervalMs: 50 });
    nominatimCalls = [];
    nominatimResponse = async () =>
      new Response(JSON.stringify([{ lat: "21.0293", lon: "105.8355", display_name: "Văn Miếu, Hà Nội" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.url ?? String(input);
      if (url.startsWith("https://nominatim.openstreetmap.org/")) {
        nominatimCalls.push(url);
        expect(init?.headers?.["User-Agent"]).toBe(NOMINATIM_USER_AGENT);
        return nominatimResponse();
      }
      if (url.startsWith("http://127.0.0.1")) return realFetch(input, init);
      throw new Error(`Không được gọi mạng thật trong test: ${url}`);
    });
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const geocodeReq = async (q: string, city = "") => {
    const r = await fetch(`${base}/api/geocode?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`);
    return { status: r.status, body: await r.json() };
  };

  it("khớp DB verified → không gọi Nominatim", async () => {
    const { body } = await geocodeReq("Cầu Rồng Đà Nẵng", "Đà Nẵng");
    expect(body.success).toBe(true);
    expect(body.data.geo_source).toBe("verified");
    expect(nominatimCalls).toHaveLength(0);
  });

  it("không có trong DB → Nominatim, đúng tham số, và cache lần 2", async () => {
    const r1 = await geocodeReq("Văn Miếu Quốc Tử Giám", "Hà Nội");
    expect(r1.body.data).toMatchObject({ lat: 21.0293, lng: 105.8355, geo_source: "geocoded" });
    expect(nominatimCalls).toHaveLength(1);
    const u = new URL(nominatimCalls[0]);
    expect(u.searchParams.get("format")).toBe("jsonv2");
    expect(u.searchParams.get("countrycodes")).toBe("vn");
    expect(u.searchParams.get("limit")).toBe("1");
    expect(u.searchParams.get("q")).toBe("Văn Miếu Quốc Tử Giám, Hà Nội");

    const r2 = await geocodeReq("van mieu quoc tu giam", "ha noi"); // cùng key sau khi bỏ dấu
    expect(r2.body.data.lat).toBe(21.0293);
    expect(nominatimCalls).toHaveLength(1);
  });

  it("kết quả ngoài bbox Việt Nam → null (và cache null)", async () => {
    nominatimResponse = async () =>
      new Response(JSON.stringify([{ lat: "13.7563", lon: "100.5018", display_name: "Bangkok" }]), { status: 200 });
    const r1 = await geocodeReq("Chùa Vàng xa xôi");
    expect(r1.body).toEqual({ success: true, data: null });
    await geocodeReq("Chùa Vàng xa xôi");
    expect(nominatimCalls).toHaveLength(1);
  });

  it("Nominatim lỗi → data null, không 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    nominatimResponse = async () => new Response("busy", { status: 503 });
    const r = await geocodeReq("Địa điểm lỗi");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ success: true, data: null });
  });

  it("hàng đợi: các request tới Nominatim cách nhau ≥ khoảng tối thiểu", async () => {
    const times: number[] = [];
    nominatimResponse = async () => {
      times.push(Date.now());
      return new Response("[]", { status: 200 });
    };
    await Promise.all([geocodeReq("Điểm A xyz"), geocodeReq("Điểm B xyz"), geocodeReq("Điểm C xyz")]);
    expect(times).toHaveLength(3);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(45);
  });

  it("q quá ngắn → 400", async () => {
    const r = await geocodeReq("a");
    expect(r.status).toBe(400);
  });
});

// ---------- places / trending ----------

describe("places & trending tiết kiệm quota / trung thực", () => {
  let server: Server;
  let base = "";
  const saved = { serp: process.env.SERPAPI_API_KEY, ac: process.env.SERPAPI_AUTOCOMPLETE };

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.close();
    process.env.SERPAPI_API_KEY = saved.serp;
    process.env.SERPAPI_AUTOCOMPLETE = saved.ac;
    if (saved.serp === undefined) delete process.env.SERPAPI_API_KEY;
    if (saved.ac === undefined) delete process.env.SERPAPI_AUTOCOMPLETE;
  });

  it("autocomplete trả [] và KHÔNG gọi SerpApi khi chưa bật SERPAPI_AUTOCOMPLETE", async () => {
    process.env.SERPAPI_API_KEY = "test-key";
    delete process.env.SERPAPI_AUTOCOMPLETE;
    const realFetch = globalThis.fetch;
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : String(input.url ?? input);
      if (url.startsWith("http://127.0.0.1")) return realFetch(input, init);
      throw new Error("không được gọi SerpApi");
    });
    try {
      const r = await fetch(`${base}/api/places/autocomplete?q=banh%20mi&city=H%E1%BB%99i%20An`);
      expect((await r.json()).data).toEqual([]);
      expect(spy.mock.calls.filter(([u]) => !String(u).startsWith("http://127.0.0.1"))).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("trending fallback không có số lượt xem", async () => {
    const r = await fetch(`${base}/api/trending-spots`);
    const j = await r.json();
    expect(j.source).toBe("fallback");
    for (const s of j.data) {
      expect(s.views).toBeUndefined();
      expect(s.badge_label).not.toMatch(/\d/);
    }
    for (const s of FALLBACK_TRENDING) expect(s.badge_label).not.toMatch(/\d|views/i);
  });

  it("sanitizeSpot bỏ số liệu Gemini tự bịa", () => {
    const s = sanitizeSpot(
      { name: "X", city: "Y", platform: "tiktok", badge_label: "45M views", views: "45M", category: "food" },
      0,
      "2026-11-04T00:00:00Z"
    );
    expect((s as any).views).toBeUndefined();
    expect(s.badge_label).not.toMatch(/\d|views/i);
  });
});
