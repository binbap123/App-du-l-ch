import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { TTLCache, normalizeKey } from "../server/lib/cache";
import { parseModelJson, GeminiError } from "../server/lib/gemini";
import { toGeminiContents, looksLikeItineraryRequest } from "../server/routes/chat";
import { looksLikeItinerary } from "../server/schemas/itinerary";
import { createApp } from "../server/app";

describe("TTLCache", () => {
  it("trả giá trị trong TTL và hết hạn sau TTL", async () => {
    const c = new TTLCache<number>(10, 20);
    c.set("a", 1);
    expect(c.get("a")).toBe(1);
    await new Promise((r) => setTimeout(r, 30));
    expect(c.get("a")).toBeUndefined();
  });

  it("đẩy phần tử cũ nhất khi vượt maxEntries (LRU)", () => {
    const c = new TTLCache<number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // a mới dùng → b là cũ nhất
    c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
    expect(c.get("c")).toBe(3);
  });

  it("normalizeKey bỏ dấu, viết thường, gộp khoảng trắng", () => {
    expect(normalizeKey("  Đà   Lạt ", 3)).toBe(normalizeKey("da lat", "3"));
  });
});

describe("gemini helpers", () => {
  it("parseModelJson bỏ markdown fence", () => {
    expect(parseModelJson<{ a: number }>("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });
  it("parseModelJson ném BAD_RESPONSE khi JSON hỏng", () => {
    try {
      parseModelJson("not json");
      throw new Error("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(GeminiError);
      expect((e as GeminiError).code).toBe("BAD_RESPONSE");
    }
  });
});

describe("chat helpers", () => {
  it("toGeminiContents bỏ lời chào AI ở đầu và giữ tối đa 10 lượt", () => {
    const history = [
      { sender: "ai" as const, text: "Xin chào" },
      ...Array.from({ length: 14 }, (_, i) => ({ sender: (i % 2 ? "ai" : "user") as "ai" | "user", text: `m${i}` })),
    ];
    const contents = toGeminiContents(history, "câu mới");
    expect(contents[0].role).toBe("user");
    expect(contents.length).toBeLessThanOrEqual(11);
    expect(contents.at(-1)).toEqual({ role: "user", parts: [{ text: "câu mới" }] });
  });

  it("looksLikeItineraryRequest", () => {
    expect(looksLikeItineraryRequest("Lên lịch trình Đà Lạt 3N2Đ")).toBe(true);
    expect(looksLikeItineraryRequest("Bánh mì ở đâu ngon?")).toBe(false);
  });

  it("looksLikeItinerary từ chối dữ liệu thiếu", () => {
    expect(looksLikeItinerary(null)).toBe(false);
    expect(looksLikeItinerary({ meta: { destination: "X" }, itinerary: [] })).toBe(false);
    expect(looksLikeItinerary({ meta: { destination: "X" }, itinerary: [{ schedule: [] }] })).toBe(true);
  });
});

describe("API (không có GEMINI_API_KEY)", () => {
  let server: Server;
  let base = "";
  const saved = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.SERPAPI_API_KEY;
    server = createApp().listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.close();
    if (saved) process.env.GEMINI_API_KEY = saved;
  });

  const post = (path: string, body: unknown) =>
    fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("GET /api/health", async () => {
    const r = await fetch(base + "/api/health");
    const j = await r.json();
    expect(j.status).toBe("ok");
    expect(j.geminiAvailable).toBe(false);
  });

  it("API không tồn tại → 404 JSON", async () => {
    const r = await fetch(base + "/api/khong-co");
    expect(r.status).toBe(404);
    expect((await r.json()).error.code).toBe("NOT_FOUND");
  });

  it("chat: tin nhắn rỗng → 400 INVALID_INPUT", async () => {
    const r = await post("/api/chat", { message: "   " });
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe("INVALID_INPUT");
  });

  it("chat: tin nhắn quá dài → 400", async () => {
    const r = await post("/api/chat", { message: "a".repeat(501) });
    expect(r.status).toBe(400);
  });

  it("chat: hỏi lịch trình khi không có key → lịch trình mẫu, gắn nhãn sample", async () => {
    const r = await post("/api/chat", { message: "Lịch trình Đà Lạt 3N2Đ" });
    const j = await r.json();
    expect(j.source).toBe("sample");
    expect(j.itinerary.itinerary.length).toBe(3);
    expect(j.reply).toContain("mẫu");
  });

  it("chat: câu hỏi thường khi không có key → KHÔNG trả lịch trình", async () => {
    const r = await post("/api/chat", { message: "Bánh mì ở đâu ngon?" });
    const j = await r.json();
    expect(j.itinerary).toBeNull();
    expect(j.source).toBe("error");
  });

  it("generate-itinerary không có key → sample đúng số ngày", async () => {
    const r = await post("/api/generate-itinerary", { destination: "Hội An", duration: "2N1Đ" });
    const j = await r.json();
    expect(j.source).toBe("sample");
    expect(j.data.itinerary.length).toBe(2);
  });

  it("body > 100kb → 413 JSON", async () => {
    const r = await post("/api/chat", { message: "hi", history: [{ sender: "user", text: "x".repeat(120_000) }] });
    expect(r.status).toBe(413);
    expect((await r.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("places search không có SerpApi key → dữ liệu nội bộ", async () => {
    const r = await post("/api/places/search", { query: "", city: "Đà Nẵng", category: "" });
    const j = await r.json();
    expect(j.source).toBe("database");
    expect(j.data.length).toBeGreaterThan(0);
  });
});
