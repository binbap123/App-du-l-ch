import { describe, it, expect } from "vitest";
import type { ScheduleItem, WanderItineraryData } from "../src/types";
import { buildDayDirectionsUrl, buildTripDirectionsUrls, itemLocationQuery, MAX_WAYPOINTS, sampleEvenly } from "../src/lib/mapsExport";
import {
  DAY_COLORS,
  dayColor,
  matchVerifiedPlace,
  nameSimilarity,
  normalizeName,
  resolveLocalCoords,
} from "../src/components/map/mapUtils";
import { DEFAULT_ITINERARY_DANANG } from "../src/data/mockData";

function item(id: string, place_name: string, extra: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id,
    time_slot: "09:00 - 10:00",
    time_period: "morning",
    place_name,
    category: "attraction",
    category_icon: "photo_camera",
    address_hint: "",
    recommended_dish_or_activity: "",
    cost_vnd: 0,
    social_trend: { is_viral: false, platform: "none", badge_label: "" },
    ui_card: { badge_color: "#000", quick_description: "" },
    ...extra,
  };
}

function trip(days: ScheduleItem[][], destination = "Đà Nẵng"): WanderItineraryData {
  return {
    id: "t1",
    meta: {
      destination,
      trip_duration: `${days.length}N`,
      total_estimated_cost_vnd: 0,
      currency_symbol: "đ",
      theme_color: "#FF6B35",
      summary: "",
    },
    map_config: { recommended_zoom: 12, search_center_hint: destination },
    itinerary: days.map((schedule, i) => ({ day_number: i + 1, day_title: `Ngày ${i + 1}`, schedule })),
    budget_breakdown: { food_and_drink_vnd: 0, attractions_and_activities_vnd: 0, transport_and_others_vnd: 0 },
    local_insider_tips: [],
  };
}

function params(url: string) {
  return new URL(url).searchParams;
}

describe("mapsExport", () => {
  it("xuất đủ mọi ngày, mỗi ngày một link đúng trip", () => {
    const t = trip([
      [item("a", "Cầu Rồng"), item("b", "Chợ Hàn")],
      [item("c", "Bà Nà Hills")],
      [item("d", "Ngũ Hành Sơn"), item("e", "Biển Mỹ Khê"), item("f", "Sơn Trà")],
    ]);
    const links = buildTripDirectionsUrls(t);
    expect(links.map((l) => l.day)).toEqual([1, 2, 3]);
    expect(links.map((l) => l.dayIdx)).toEqual([0, 1, 2]);
    for (const l of links) expect(l.url.startsWith("https://www.google.com/maps/dir/?api=1")).toBe(true);
    expect(params(links[0].url).get("origin")).toBe("Cầu Rồng, Đà Nẵng");
    expect(params(links[0].url).get("destination")).toBe("Chợ Hàn, Đà Nẵng");
    // ngày chỉ có 1 điểm → chỉ destination
    expect(params(links[1].url).get("origin")).toBeNull();
    expect(params(links[1].url).get("destination")).toBe("Bà Nà Hills, Đà Nẵng");
    expect(params(links[2].url).get("waypoints")).toBe("Biển Mỹ Khê, Đà Nẵng");
  });

  it("bỏ qua ngày rỗng và trả null", () => {
    const t = trip([[item("a", "Cầu Rồng")], [], [item("b", "Chợ Hàn")]]);
    expect(buildDayDirectionsUrl(t, 1)).toBeNull();
    expect(buildDayDirectionsUrl(t, 9)).toBeNull();
    expect(buildTripDirectionsUrls(t).map((l) => l.day)).toEqual([1, 3]);
  });

  it(`giới hạn tối đa ${MAX_WAYPOINTS} waypoint, giữ origin/destination`, () => {
    const many = Array.from({ length: 15 }, (_, i) => item(`i${i}`, `Điểm ${i}`));
    const url = buildDayDirectionsUrl(trip([many]), 0)!;
    const p = params(url);
    expect(p.get("origin")).toBe("Điểm 0, Đà Nẵng");
    expect(p.get("destination")).toBe("Điểm 14, Đà Nẵng");
    const wps = p.get("waypoints")!.split("|");
    expect(wps.length).toBe(MAX_WAYPOINTS);
    expect(wps).not.toContain("Điểm 0, Đà Nẵng");
    expect(wps).not.toContain("Điểm 14, Đà Nẵng");
  });

  it("sampleEvenly giữ thứ tự và không trùng", () => {
    const s = sampleEvenly(Array.from({ length: 13 }, (_, i) => i), 9);
    expect(s.length).toBe(9);
    expect([...s].sort((a, b) => a - b)).toEqual(s);
    expect(new Set(s).size).toBe(9);
    expect(sampleEvenly([1, 2], 9)).toEqual([1, 2]);
  });

  it("ưu tiên lat,lng khi có toạ độ, ngược lại dùng tên + địa chỉ + điểm đến", () => {
    expect(itemLocationQuery(item("a", "X", { lat: 16.06, lng: 108.22 }), "Đà Nẵng")).toBe("16.06,108.22");
    expect(itemLocationQuery(item("b", "Chè Liên", { address_hint: "189 Hoàng Diệu" }), "Đà Nẵng")).toBe(
      "Chè Liên, 189 Hoàng Diệu, Đà Nẵng"
    );
    // điểm đến đã nằm trong địa chỉ → không lặp
    expect(itemLocationQuery(item("c", "Chè Liên", { address_hint: "Hải Châu, Đà Nẵng" }), "Đà Nẵng")).toBe(
      "Chè Liên, Hải Châu, Đà Nẵng"
    );
    const url = buildDayDirectionsUrl(trip([[item("a", "A", { lat: 1.5, lng: 2.5 }), item("b", "B")]]), 0)!;
    expect(url).toContain("origin=1.5%2C2.5");
  });

  it("encode đúng ký tự đặc biệt (&, #, dấu tiếng Việt) và dùng %7C giữa waypoint", () => {
    const t = trip([[item("a", "Bún & Chả #1"), item("b", "Phở/Bò?"), item("c", "Cà phê 100%"), item("d", "Cuối")]]);
    const url = buildDayDirectionsUrl(t, 0)!;
    expect(url).not.toMatch(/[ #]/);
    expect(url).toContain("%7C");
    expect(url).toContain(encodeURIComponent("Bún & Chả #1, Đà Nẵng"));
    const p = params(url);
    expect(p.get("origin")).toBe("Bún & Chả #1, Đà Nẵng");
    expect(p.get("waypoints")).toBe("Phở/Bò?, Đà Nẵng|Cà phê 100%, Đà Nẵng");
  });
});

describe("dayColor", () => {
  it("7 màu khác nhau, xoay vòng và an toàn với số âm/NaN", () => {
    expect(new Set(DAY_COLORS).size).toBe(7);
    expect(dayColor(0)).toBe(DAY_COLORS[0]);
    expect(dayColor(2)).toBe(DAY_COLORS[2]);
    expect(dayColor(7)).toBe(DAY_COLORS[0]);
    expect(dayColor(-1)).toBe(DAY_COLORS[6]);
    expect(dayColor(NaN)).toBe(DAY_COLORS[0]);
    for (const c of DAY_COLORS) expect(c).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("3 ngày đầu có 3 màu khác nhau", () => {
    expect(new Set([0, 1, 2].map(dayColor)).size).toBe(3);
  });
});

describe("khớp tên với placesData", () => {
  it("normalizeName bỏ dấu, đ→d, bỏ ký tự đặc biệt", () => {
    expect(normalizeName("  Đà Nẵng — Cầu Rồng! ")).toBe("da nang cau rong");
    expect(normalizeName("Phở Gia Truyền Bát Đàn")).toBe("pho gia truyen bat dan");
  });

  it("khớp không phân biệt dấu/hoa thường", () => {
    const m = matchVerifiedPlace("banh trang cuon thit heo hoang dieu", "Đà Nẵng");
    expect(m?.id).toBe("dn_banhtrang_hoangdieu");
    expect(matchVerifiedPlace("Sun World Bà Nà Hills & Cầu Vàng")?.id).toBeDefined();
  });

  it("khớp khi tên ngắn nằm trọn trong tên đầy đủ", () => {
    expect(matchVerifiedPlace("Phở Gia Truyền Bát Đàn", "Hà Nội")?.city).toBe("Hà Nội");
    expect(nameSimilarity("Mì Quảng Ếch Bếp Trang", "Mì Quảng Ếch Bếp Trang - Lê Hồng Phong")).toBe(1);
  });

  it("không khớp tên quá chung hoặc khác hẳn", () => {
    expect(matchVerifiedPlace("Chợ")).toBeUndefined();
    expect(matchVerifiedPlace("Nhà hàng Hải sản Cua Vàng Bãi Cháy")).toBeUndefined();
    expect(matchVerifiedPlace("Phố cổ Hội An & Thả đèn hoa đăng")).toBeUndefined();
  });

  it("resolveLocalCoords: toạ độ trên item > placesData > undefined", () => {
    expect(resolveLocalCoords(item("a", "Bất kỳ", { lat: 10, lng: 106, geo_source: "ai_estimate" }))).toEqual({
      lat: 10,
      lng: 106,
      geo_source: "ai_estimate",
    });
    const v = resolveLocalCoords(item("b", "Bánh tráng cuốn thịt heo Hoàng Diệu"), "Đà Nẵng");
    expect(v?.geo_source).toBe("verified");
    expect(v?.lat).toBeCloseTo(16.0645);
    expect(resolveLocalCoords(item("c", "Một nơi không tồn tại xyz"))).toBeUndefined();
  });

  it("trip mẫu Đà Nẵng: khớp được điểm đã xác minh ở ngày 1 và 3, export đủ 3 ngày", () => {
    const t = DEFAULT_ITINERARY_DANANG;
    expect(t.itinerary.length).toBe(3);
    const located = t.itinerary.map((d) => d.schedule.filter((it) => resolveLocalCoords(it, t.meta.destination)).length);
    expect(located[0]).toBeGreaterThanOrEqual(1);
    expect(located[2]).toBeGreaterThanOrEqual(1);
    expect(buildTripDirectionsUrls(t).length).toBe(3);
  });

  it("trip 3 ngày có toạ độ → 3 ngày đủ ≥2 điểm (3 tuyến) với 3 màu khác nhau", () => {
    const t = trip([
      [item("a", "A", { lat: 16.06, lng: 108.22 }), item("b", "Cầu Rồng Đà Nẵng & Công viên bờ Đông")],
      [item("c", "C", { lat: 15.88, lng: 108.33, geo_source: "ai_estimate" }), item("d", "D", { lat: 15.87, lng: 108.32 })],
      [item("e", "Sun World Bà Nà Hills & Cầu Vàng"), item("f", "F", { lat: 16.0, lng: 108.25 })],
    ]);
    const perDay = t.itinerary.map((d) => d.schedule.filter((it) => resolveLocalCoords(it, t.meta.destination)).length);
    expect(perDay).toEqual([2, 2, 2]);
    expect(new Set(t.itinerary.map((_, i) => dayColor(i))).size).toBe(3);
  });
});
