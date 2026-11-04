import { describe, expect, it } from "vitest";
import {
  dateForDay,
  dayLabel,
  exportFileName,
  filterByQuery,
  formatThousands,
  isValidIsoDate,
  parseCostInput,
  sumScheduleCost,
  tripDateRange,
} from "../src/lib/uiFormat";
import { tabFromPath, tripEditPath, tripPath } from "../src/routes";
import { DEFAULT_ITINERARY_DANANG } from "../src/data/mockData";
import { getSampleItinerary } from "../src/data/sampleItineraries";

describe("ngày thật từ start_date", () => {
  it("nhãn pill có thứ và ngày/tháng", () => {
    // 07/11/2026 là thứ Bảy
    expect(dayLabel("2026-11-07", 0)).toBe("Ngày 1 · T7 07/11");
    expect(dayLabel("2026-11-07", 1)).toBe("Ngày 2 · CN 08/11");
    expect(dayLabel("2026-11-07", 2, 3)).toBe("Ngày 3 · T2 09/11");
  });

  it("không có start_date thì chỉ hiện số ngày", () => {
    expect(dayLabel(undefined, 0)).toBe("Ngày 1");
    expect(dayLabel("", 1, 2)).toBe("Ngày 2");
    expect(dayLabel("08/11/2026", 0)).toBe("Ngày 1");
  });

  it("qua tháng, qua năm, năm nhuận", () => {
    expect(dayLabel("2026-12-31", 1)).toBe("Ngày 2 · T6 01/01");
    expect(dateForDay("2028-02-28", 1)?.getUTCDate()).toBe(29);
  });

  it("từ chối ngày không tồn tại", () => {
    expect(isValidIsoDate("2026-02-31")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-02-28")).toBe(true);
  });

  it("khoảng ngày của chuyến đi", () => {
    expect(tripDateRange("2026-11-08", 3)).toBe("08/11 – 10/11/2026");
    expect(tripDateRange("2026-12-30", 3)).toBe("30/12/2026 – 01/01/2027");
    expect(tripDateRange("2026-11-08", 1)).toBe("08/11/2026");
    expect(tripDateRange(undefined, 3)).toBe("");
  });
});

describe("ô chi phí", () => {
  it("parse chuỗi người dùng gõ", () => {
    expect(parseCostInput("65.000 đ")).toBe(65000);
    expect(parseCostInput("1,200,000")).toBe(1200000);
    expect(parseCostInput("")).toBe(0);
    expect(parseCostInput("abc")).toBe(0);
  });

  it("định dạng hàng nghìn bằng dấu chấm", () => {
    expect(formatThousands(0)).toBe("0");
    expect(formatThousands(999)).toBe("999");
    expect(formatThousands(65000)).toBe("65.000");
    expect(formatThousands(2800000)).toBe("2.800.000");
    expect(formatThousands(-5)).toBe("0");
    expect(formatThousands(NaN)).toBe("0");
  });

  it("parse lại chuỗi đã định dạng ra đúng số", () => {
    for (const n of [0, 5, 45000, 1234567]) expect(parseCostInput(formatThousands(n))).toBe(n);
  });

  it("cộng chi phí các điểm", () => {
    expect(sumScheduleCost([{ schedule: [{ cost_vnd: 1000 }, { cost_vnd: 2000 }] }, { schedule: [] }, {}])).toBe(3000);
  });
});

describe("lọc điểm đến", () => {
  const cards = [
    { title: "Đà Nẵng", tag: "Thành phố" },
    { title: "Hội An", tag: "Phố cổ" },
  ];
  it("bỏ dấu và không phân biệt hoa thường", () => {
    expect(filterByQuery(cards, "da nang", (c) => [c.title]).map((c) => c.title)).toEqual(["Đà Nẵng"]);
    expect(filterByQuery(cards, "PHỐ CỔ", (c) => [c.title, c.tag]).map((c) => c.title)).toEqual(["Hội An"]);
    expect(filterByQuery(cards, "  ", (c) => [c.title])).toHaveLength(2);
    expect(filterByQuery(cards, "Huế", (c) => [c.title])).toHaveLength(0);
  });
});

describe("route theo id", () => {
  it("tab tô đúng cho mọi /trips*", () => {
    expect(tabFromPath("/trips")).toBe("itinerary");
    expect(tabFromPath("/trips/trip_1")).toBe("itinerary");
    expect(tabFromPath("/trips/trip_1/edit")).toBe("builder");
    expect(tabFromPath("/trips/edit")).toBe("builder");
    expect(tabFromPath("/trips/edit/")).toBe("builder");
    expect(tabFromPath("/settings")).toBe("settings");
    expect(tabFromPath("/")).toBe("explore");
  });

  it("tạo đường dẫn có mã hóa id", () => {
    expect(tripPath("trip_1")).toBe("/trips/trip_1");
    expect(tripEditPath("a b")).toBe("/trips/a%20b/edit");
  });

  it("tên file xuất dữ liệu", () => {
    expect(exportFileName(new Date(2026, 10, 4))).toBe("wanderai-chuyen-di-2026-11-04.json");
  });
});

describe("tọa độ lịch trình mẫu", () => {
  const items = [
    ...DEFAULT_ITINERARY_DANANG.itinerary,
    ...["Hà Nội", "Huế", "Phú Quốc", "Đà Lạt", "Ninh Bình", "Hạ Long", "Đà Nẵng Hội An"].flatMap(
      (d) => getSampleItinerary(d, "3N2Đ").itinerary
    ),
  ].flatMap((d) => d.schedule);

  it("điểm có tọa độ luôn có geo_source hợp lệ và nằm trong Việt Nam", () => {
    const withCoords = items.filter((it) => typeof it.lat === "number");
    expect(withCoords.length).toBeGreaterThan(30);
    for (const it of withCoords) {
      expect(["verified", "ai_estimate"]).toContain(it.geo_source);
      expect(it.lat!).toBeGreaterThan(8);
      expect(it.lat!).toBeLessThan(24);
      expect(it.lng!).toBeGreaterThan(102);
      expect(it.lng!).toBeLessThan(110);
    }
  });

  it("không còn nhãn số lượt xem bịa", () => {
    for (const it of items) expect(it.social_trend?.badge_label || "").not.toMatch(/\d(\.\d)?\s*[MK]\s*views?/i);
  });
});
