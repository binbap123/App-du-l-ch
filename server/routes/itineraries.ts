import { Router } from "express";
import fs from "fs";
import path from "path";
import { limits } from "../lib/rateLimit.js";
import { sendError } from "../lib/http.js";

/**
 * @deprecated D1 = localStorage. Agent Data chuyển App sang src/lib/tripStore.ts rồi XÓA file này
 * (cùng dòng mount trong server/app.ts). Giữ tạm để Phase 0 không đổi hành vi.
 */

const DB_FILE = path.join(process.cwd(), "db.json");

function readDb(): any[] {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf-8") || "{}");
    return Array.isArray(parsed) ? parsed : parsed.itineraries || [];
  } catch {
    return [];
  }
}

function writeDb(list: any[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ itineraries: list }, null, 2), "utf-8");
}

export const itinerariesRouter = Router();

itinerariesRouter.get("/api/itineraries", limits.read, (_req, res) => {
  res.json({ success: true, data: readDb() });
});

itinerariesRouter.post("/api/itineraries", limits.read, (req, res) => {
  const itinerary = req.body;
  if (!itinerary || typeof itinerary !== "object" || !itinerary.meta || !Array.isArray(itinerary.itinerary)) {
    return sendError(res, 400, "INVALID_INPUT", "Lịch trình không hợp lệ");
  }
  try {
    if (!itinerary.id) itinerary.id = `trip_${Date.now()}`;
    const list = readDb();
    const idx = list.findIndex((i) => i.id === itinerary.id);
    if (idx >= 0) list[idx] = itinerary;
    else list.push(itinerary);
    writeDb(list);
    res.json({ success: true, data: itinerary, allItineraries: list });
  } catch (err: any) {
    sendError(res, 500, "STORAGE_ERROR", err.message);
  }
});

itinerariesRouter.delete("/api/itineraries/:id", limits.read, (req, res) => {
  try {
    const list = readDb().filter((i) => i.id !== req.params.id);
    writeDb(list);
    res.json({ success: true, allItineraries: list });
  } catch (err: any) {
    sendError(res, 500, "STORAGE_ERROR", err.message);
  }
});
