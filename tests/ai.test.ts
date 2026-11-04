import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { ApiError as GenAiApiError } from "@google/genai";
import { __setGeminiClientForTests } from "../server/lib/gemini";
import { createApp } from "../server/app";
import { classifyChatIntent, detectRequestedDays, toGeminiContents } from "../server/routes/chat";
import {
  postProcessItinerary,
  matchVerifiedPlace,
  sanitizeBadge,
  __clearItineraryCacheForTests,
} from "../server/routes/itinerary";
import { __clearSuggestCacheForTests } from "../server/routes/suggest";
import { compactItineraryForPrompt } from "../server/prompts/chat";
import {
  sendChatMessage,
  clearChat,
  getChatState,
  buildHistory,
  __reloadChatForTests,
  CHAT_STORAGE_KEY,
  WELCOME_ID,
} from "../src/hooks/useChat";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

type Responder = (req: any) => unknown;

/** Client Gemini giả: không gọi mạng, ghi lại mọi request. */
function makeFakeGemini(responder: Responder) {
  const calls: any[] = [];
  const client = {
    models: {
      generateContent: vi.fn(async (req: any) => {
        calls.push(req);
        const out = responder(req);
        if (out instanceof Error) throw out;
        return { text: JSON.stringify(out) };
      }),
    },
  };
  __setGeminiClientForTests(client as any);
  return { client, calls };
}

function item(id: string, place_name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    time_slot: "08:00 - 09:30",
    time_period: "morning",
    place_name,
    category: "attraction",
    category_icon: "photo_camera",
    address_hint: "Đà Nẵng",
    recommended_dish_or_activity: "Tham quan",
    cost_vnd: 50000,
    social_trend: { is_viral: false, platform: "none", badge_label: "Đặc sản" },
    ui_card: { badge_color: "#E2A854", quick_description: `Mô tả ${place_name}` },
    ...extra,
  };
}

function makeItinerary(destination: string, days: number, perDay = 3) {
  return {
    meta: {
      destination,
      trip_duration: `${days}N${days - 1}Đ`,
      total_estimated_cost_vnd: 2_000_000,
      currency_symbol: "đ",
      theme_color: "#E2A854",
      summary: "Tóm tắt",
    },
    map_config: { recommended_zoom: 13, search_center_hint: destination },
    itinerary: Array.from({ length: days }, (_, d) => ({
      day_number: d + 1,
      day_title: `Ngày ${d + 1}`,
      schedule: Array.from({ length: perDay }, (_, i) =>
        item(`d${d + 1}_${i + 1}`, `Điểm ${d + 1}-${i + 1}`, {
          lat: 16.05 + i * 0.001,
          lng: 108.2 + i * 0.001,
          image_url: `https://img.example/${d + 1}-${i + 1}.jpg`,
        })
      ),
    })),
    budget_breakdown: { food_and_drink_vnd: 1, attractions_and_activities_vnd: 1, transport_and_others_vnd: 1 },
    local_insider_tips: [{ type: "culture", icon: "info", content: "Tip" }],
  };
}

/** Kiểm tra đúng hình dạng WanderItineraryData (src/types.ts). */
function expectValidItinerary(x: any) {
  expect(typeof x.meta.destination).toBe("string");
  expect(typeof x.meta.total_estimated_cost_vnd).toBe("number");
  expect(x.map_config).toBeTruthy();
  expect(Array.isArray(x.local_insider_tips)).toBe(true);
  expect(x.budget_breakdown).toBeTruthy();
  x.itinerary.forEach((d: any, di: number) => {
    expect(d.day_number).toBe(di + 1);
    expect(typeof d.day_title).toBe("string");
    for (const it of d.schedule) {
      for (const k of ["id", "time_slot", "time_period", "place_name", "category", "category_icon", "address_hint", "recommended_dish_or_activity"]) {
        expect(typeof it[k]).toBe("string");
      }
      expect(typeof it.cost_vnd).toBe("number");
      expect(typeof it.social_trend.is_viral).toBe("boolean");
      expect(typeof it.ui_card.quick_description).toBe("string");
      if (it.lat !== undefined) {
        expect(["verified", "geocoded", "ai_estimate"]).toContain(it.geo_source);
      } else {
        expect(it.geo_source).toBeUndefined();
      }
    }
  });
}

/** localStorage giả cho môi trường node. */
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

/* ------------------------------------------------------------------ */
/* Phân loại ý định                                                    */
/* ------------------------------------------------------------------ */

describe("classifyChatIntent", () => {
  it("yêu cầu lịch trình có điểm đến + thời lượng → new_itinerary", () => {
    expect(classifyChatIntent("Lịch trình Đà Lạt 3N2Đ")).toEqual({
      kind: "new_itinerary",
      destination: "Đà Lạt",
      requestedDays: 3,
    });
    expect(classifyChatIntent("lich trinh da nang 2 ngay").kind).toBe("new_itinerary");
    expect(classifyChatIntent("Lên kế hoạch đi Côn Đảo").destination).toBe("Côn Đảo");
    expect(classifyChatIntent("Đi Tây Ninh 2 ngày 1 đêm thì đi đâu?")).toMatchObject({
      kind: "new_itinerary",
      destination: "Tây Ninh",
      requestedDays: 2,
    });
  });

  it("câu hỏi thường / không nhận ra điểm đến → general", () => {
    expect(classifyChatIntent("Bánh mì ở đâu ngon?").kind).toBe("general");
    expect(classifyChatIntent("Du lịch Đà Lạt nên ăn gì?").kind).toBe("general");
    expect(classifyChatIntent("Lên lịch trình đi chơi 3 ngày giúp mình").kind).toBe("general");
    expect(classifyChatIntent("Phố đi bộ Nguyễn Huệ có gì?")).toMatchObject({ kind: "general", destination: null });
    expect(classifyChatIntent("Ăn gì khi đi chơi?").destination).toBeNull();
  });

  it("có lịch trình hiện tại: yêu cầu đổi → edit; đổi điểm đến → new", () => {
    const current = makeItinerary("Đà Lạt", 3);
    expect(classifyChatIntent("Đổi buổi tối ngày 2 thành chợ đêm", { currentItinerary: current }).kind).toBe(
      "edit_itinerary"
    );
    expect(classifyChatIntent("thêm 1 ngày nữa", { currentItinerary: current }).kind).toBe("edit_itinerary");
    expect(classifyChatIntent("doi ngay 3 sang di bien", { currentItinerary: current }).kind).toBe("edit_itinerary");
    expect(classifyChatIntent("Lịch trình Hà Nội 2N1Đ", { currentItinerary: current }).kind).toBe("new_itinerary");
    expect(classifyChatIntent("Mình thấy Đà Lạt đẹp quá", { currentItinerary: current }).kind).toBe("general");
  });

  it("detectRequestedDays", () => {
    expect(detectRequestedDays("4N3Đ")).toBe(4);
    expect(detectRequestedDays("đi cuối tuần")).toBe(2);
    expect(detectRequestedDays("đổi buổi tối ngày 2")).toBeNull();
  });

  it("toGeminiContents gộp lượt cùng vai trò để luôn xen kẽ", () => {
    const c = toGeminiContents(
      [
        { sender: "user", text: "a" },
        { sender: "user", text: "b" },
        { sender: "ai", text: "c" },
      ],
      "d"
    );
    expect(c.map((x) => x.role)).toEqual(["user", "model", "user"]);
    expect(c[0].parts[0].text).toContain("b");
  });
});

/* ------------------------------------------------------------------ */
/* Hậu xử lý toạ độ / số ngày                                          */
/* ------------------------------------------------------------------ */

describe("postProcessItinerary", () => {
  it("verified ghi đè toạ độ (khớp bỏ dấu), ai_estimate trong bbox, ngoài bbox bị xoá", () => {
    const raw = makeItinerary("Đà Nẵng", 1, 0);
    raw.itinerary[0].schedule = [
      item("a", "Cầu Rồng Đà Nẵng", { lat: 10, lng: 106 }), // AI sai toạ độ → lấy DB
      item("b", "Cau Rong Da Nang"), // không dấu
      item("c", "Quán lạ", { lat: "16.07", lng: 108.22 }), // chuỗi số, trong bbox
      item("d", "Quán Paris", { lat: 48.85, lng: 2.35 }), // ngoài VN
      item("e", "Quán không toạ độ"),
    ] as any;
    const { data } = postProcessItinerary(raw);
    const [a, b, c, d, e] = data.itinerary[0].schedule;
    expect(a.geo_source).toBe("verified");
    expect(a.lat).toBeCloseTo(16.0612, 2);
    expect(b.geo_source).toBe("verified");
    expect(c).toMatchObject({ lat: 16.07, lng: 108.22, geo_source: "ai_estimate" });
    expect(d.lat).toBeUndefined();
    expect(d.geo_source).toBeUndefined();
    expect(e.lat).toBeUndefined();
    expectValidItinerary(data);
  });

  it("không khớp verified khác thành phố", () => {
    expect(matchVerifiedPlace("Chợ Bến Thành", "Hà Nội", "Hoàn Kiếm, Hà Nội")).toBeNull();
    expect(matchVerifiedPlace("Chợ Bến Thành", "Sài Gòn")?.city).toBe("TP. Hồ Chí Minh");
    expect(matchVerifiedPlace("Chùa Cầu", "Hội An")?.city).toBe("Hội An");
  });

  it("thừa ngày → cắt bớt; thiếu ngày → giữ nguyên + báo mismatch", () => {
    const more = postProcessItinerary(makeItinerary("Đà Lạt", 4), { expectedDays: 3 });
    expect(more.data.itinerary).toHaveLength(3);
    expect(more.dayMismatch).toEqual({ expected: 3, got: 4 });

    const less = postProcessItinerary(makeItinerary("Đà Lạt", 2), { expectedDays: 3 });
    expect(less.data.itinerary).toHaveLength(2);
    expect(less.dayMismatch).toEqual({ expected: 3, got: 2 });
  });

  it("bỏ số liệu bịa khỏi badge", () => {
    expect(sanitizeBadge("🔥 Hot TikTok 1.8M views")).toBe("🔥 Hot TikTok");
    expect(sanitizeBadge("4.8★ • 2.450 đánh giá")).toBe("Nổi tiếng");
    expect(sanitizeBadge("Đặc sản địa phương")).toBe("Đặc sản địa phương");
  });

  it("compactItineraryForPrompt bỏ ui_card/social_trend/image_url", () => {
    const c = JSON.stringify(compactItineraryForPrompt(makeItinerary("Đà Nẵng", 2)));
    expect(c).not.toContain("ui_card");
    expect(c).not.toContain("social_trend");
    expect(c).not.toContain("image_url");
    expect(c).toContain("Điểm 2-3");
  });
});

/* ------------------------------------------------------------------ */
/* API với Gemini giả                                                  */
/* ------------------------------------------------------------------ */

describe("API AI (Gemini mock)", () => {
  let server: Server;
  let base = "";
  const savedKey = process.env.GEMINI_API_KEY;
  let ipCounter = 0;
  /** IP khác nhau mỗi request để không đụng rate limit 10/phút trong test. */
  const nextIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

  const post = (path: string, body: unknown) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": nextIp() },
      body: JSON.stringify(body),
    }).then((r) => r.json());

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = "test";
    server = createApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
    __setGeminiClientForTests(null);
    if (savedKey) process.env.GEMINI_API_KEY = savedKey;
    else delete process.env.GEMINI_API_KEY;
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test";
    __clearSuggestCacheForTests();
    __clearItineraryCacheForTests();
  });

  it("chat: câu hỏi thường → reply, không có itinerary", async () => {
    const { calls } = makeFakeGemini(() => ({ reply: "Bánh mì Phượng ở Hội An rất ngon 🥖", itinerary: null }));
    const j = await post("/api/chat", { message: "Bánh mì ở đâu ngon?", history: [] });
    expect(j).toMatchObject({ reply: expect.stringContaining("Bánh mì"), itinerary: null, source: "gemini" });
    expect(calls[0].contents).toEqual([{ role: "user", parts: [{ text: "Bánh mì ở đâu ngon?" }] }]);
  });

  it("chat: tạo lịch trình → đúng số ngày yêu cầu, toạ độ đã hậu xử lý", async () => {
    const fake = makeItinerary("Đà Nẵng", 3);
    fake.itinerary[0].schedule[0] = item("x", "Sun World Bà Nà Hills & Cầu Vàng", { lat: 1, lng: 1 }) as any;
    (fake.itinerary[1].schedule[0] as any).lat = 99; // ngoài bbox
    const { calls } = makeFakeGemini(() => ({ reply: "Đây là lịch trình", itinerary: fake }));
    const j = await post("/api/chat", { message: "Lịch trình Đà Nẵng 2N1Đ", history: [] });
    expect(j.source).toBe("gemini");
    expect(j.itinerary.itinerary).toHaveLength(2);
    expectValidItinerary(j.itinerary);
    expect(j.itinerary.itinerary[0].schedule[0].geo_source).toBe("verified");
    expect(j.itinerary.itinerary[0].schedule[1].geo_source).toBe("ai_estimate");
    expect(j.itinerary.itinerary[1].schedule[0].lat).toBeUndefined();
    expect(calls[0].config.systemInstruction).toContain("BẮT BUỘC đủ 2 ngày");
    expect(calls[0].config.systemInstruction).toContain("lat");
  });

  it("chat: sửa lịch trình → prompt chứa lịch trình rút gọn, trả bản đầy đủ đã sửa", async () => {
    const current = makeItinerary("Đà Nẵng", 2);
    const edited = structuredClone(current) as any;
    for (const d of edited.itinerary) for (const it of d.schedule) delete it.image_url; // model không thấy image_url
    edited.itinerary[1].schedule[2] = item("d2_new", "Chợ đêm Sơn Trà", {
      time_period: "evening",
      lat: 16.07,
      lng: 108.24,
    });
    const { calls } = makeFakeGemini(() => ({ reply: "Đã đổi buổi tối ngày 2 thành Chợ đêm Sơn Trà", itinerary: edited }));

    const j = await post("/api/chat", {
      message: "Đổi buổi tối ngày 2 thành chợ đêm",
      history: [
        { sender: "user", text: "Lịch trình Đà Nẵng 2N1Đ" },
        { sender: "ai", text: "Đây là lịch trình" },
      ],
      currentItinerary: current,
    });

    const sys: string = calls[0].config.systemInstruction;
    expect(sys).toContain("LỊCH TRÌNH HIỆN TẠI");
    expect(sys).toContain("Điểm 2-3");
    expect(sys).not.toContain("https://img.example");
    expect(sys).not.toContain("Mô tả Điểm");
    expect(calls[0].contents).toHaveLength(3);

    expect(j.source).toBe("gemini");
    expect(j.intent).toBe("edit_itinerary");
    expectValidItinerary(j.itinerary);
    expect(j.itinerary.itinerary).toHaveLength(2);
    expect(j.itinerary.itinerary[1].schedule[2].place_name).toBe("Chợ đêm Sơn Trà");
    // Phần không đổi được giữ nguyên + khôi phục image_url
    expect(j.itinerary.itinerary[0].schedule[0]).toMatchObject({
      id: "d1_1",
      place_name: "Điểm 1-1",
      image_url: "https://img.example/1-1.jpg",
    });
  });

  it("chat: Gemini 429 → RATE_LIMITED; yêu cầu lịch trình ra mẫu gắn nhãn sample", async () => {
    makeFakeGemini(() => new GenAiApiError({ message: "Resource exhausted", status: 429 }));
    const a = await post("/api/chat", { message: "Lịch trình Đà Lạt 3N2Đ" });
    expect(a).toMatchObject({ source: "sample", errorCode: "RATE_LIMITED" });
    expect(a.itinerary.itinerary).toHaveLength(3);
    expect(a.reply).toContain("mẫu");
    expectValidItinerary(a.itinerary);
    // lịch trình mẫu cũng không được mang số view bịa
    expect(JSON.stringify(a.itinerary)).not.toMatch(/\d(\.\d)?M views/);

    const b = await post("/api/chat", { message: "Bánh mì ở đâu ngon?" });
    expect(b).toMatchObject({ source: "error", errorCode: "RATE_LIMITED", itinerary: null });

    const c = await post("/api/chat", {
      message: "Đổi buổi tối ngày 2 thành chợ đêm",
      currentItinerary: makeItinerary("Đà Lạt", 3),
    });
    expect(c).toMatchObject({ source: "error", itinerary: null, intent: "edit_itinerary" });
  });

  it("generate-itinerary: thừa ngày bị cắt, toạ độ hậu xử lý, có cache", async () => {
    const { client } = makeFakeGemini(() => makeItinerary("Đà Lạt", 4));
    const body = { destination: "Đà Lạt", duration: "3N2Đ" };
    const j = await post("/api/generate-itinerary", body);
    expect(j.source).toBe("gemini");
    expect(j.data.itinerary).toHaveLength(3);
    expectValidItinerary(j.data);
    const again = await post("/api/generate-itinerary", body);
    expect(again.source).toBe("cache");
    expect(client.models.generateContent).toHaveBeenCalledTimes(1);
  });

  /* ---------------------------- useChat store ---------------------------- */

  it("useChat: 3 lượt liên tiếp → lượt 3 nhận đủ history + currentItinerary; reload vẫn còn chat", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const realFetch = globalThis.fetch;
    const ip = nextIp();
    vi.stubGlobal("fetch", (url: string, init: any) =>
      realFetch(url.startsWith("/") ? base + url : url, { ...init, headers: { ...init?.headers, "X-Forwarded-For": ip } })
    );
    __reloadChatForTests();
    clearChat();

    let turn = 0;
    const { calls } = makeFakeGemini(() => {
      turn++;
      if (turn === 2) return { reply: "Lịch trình 2 ngày đây", itinerary: makeItinerary("Đà Nẵng", 2) };
      return { reply: `Trả lời ${turn}`, itinerary: null };
    });

    await sendChatMessage("Mình muốn đi Đà Nẵng");
    await sendChatMessage("Lên lịch trình 2 ngày nhé");
    await sendChatMessage("Đổi buổi tối ngày 2 thành chợ đêm");

    expect(calls).toHaveLength(3);
    expect(calls[2].contents.map((c: any) => c.role)).toEqual(["user", "model", "user", "model", "user"]);
    expect(calls[2].contents.map((c: any) => c.parts[0].text)).toEqual([
      "Mình muốn đi Đà Nẵng",
      "Trả lời 1",
      "Lên lịch trình 2 ngày nhé",
      "Lịch trình 2 ngày đây",
      "Đổi buổi tối ngày 2 thành chợ đêm",
    ]);
    expect(calls[2].config.systemInstruction).toContain("LỊCH TRÌNH HIỆN TẠI");
    expect(calls[0].config.systemInstruction).not.toContain("LỊCH TRÌNH HIỆN TẠI");

    // "Chuyển tab": state nạp lại từ localStorage
    const saved = JSON.parse(storage.getItem(CHAT_STORAGE_KEY)!);
    expect(saved.messages).toHaveLength(7); // chào + 3 user + 3 ai
    expect(saved.messages[4].itineraryData.meta.destination).toBe("Đà Nẵng");
    __reloadChatForTests();
    expect(getChatState().messages.map((m) => m.text)).toEqual(saved.messages.map((m: any) => m.text));
    expect(buildHistory(getChatState().messages).some((m) => m.text.includes("Bạn có thể hỏi tôi"))).toBe(false);

    clearChat();
    expect(getChatState().messages).toHaveLength(1);
    expect(getChatState().messages[0].id).toBe(WELCOME_ID);
    vi.stubGlobal("fetch", realFetch);
  });

  it("useChat: giới hạn 50 tin, bỏ tin lỗi khỏi history", async () => {
    const storage = new MemoryStorage();
    const many = Array.from({ length: 70 }, (_, i) => ({
      id: `m${i}`,
      sender: i % 2 ? "ai" : "user",
      text: `t${i}`,
      timestamp: "10:00",
      ...(i === 69 ? { isError: true } : {}),
    }));
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ version: 1, messages: many }));
    vi.stubGlobal("localStorage", storage);
    __reloadChatForTests();
    const h = buildHistory(getChatState().messages);
    expect(h).toHaveLength(10);
    expect(h.at(-1)!.text).toBe("t68");
    clearChat();
    expect(JSON.parse(storage.getItem(CHAT_STORAGE_KEY)!).messages).toHaveLength(1);

    storage.setItem(CHAT_STORAGE_KEY, "{hỏng");
    __reloadChatForTests();
    expect(getChatState().messages[0].id).toBe(WELCOME_ID);
  });

  /* ---------------------------- suggest ---------------------------- */

  it("suggest: đủ 4 địa điểm verified → không gọi Gemini, không có số view", async () => {
    const { client } = makeFakeGemini(() => ({ suggestions: [] }));
    const j = await post("/api/suggest", { destination: "Đà Nẵng", dayIndex: 0, existingPlaces: ["Cầu Rồng Đà Nẵng"] });
    expect(j.source).toBe("verified");
    expect(j.data).toHaveLength(4);
    expect(client.models.generateContent).not.toHaveBeenCalled();
    for (const s of j.data) {
      expect(s.geo_source).toBe("verified");
      expect(s.place_name).not.toContain("Cầu Rồng");
      expect(s.social_trend.badge_label).not.toMatch(/views/i);
    }
    // ngày khác → bộ gợi ý khác
    const d1 = await post("/api/suggest", { destination: "Đà Nẵng", dayIndex: 1, existingPlaces: [] });
    expect(d1.data[0].id).not.toBe(j.data[0].id);
  });

  it("suggest: thiếu verified → gọi Gemini bổ sung, lọc trùng, cache", async () => {
    const { client, calls } = makeFakeGemini(() => ({
      suggestions: [
        item("1", "Bánh Mì Phượng Hội An"), // trùng existing
        item("2", "Chùa Cầu"), // trùng verified
        item("3", "Rừng dừa Bảy Mẫu", { lat: 15.86, lng: 108.37 }),
        item("4", "Cơm gà Bà Buội", { lat: 15.88, lng: 108.33 }),
        item("5", "Cao lầu Thanh", { lat: 50, lng: 50 }),
      ],
    }));
    const body = { destination: "Hội An", dayIndex: 0, existingPlaces: ["Bánh Mì Phượng Hội An"] };
    const j = await post("/api/suggest", body);
    expect(j.source).toBe("gemini");
    expect(j.data).toHaveLength(4);
    const names = j.data.map((s: any) => s.place_name);
    expect(names).toContain("Rừng dừa Bảy Mẫu");
    expect(names.filter((n: string) => /Chùa Cầu/.test(n))).toHaveLength(1);
    expect(names).not.toContain("Bánh Mì Phượng Hội An");
    expect(j.data.find((s: any) => s.place_name === "Rừng dừa Bảy Mẫu").geo_source).toBe("ai_estimate");
    expect(calls[0].contents).toContain("Bánh Mì Phượng Hội An");

    const again = await post("/api/suggest", { ...body, existingPlaces: ["  bánh mì phượng hội an "] });
    expect(again.source).toBe("cache");
    expect(client.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it("suggest: không có key → chỉ verified (có thể < 4 hoặc 0)", async () => {
    delete process.env.GEMINI_API_KEY;
    const { client } = makeFakeGemini(() => ({ suggestions: [] }));
    const hoiAn = await post("/api/suggest", { destination: "Hội An", dayIndex: 0, existingPlaces: [] });
    expect(hoiAn.source).toBe("verified");
    expect(hoiAn.data).toHaveLength(2);
    expect(hoiAn.message).toBeTruthy();
    const conDao = await post("/api/suggest", { destination: "Côn Đảo", dayIndex: 0, existingPlaces: [] });
    expect(conDao.data).toEqual([]);
    expect(client.models.generateContent).not.toHaveBeenCalled();
  });
});
