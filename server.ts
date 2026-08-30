import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import { getSampleItinerary, parseDurationDays, extractDestinationFromText } from "./src/data/sampleItineraries.js";
import { searchLocalPlaces, VERIFIED_VIETNAM_PLACES, PlaceSearchResult } from "./src/data/placesData.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;
const DB_FILE = path.join(__dirname, "db.json");

// Helper to read database
function readDb(): any[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultList = [
        getSampleItinerary("Đà Nẵng", "3N2Đ") as any,
        getSampleItinerary("Phú Quốc", "3N2Đ") as any
      ];
      defaultList[0].id = "trip_danang";
      defaultList[1].id = "trip_phuquoc";
      fs.writeFileSync(DB_FILE, JSON.stringify({ itineraries: defaultList, trending_spots: [] }, null, 2), "utf-8");
      return defaultList;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data || "{}");
    if (Array.isArray(parsed)) return parsed;
    return parsed.itineraries || [];
  } catch (err) {
    console.error("Lỗi khi đọc file db.json:", err);
    return [];
  }
}

// Helper to write database
function writeDb(data: any[]) {
  try {
    let existing: any = { itineraries: [], trending_spots: [] };
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const tmp = JSON.parse(raw || "{}");
      if (Array.isArray(tmp)) {
        existing = { itineraries: tmp, trending_spots: [] };
      } else {
        existing = tmp;
      }
    }
    existing.itineraries = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(existing, null, 2), "utf-8");
  } catch (err) {
    console.error("Lỗi khi ghi file db.json:", err);
  }
}

// Shared Gemini AI instance helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const WANDER_SYSTEM_INSTRUCTION = `You are "WanderAI" - an expert, full-stack travel intelligence engine powering a smart travel mobile application. 
Your primary function is to generate highly personalized travel itineraries, authentic local food specialty suggestions, and viral/social-trending spots (TikTok, Threads, Facebook) that seamlessly serve both Backend routing logic and Frontend UI rendering.

=========================================
1. OPERATIONAL & BEHAVIORAL RULES
=========================================
- ALWAYS respond in strict JSON format matching the schema provided below. DO NOT enclose the JSON in markdown blocks (no \`\`\`json ... \`\`\`) and do not write any introductory or concluding prose.
- MULTI-DAY ITINERARY REQUIREMENT (CRITICAL):
  - You MUST generate the exact number of days matching the duration parameter in the request (e.g. '3N2Đ' or '3 ngày' = EXACTLY 3 days in the itinerary array: Day 1, Day 2, Day 3; '2N1Đ' = 2 days; '4N3Đ' = 4 days; '5N4Đ' = 5 days).
  - NEVER return only 1 day when the requested duration is 2 or more days!
  - Each day MUST contain 3 to 4 distinct items across morning, afternoon, evening, and night.
- FRONTEND READY: Output UI layout hints, color codes, category icons, and social badges so the client can directly render native cards, timelines, and maps.
- BACKEND & MAP COMPATIBLE: Include normalized location keys, precise category tags, address hints, and budget metrics in Vietnamese Dong (VND).
- LOCAL & TRENDING FOCUS: Prioritize authentic regional food specialties and currently viral spots on TikTok, Threads, and Facebook. Group nearby places logically by geographic proximity to minimize travel time.
- ALL display strings MUST be in natural, engaging, vibrant Vietnamese (Tiếng Việt).`;

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", geminiAvailable: !!process.env.GEMINI_API_KEY });
});

// API endpoint for generating WanderAI structured itinerary
app.post("/api/generate-itinerary", async (req, res) => {
  try {
    const { destination, duration, preferences, budget } = req.body;
    const targetDuration = duration || "3N2Đ";
    const targetDays = parseDurationDays(targetDuration);
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: "Key API Gemini chưa được cấu hình. Sử dụng dữ liệu mẫu thông minh.",
        data: getSampleItinerary(destination || "Đà Nẵng", targetDuration)
      });
    }

    const promptText = `Tạo lịch trình du lịch thông minh WanderAI cho điểm đến: ${destination || "Đà Nẵng"}, thời gian: ${targetDuration} (YÊU CẦU BẮT BUỘC: Tạo đủ ${targetDays} ngày trong mảng itinerary, từ day_number 1 đến day_number ${targetDays}). 
Sở thích / yêu cầu đặc biệt: ${preferences || "Săn đặc sản ẩm thực địa phương, điểm check-in HOT TikTok / Threads, thiên nhiên thư giãn"}.
Ngân sách dự kiến: ${budget || "3.000.000 đ"}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: promptText,
      config: {
        systemInstruction: WANDER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meta: {
              type: Type.OBJECT,
              properties: {
                destination: { type: Type.STRING },
                trip_duration: { type: Type.STRING },
                total_estimated_cost_vnd: { type: Type.NUMBER },
                currency_symbol: { type: Type.STRING },
                theme_color: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
              required: ["destination", "trip_duration", "total_estimated_cost_vnd", "currency_symbol", "theme_color", "summary"]
            },
            map_config: {
              type: Type.OBJECT,
              properties: {
                recommended_zoom: { type: Type.NUMBER },
                search_center_hint: { type: Type.STRING },
              },
              required: ["recommended_zoom", "search_center_hint"]
            },
            itinerary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day_number: { type: Type.NUMBER },
                  day_title: { type: Type.STRING },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        time_slot: { type: Type.STRING },
                        time_period: { type: Type.STRING },
                        place_name: { type: Type.STRING },
                        category: { type: Type.STRING },
                        category_icon: { type: Type.STRING },
                        address_hint: { type: Type.STRING },
                        recommended_dish_or_activity: { type: Type.STRING },
                        cost_vnd: { type: Type.NUMBER },
                        social_trend: {
                          type: Type.OBJECT,
                          properties: {
                            is_viral: { type: Type.BOOLEAN },
                            platform: { type: Type.STRING },
                            badge_label: { type: Type.STRING },
                            sentiment_score: { type: Type.NUMBER },
                          },
                          required: ["is_viral", "platform", "badge_label"]
                        },
                        ui_card: {
                          type: Type.OBJECT,
                          properties: {
                            badge_color: { type: Type.STRING },
                            quick_description: { type: Type.STRING },
                          },
                          required: ["badge_color", "quick_description"]
                        }
                      },
                      required: ["id", "time_slot", "time_period", "place_name", "category", "category_icon", "address_hint", "recommended_dish_or_activity", "cost_vnd", "social_trend", "ui_card"]
                    }
                  }
                },
                required: ["day_number", "day_title", "schedule"]
              }
            },
            budget_breakdown: {
              type: Type.OBJECT,
              properties: {
                food_and_drink_vnd: { type: Type.NUMBER },
                attractions_and_activities_vnd: { type: Type.NUMBER },
                transport_and_others_vnd: { type: Type.NUMBER },
              },
              required: ["food_and_drink_vnd", "attractions_and_activities_vnd", "transport_and_others_vnd"]
            },
            local_insider_tips: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["type", "icon", "content"]
              }
            }
          },
          required: ["meta", "map_config", "itinerary", "budget_breakdown", "local_insider_tips"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(200).json({
      fallback: true,
      error: error.message,
      data: getSampleItinerary(req.body.destination || "Đà Nẵng", req.body.duration || "3N2Đ")
    });
  }
});

// Get all itineraries from database
app.get("/api/itineraries", (_req, res) => {
  const list = readDb();
  res.json({ success: true, data: list });
});

// Add or update an itinerary in database
app.post("/api/itineraries", (req, res) => {
  try {
    const itinerary = req.body;
    if (!itinerary.id) {
      itinerary.id = `trip_${Date.now()}`;
    }
    const list = readDb();
    const existingIndex = list.findIndex((item) => item.id === itinerary.id);
    if (existingIndex >= 0) {
      list[existingIndex] = itinerary;
    } else {
      list.push(itinerary);
    }
    writeDb(list);
    res.json({ success: true, data: itinerary, allItineraries: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete an itinerary from database
app.delete("/api/itineraries/:id", (req, res) => {
  try {
    const { id } = req.params;
    const list = readDb();
    const filteredList = list.filter((item) => item.id !== id);
    writeDb(filteredList);
    res.json({ success: true, message: "Đã xóa lịch trình thành công", allItineraries: filteredList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── TRENDING SPOTS API ───────────────────────────────────────────────────────

const FALLBACK_TRENDING: any[] = [
  {
    id: "trend_1", name: "Bánh mì Phượng Hội An", city: "Hội An",
    platform: "tiktok", badge_label: "48M views TikTok", views: "48M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    category: "food", description: "Ổ bánh mì nhân thập cẩm huyền thoại được du khách trong nước và quốc tế yêu thích"
  },
  {
    id: "trend_2", name: "Hang Múa Ninh Bình", city: "Ninh Bình",
    platform: "threads", badge_label: "Trending Threads", views: "8.2M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-",
    category: "attraction", description: "Leo 486 bậc đá ngắm toàn cảnh sông Ngô Đồng và mùa lúa Tam Cốc đẹp mê hồn"
  },
  {
    id: "trend_3", name: "Eo Gió Quy Nhơn", city: "Quy Nhơn",
    platform: "facebook", badge_label: "Facebook Reels HOT", views: "12M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    category: "nature", description: "Vách đá ven biển gió lộng với con đường dạo bộ ôm sát biển cực kỳ ấn tượng"
  },
  {
    id: "trend_4", name: "Chợ nổi Cái Răng", city: "Cần Thơ",
    platform: "tiktok", badge_label: "TikTok Du lịch VN", views: "22M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
    category: "attraction", description: "Chợ nổi sông nước miền Tây độc đáo họp từ tờ mờ sáng với món hủ tiếu ghe trứ danh"
  },
  {
    id: "trend_5", name: "Sunset Sanato Phú Quốc", city: "Phú Quốc",
    platform: "threads", badge_label: "Viral Threads 2025", views: "15M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV",
    category: "cafe", description: "Bar bãi biển đón hoàng hôn lãng mạn bậc nhất đảo ngọc Phú Quốc"
  },
  {
    id: "trend_6", name: "Bún bò Huế Mụ Rơi", city: "Huế",
    platform: "facebook", badge_label: "Facebook Top Food", views: "5.8M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui",
    category: "food", description: "Quán bún bò gia truyền 30 năm cay nồng thơm mùi sả ruốc chuẩn vị cố đô"
  },
];

function readTrending(): any[] {
  try {
    if (!fs.existsSync(DB_FILE)) return FALLBACK_TRENDING;
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    if (Array.isArray(parsed)) return FALLBACK_TRENDING;
    return parsed.trending_spots && parsed.trending_spots.length > 0 ? parsed.trending_spots : FALLBACK_TRENDING;
  } catch {
    return FALLBACK_TRENDING;
  }
}

function writeTrending(spots: any[]) {
  try {
    let parsed: any = {};
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const tmp = JSON.parse(raw || "{}");
      if (Array.isArray(tmp)) {
        parsed = { itineraries: tmp, trending_spots: spots };
      } else {
        parsed = { ...tmp, trending_spots: spots };
      }
    } else {
      parsed = { itineraries: [], trending_spots: spots };
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
  } catch (err) {
    console.error("Lỗi khi ghi trending spots:", err);
  }
}

app.get("/api/trending-spots", (_req, res) => {
  res.json({ success: true, data: readTrending() });
});

// ─── GOOGLE MAPS STYLE PLACES SEARCH API ──────────────────────────────────────

// Fast search & filter endpoint
app.get("/api/places/search", (req, res) => {
  const { q = "", city = "", category = "" } = req.query;
  const results = searchLocalPlaces(String(q), String(city), String(category));
  res.json({ success: true, data: results });
});

// Rich Google Maps Places Search powered by database & Gemini intelligence
app.post("/api/places/search", async (req, res) => {
  try {
    const { query = "", city = "", category = "" } = req.body;
    const localResults = searchLocalPlaces(query, city, category);

    // If we have strong local results or no API key, return them directly
    const ai = getGeminiClient();
    if (!ai || (!query && localResults.length > 0)) {
      return res.json({ success: true, data: localResults, source: "database" });
    }

    // If query is provided, let Gemini enhance & discover real Google Maps places with exact location format
    const prompt = `Bạn là công cụ tìm kiếm địa điểm thông minh Google Maps Places API tại Việt Nam.
Tìm kiếm các địa điểm du lịch, quán ăn đặc sản, quán cà phê, khách sạn, hoặc điểm check-in phù hợp nhất theo yêu cầu sau:
- Từ khóa tìm kiếm: "${query}"
- Thành phố / Khu vực: "${city || "Việt Nam"}"
- Thể loại: "${category || "tất cả"}"

YÊU CẦU:
1. Trả về từ 4 đến 8 địa điểm THỰC TẾ và CHÍNH XÁC tại Việt Nam.
2. Cung cấp địa chỉ chi tiết, đánh giá sao thực tế (từ 4.3 đến 4.9), số lượt đánh giá, ước tính chi phí (VND), món nổi bật, giờ mở cửa.
3. Trả về ĐÚNG định dạng JSON array sau (KHÔNG CÓ MARKDOWN):
[
  {
    "id": "gmap_unique_id",
    "name": "Tên địa điểm cụ thể",
    "category": "food_specialty" | "cafe" | "attraction" | "accommodation" | "nightlife" | "shopping",
    "category_label": "Nhãn loại (ví dụ: Quán Ăn Đặc Sản, Cà Phê Check-in, Điểm Tham Quan...)",
    "category_icon": "restaurant" | "local_cafe" | "photo_camera" | "hotel" | "celebration" | "shopping_bag",
    "address": "Số nhà, Tên đường, Quận/Huyện, Tỉnh/Thành phố",
    "city": "${city || "Việt Nam"}",
    "rating": 4.8,
    "user_ratings_total": 1450,
    "price_level_text": "35.000đ - 80.000đ",
    "cost_vnd": 65000,
    "opening_hours_text": "Đang mở cửa • 08:00 - 22:00",
    "open_now": true,
    "recommended_dish_or_activity": "Món ăn hoặc hoạt động trải nghiệm đặc trưng tại đây",
    "photo_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    "social_trend": {
      "is_viral": true,
      "platform": "tiktok",
      "badge_label": "Hot TikTok Check-in"
    },
    "google_maps_url": "https://www.google.com/maps/search/?api=1&query=Ten+Dia+Diem",
    "quick_description": "Mô tả ngắn gọn đặc sắc 1 câu"
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let raw = response.text?.trim() || "[]";
    if (raw.startsWith("```")) raw = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

    const aiPlaces: PlaceSearchResult[] = JSON.parse(raw);

    // Merge: Put exact local matches first if any, then AI discovered places
    const combined = [...localResults];
    for (const ap of aiPlaces) {
      if (!combined.some(c => c.name.toLowerCase() === ap.name.toLowerCase())) {
        if (!ap.photo_url) {
          ap.photo_url = "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf";
        }
        if (!ap.google_maps_url) {
          ap.google_maps_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ap.name + " " + (ap.address || ""))}`;
        }
        combined.push(ap);
      }
    }

    return res.json({ success: true, data: combined, source: "gemini_google_places" });
  } catch (err: any) {
    console.error("Google Places Search API error:", err);
    const local = searchLocalPlaces(req.body?.query, req.body?.city, req.body?.category);
    return res.json({ success: true, data: local, source: "database_fallback" });
  }
});

app.post("/api/trending-spots/refresh", async (_req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    writeTrending(FALLBACK_TRENDING);
    return res.json({ success: true, data: FALLBACK_TRENDING, source: "fallback" });
  }
  try {
    const prompt = `Bạn là chuyên gia du lịch Việt Nam. Hãy tổng hợp 6 địa điểm du lịch Việt Nam đang được lan truyền mạnh nhất trên các nền tảng mạng xã hội TikTok, Threads, Facebook trong tháng này.

Trả về JSON array với cấu trúc sau (KHÔNG có markdown, chỉ raw JSON):
[
  {
    "id": "trend_X",
    "name": "Tên địa điểm/quán ăn cụ thể",
    "city": "Thành phố/tỉnh",
    "platform": "tiktok" | "threads" | "facebook",
    "badge_label": "Mô tả trend ngắn gọn (ví dụ: 45M views TikTok)",
    "views": "Con số lượt xem dạng chuỗi (ví dụ: 45M)",
    "imageUrl": "",
    "category": "food" | "attraction" | "cafe" | "nature",
    "description": "Mô tả ngắn tại sao địa điểm này đang hot (1 câu)",
    "savedAt": "${new Date().toISOString()}"
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let raw = response.text?.trim() || "[]";
    if (raw.startsWith("```")) raw = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

    const spots = JSON.parse(raw);
    writeTrending(spots);
    return res.json({ success: true, data: spots, source: "gemini" });
  } catch (err: any) {
    console.error("Trending AI error:", err);
    writeTrending(FALLBACK_TRENDING);
    return res.json({ success: true, data: FALLBACK_TRENDING, source: "fallback" });
  }
});

// AI Chat assistant endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    const ai = getGeminiClient();

    const WANDER_CHAT_SYSTEM_INSTRUCTION = `Bạn là "WanderAI" - trợ lý du lịch AI thông minh tiếng Việt năng động, am hiểu sâu sắc về du lịch Việt Nam, các món ăn đặc sản vùng miền, điểm check-in HOT Threads/TikTok, gợi ý lịch trình tối ưu chi phí và quãng đường di chuyển.

Bạn phải trả lời người dùng dưới dạng một đối tượng JSON có cấu trúc như sau:
{
  "reply": "Chuỗi văn bản trò chuyện bằng tiếng Việt thân thiện, tự nhiên, có cấu trúc rõ ràng kèm các icon thích hợp. Trả lời trực tiếp câu hỏi của người dùng.",
  "itinerary": null hoặc Đối tượng lịch trình du lịch thông minh WanderAI (nếu người dùng yêu cầu tạo, lên kế hoạch, lập lịch trình, gợi ý lịch trình chi tiết cho một chuyến đi cụ thể).
}

QUAN TRỌNG VỀ SỐ LƯỢNG NGÀY TRONG LỊCH TRÌNH:
- Nếu người dùng yêu cầu chuyến đi 3N2Đ (3 ngày 2 đêm), 2N1Đ, 4N3Đ hoặc bất kỳ khoảng thời gian nào: Mảng "itinerary" PHẢI CÓ ĐỦ SỐ LƯỢNG NGÀY tương ứng (ví dụ: 3N2Đ thì mảng itinerary PHẢI CÓ ĐỦ 3 phần tử: day_number: 1, day_number: 2, day_number: 3).
- Tuyệt đối KHÔNG ĐƯỢC chỉ trả về 1 ngày khi người dùng yêu cầu 3 ngày hoặc 3N2Đ.
- Mỗi ngày trong lịch trình phải có 3-4 hoạt động phong phú trải dài từ sáng, trưa, chiều đến tối.

Schema của đối tượng lịch trình:
- meta: destination (tên địa điểm du lịch), trip_duration (ví dụ: "3N2Đ"), total_estimated_cost_vnd (số tiền ước tính dạng số), currency_symbol ("đ"), theme_color ("#E2A854"), summary (tóm tắt chuyến đi bằng tiếng Việt).
- map_config: recommended_zoom (số), search_center_hint (tên địa danh làm trung tâm bản đồ).
- itinerary: mảng các ngày du lịch, mỗi ngày gồm:
  - day_number: số ngày (1, 2, 3...)
  - day_title: tiêu đề ngày (ví dụ: "Ngày 1 - Check-in và ẩm thực phố cổ")
  - schedule: mảng các địa điểm/hoạt động trong ngày, mỗi địa điểm gồm:
    - id: chuỗi id duy nhất (ví dụ: "sug_1", "sug_2")
    - time_slot: khung giờ (ví dụ: "08:00 - 09:30")
    - time_period: "morning", "afternoon", "evening", hoặc "night"
    - place_name: tên địa điểm cụ thể
    - category: "food_specialty", "attraction", "cafe", "accommodation", "nightlife", hoặc "other"
    - category_icon: icon tương ứng (ví dụ: "restaurant", "photo_camera", "local_cafe", "hotel", "celebration", "explore")
    - address_hint: địa chỉ gợi ý ngắn gọn
    - recommended_dish_or_activity: món ăn gợi ý hoặc hoạt động đề xuất tại điểm đó
    - cost_vnd: chi phí dạng số
    - social_trend: { is_viral: boolean, platform: "tiktok" | "threads" | "facebook" | "none", badge_label: chuỗi mô tả trend (ví dụ: "Hot TikTok 1.2M views") }
    - ui_card: { badge_color: mã màu hex, quick_description: mô tả nhanh }
- budget_breakdown: { food_and_drink_vnd: số, attractions_and_activities_vnd: số, transport_and_others_vnd: số }
- local_insider_tips: mảng các mẹo địa phương { type: "transport" | "culture" | "warning" | "weather", icon: tên icon (ví dụ: "directions_bus", "warning"), content: nội dung mẹo }

Mọi phản hồi phải là JSON thuần túy, không có markdown code block.`;

    // Extract destination and duration accurately using the central extraction helper
    const msgLower = (message || "").toLowerCase();
    const extracted = extractDestinationFromText(message || "");
    const detectedCity = extracted.city;
    const detectedDuration = extracted.duration;

    const isItineraryRequest = msgLower.includes("lịch trình") || 
                               msgLower.includes("kế hoạch") || 
                               msgLower.includes("tạo") || 
                               msgLower.includes("đi ") ||
                               msgLower.includes("thiết kế") ||
                               msgLower.includes("gợi ý") ||
                               msgLower.includes("3n2đ") ||
                               msgLower.includes("2n1đ") ||
                               msgLower.includes("4n3đ") ||
                               msgLower.includes("5n4đ");

    if (!ai) {
      if (isItineraryRequest || detectedCity) {
        const fallbackItinerary = getSampleItinerary(detectedCity, detectedDuration);
        const dayCount = fallbackItinerary.itinerary.length;
        return res.json({
          reply: `Xin chào! Tôi đã lập lịch trình du lịch thông minh ${dayCount} ngày cho chuyến đi khám phá **${fallbackItinerary.meta.destination}** (${detectedDuration}) của bạn với đầy đủ các địa điểm ăn uống, check-in HOT và dự toán chi phí. Hãy bấm nút dưới đây để xem và tạo lịch trình nhé!`,
          itinerary: fallbackItinerary
        });
      }

      return res.json({
        reply: `Chào bạn! Tôi là WanderAI. Bạn có thể yêu cầu tôi lên kế hoạch chi tiết như "Lên lịch trình Vịnh Hạ Long 3N2Đ", "Thiết kế tour Đà Lạt 3N2Đ", hoặc "Lịch trình Ninh Bình 2N1Đ". Tôi sẽ lập đầy đủ các ngày trong lịch trình cùng mẹo ăn uống đặc sản địa phương!`,
        itinerary: null
      });
    }

    // Prepare conversation message array for Gemini
    const contents = [];
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.text) {
          contents.push({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
          });
        }
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction: WANDER_CHAT_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            itinerary: {
              type: Type.OBJECT,
              properties: {
                meta: {
                  type: Type.OBJECT,
                  properties: {
                    destination: { type: Type.STRING },
                    trip_duration: { type: Type.STRING },
                    total_estimated_cost_vnd: { type: Type.NUMBER },
                    currency_symbol: { type: Type.STRING },
                    theme_color: { type: Type.STRING },
                    summary: { type: Type.STRING },
                  },
                  required: ["destination", "trip_duration", "total_estimated_cost_vnd", "currency_symbol", "theme_color", "summary"]
                },
                map_config: {
                  type: Type.OBJECT,
                  properties: {
                    recommended_zoom: { type: Type.NUMBER },
                    search_center_hint: { type: Type.STRING },
                  },
                  required: ["recommended_zoom", "search_center_hint"]
                },
                itinerary: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day_number: { type: Type.NUMBER },
                      day_title: { type: Type.STRING },
                      schedule: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            time_slot: { type: Type.STRING },
                            time_period: { type: Type.STRING },
                            place_name: { type: Type.STRING },
                            category: { type: Type.STRING },
                            category_icon: { type: Type.STRING },
                            address_hint: { type: Type.STRING },
                            recommended_dish_or_activity: { type: Type.STRING },
                            cost_vnd: { type: Type.NUMBER },
                            social_trend: {
                              type: Type.OBJECT,
                              properties: {
                                is_viral: { type: Type.BOOLEAN },
                                platform: { type: Type.STRING },
                                badge_label: { type: Type.STRING },
                                sentiment_score: { type: Type.NUMBER },
                              },
                              required: ["is_viral", "platform", "badge_label"]
                            },
                            ui_card: {
                              type: Type.OBJECT,
                              properties: {
                                badge_color: { type: Type.STRING },
                                quick_description: { type: Type.STRING },
                              },
                              required: ["badge_color", "quick_description"]
                            }
                          },
                          required: ["id", "time_slot", "time_period", "place_name", "category", "category_icon", "address_hint", "recommended_dish_or_activity", "cost_vnd", "social_trend", "ui_card"]
                        }
                      }
                    },
                    required: ["day_number", "day_title", "schedule"]
                  }
                },
                budget_breakdown: {
                  type: Type.OBJECT,
                  properties: {
                    food_and_drink_vnd: { type: Type.NUMBER },
                    attractions_and_activities_vnd: { type: Type.NUMBER },
                    transport_and_others_vnd: { type: Type.NUMBER },
                  },
                  required: ["food_and_drink_vnd", "attractions_and_activities_vnd", "transport_and_others_vnd"]
                },
                local_insider_tips: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING },
                      icon: { type: Type.STRING },
                      content: { type: Type.STRING }
                    },
                    required: ["type", "icon", "content"]
                  }
                }
              }
            }
          },
          required: ["reply"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({
      reply: parsedData.reply,
      itinerary: parsedData.itinerary || null
    });
  } catch (err: any) {
    console.error("Chat Error:", err);
    // Fallback gracefully to smart sample if user was asking for itinerary
    const extracted = extractDestinationFromText(req.body?.message || "");
    const fallback = getSampleItinerary(extracted.city, extracted.duration);
    const dayCount = fallback.itinerary.length;
    return res.json({
      reply: `Tôi đã lập lịch trình du lịch ${dayCount} ngày khám phá **${fallback.meta.destination}** (${extracted.duration}) cho bạn với các địa điểm nổi tiếng, đặc sản ẩm thực và các góc check-in HOT. Bạn có thể bấm nút bên dưới để tạo và tùy chỉnh lịch trình trong tab Lịch trình nhé!`,
      itinerary: fallback
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WanderAI full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
