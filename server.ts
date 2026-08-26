import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

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
        getSampleItinerary("Phú Quốc", "5N4Đ") as any
      ];
      defaultList[0].id = "trip_danang";
      defaultList[1].id = "trip_phuquoc";
      fs.writeFileSync(DB_FILE, JSON.stringify({ itineraries: defaultList, trending_spots: [] }, null, 2), "utf-8");
      return defaultList;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data || "{}");
    // Support both old array format and new object format
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
      if (!Array.isArray(tmp)) existing = tmp;
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
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: "Key API Gemini chưa được cấu hình. Sử dụng dữ liệu mẫu thông minh.",
        data: getSampleItinerary(destination || "Đà Nẵng", duration || "3N2Đ")
      });
    }

    const promptText = `Tạo lịch trình du lịch thông minh WanderAI cho điểm đến: ${destination || "Đà Nẵng"}, thời gian: ${duration || "3N2Đ"}. 
Sở thích / yêu cầu đặc biệt: ${preferences || "Săn đặc sản ẩm thực địa phương, điểm check-in HOT TikTok / Threads, thiên nhiên thư giãn"}.
Ngân sách dự kiến: ${budget || "3.000.000 đ"}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
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
app.get("/api/itineraries", (req, res) => {
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

// Fallback trending spots data (when no Gemini API key)
const FALLBACK_TRENDING: any[] = [
  {
    id: "trend_1", name: "Bánh mì Phương Hội An", city: "Hội An",
    platform: "tiktok", badge_label: "48M views TikTok", views: "48M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    category: "food", description: "Ổ bánh mì nhân thập cẩm huyền thoại được CNN bình chọn ngon nhất thế giới"
  },
  {
    id: "trend_2", name: "Hang Múa Ninh Bình", city: "Ninh Bình",
    platform: "threads", badge_label: "Trending Threads", views: "8.2M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-",
    category: "attraction", description: "Leo 486 bậc đá ngắm đồng lúa xanh rì - góc ảnh đẹp không kém bờ tường Trung Hoa"
  },
  {
    id: "trend_3", name: "Eo Gió Quy Nhơn", city: "Quy Nhơn",
    platform: "instagram", badge_label: "Instagram Reels HOT", views: "12M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    category: "nature", description: "Vách đá ven biển gió lộng, cầu tay vịn đỏ cực HOT check-in"
  },
  {
    id: "trend_4", name: "Chợ nổi Cái Răng", city: "Cần Thơ",
    platform: "tiktok", badge_label: "TikTok Du lịch VN", views: "22M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
    category: "attraction", description: "Chợ nổi sông nước miền Tây độc đáo họp từ tờ mờ sáng"
  },
  {
    id: "trend_5", name: "Sunset Sanato Phú Quốc", city: "Phú Quốc",
    platform: "threads", badge_label: "Viral Threads 2024", views: "15M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV",
    category: "cafe", description: "Bar bãi biển đón hoàng hôn đẹp nhất đảo Phú Quốc"
  },
  {
    id: "trend_6", name: "Bún bò Huế Mụ Rơi", city: "Huế",
    platform: "facebook", badge_label: "Facebook Top Food", views: "5.8M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui",
    category: "food", description: "Quán bún bò gia truyền 30 năm cay nồng chuẩn vị cố đô"
  },
];

// Read trending from db.json (key: trending_spots)
function readTrending(): any[] {
  try {
    if (!fs.existsSync(DB_FILE)) return FALLBACK_TRENDING;
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    if (Array.isArray(parsed)) return FALLBACK_TRENDING; // old array format
    return parsed.trending_spots || FALLBACK_TRENDING;
  } catch {
    return FALLBACK_TRENDING;
  }
}

// Write trending to db.json while preserving itineraries
function writeTrending(spots: any[]) {
  try {
    let parsed: any = {};
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const tmp = JSON.parse(raw || "{}");
      if (Array.isArray(tmp)) {
        // old format: itineraries was stored as root array, migrate
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

// GET /api/trending-spots – trả về danh sách từ DB
app.get("/api/trending-spots", (_req, res) => {
  res.json({ success: true, data: readTrending() });
});

// POST /api/trending-spots/refresh – dùng Gemini AI để sinh danh sách mới
app.post("/api/trending-spots/refresh", async (_req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    // No API key: return fallback
    writeTrending(FALLBACK_TRENDING);
    return res.json({ success: true, data: FALLBACK_TRENDING, source: "fallback" });
  }
  try {
    const prompt = `Bạn là chuyên gia du lịch Việt Nam. Hãy tổng hợp 8 địa điểm du lịch Việt Nam đang được lan truyền mạnh nhất trên các nền tảng mạng xã hội TikTok, Threads, Instagram, Facebook trong tháng này.

Trả về JSON array với cấu trúc sau (KHÔNG có markdown, chỉ raw JSON):
[
  {
    "id": "trend_X",
    "name": "Tên địa điểm/quán ăn cụ thể",
    "city": "Thành phố/tỉnh",
    "platform": "tiktok" | "threads" | "instagram" | "facebook",
    "badge_label": "Mô tả trend ngắn gọn (ví dụ: 45M views TikTok)",
    "views": "Con số lượt xem dạng chuỗi (ví dụ: 45M)",
    "imageUrl": "",
    "category": "food" | "attraction" | "cafe" | "nature",
    "description": "Mô tả ngắn tại sao địa điểm này đang hot (1 câu)",
    "savedAt": "${new Date().toISOString()}"
  }
]

Lưu ý:
- imageUrl để chuỗi rỗng "" (sẽ tự điền sau)
- Đảm bảo đa dạng: miền Bắc, Trung, Nam; đa dạng loại hình (ẩm thực, cảnh đẹp, cafe, tự nhiên)
- Địa điểm phải có tên cụ thể và thực tế`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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

    // System instruction for structured chat output
    const WANDER_CHAT_SYSTEM_INSTRUCTION = `Bạn là "WanderAI" - trợ lý du lịch AI thông minh tiếng Việt năng động, am hiểu sâu sắc về du lịch Việt Nam, các món ăn đặc sản vùng miền, điểm check-in HOT Threads/TikTok, gợi ý lịch trình tối ưu chi phí và quãng đường di chuyển.

Bạn phải trả lời người dùng dưới dạng một đối tượng JSON có cấu trúc như sau:
{
  "reply": "Chuỗi văn bản trò chuyện bằng tiếng Việt thân thiện, tự nhiên, có cấu trúc rõ ràng kèm các icon thích hợp. Trả lời trực tiếp câu hỏi của người dùng.",
  "itinerary": null hoặc Đối tượng lịch trình du lịch thông minh WanderAI (nếu người dùng yêu cầu tạo, lên kế hoạch, lập lịch trình, gợi ý lịch trình chi tiết cho một chuyến đi cụ thể).
}

Nếu người dùng KHÔNG yêu cầu lên lịch trình hoặc kế hoạch du lịch, hãy đặt trường "itinerary" là null.
Nếu người dùng yêu cầu lên lịch trình, hãy tạo ra một lịch trình đầy đủ và lưu trữ nó trong trường "itinerary". Schema của đối tượng lịch trình phải trùng khớp 100% với cấu trúc WanderItineraryData:
- meta: destination (tên địa điểm du lịch), trip_duration (ví dụ: 3N2Đ), total_estimated_cost_vnd (số tiền ước tính dạng số), currency_symbol ("đ"), theme_color ("#E2A854"), summary (tóm tắt chuyến đi bằng tiếng Việt).
- map_config: recommended_zoom (số), search_center_hint (tên địa danh làm trung tâm bản đồ).
- itinerary: mảng các ngày du lịch, mỗi ngày gồm:
  - day_number: số ngày (1, 2, ...)
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

Mọi phản hồi phải là JSON thuần túy, không có markdown code block (không dùng \`\`\`json).`;

    if (!ai) {
      // Offline smart fallback
      let detectedCity = "";
      const msgLower = message.toLowerCase();
      if (msgLower.includes("hà nội") || msgLower.includes("ha noi")) detectedCity = "Hà Nội";
      else if (msgLower.includes("đà nẵng") || msgLower.includes("da nang")) detectedCity = "Đà Nẵng";
      else if (msgLower.includes("phú quốc") || msgLower.includes("phu quoc")) detectedCity = "Phú Quốc";
      else if (msgLower.includes("nha trang")) detectedCity = "Nha Trang";
      else if (msgLower.includes("đà lạt") || msgLower.includes("da lat")) detectedCity = "Đà Lạt";
      else if (msgLower.includes("vũng tàu") || msgLower.includes("vung tau")) detectedCity = "Vũng Tàu";
      else if (msgLower.includes("sapa")) detectedCity = "Sapa";
      else if (msgLower.includes("hội an") || msgLower.includes("hoi an")) detectedCity = "Hội An";

      const isItineraryRequest = msgLower.includes("lịch trình") || 
                                 msgLower.includes("kế hoạch") || 
                                 msgLower.includes("tạo") || 
                                 msgLower.includes("đi ") ||
                                 msgLower.includes("thiết kế") ||
                                 msgLower.includes("gợi ý");

      if (isItineraryRequest && detectedCity) {
        const fallbackItinerary = getSampleItinerary(detectedCity, "3N2Đ");
        return res.json({
          reply: `Xin chào! Tôi đã tự động lập lịch trình du lịch thông minh 3 ngày 2 đêm cho chuyến đi khám phá **${detectedCity}** của bạn. Hãy bấm nút dưới đây để xem và tự chỉnh sửa timeline nhé!`,
          itinerary: fallbackItinerary
        });
      } else if (isItineraryRequest) {
        const fallbackItinerary = getSampleItinerary("Đà Nẵng", "3N2Đ");
        return res.json({
          reply: `Tôi đã lập một lịch trình du lịch mẫu tại **Đà Nẵng** làm gợi ý cho bạn. Hãy bấm nút dưới để lưu và tùy chỉnh địa điểm theo ý muốn của mình!`,
          itinerary: fallbackItinerary
        });
      }

      return res.json({
        reply: `Chào bạn! Tôi là WanderAI. Để tạo lịch trình du lịch tự động, bạn có thể nhập câu lệnh như "Lên kế hoạch đi Đà Lạt" hoặc "Lập lịch trình Vũng Tàu". Hiện tại, bạn cũng có thể hỏi tôi thông tin về đặc sản hay điểm check-in HOT nhất!`,
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
      model: "gemini-3.6-flash",
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
    return res.json({
      reply: "Rất tiếc, có chút gián đoạn kết nối khi xử lý tin nhắn của bạn. Tuy nhiên bạn luôn có thể thử yêu cầu tạo lịch trình lại nhé!",
      itinerary: null
    });
  }
});

function getSampleItinerary(destination: string, duration: string) {
  const destLower = destination.toLowerCase();
  
  // 1. PHÚ QUỐC
  if (destLower.includes("phú quốc") || destLower.includes("phu quoc")) {
    return {
      meta: {
        destination: "Phú Quốc",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 4500000,
        currency_symbol: "đ",
        theme_color: "#E2A854",
        summary: "Hành trình nghỉ dưỡng đảo ngọc Phú Quốc, lặn ngắm san hô, check-in Sunset Sanato & thưởng thức bún quậy Kiến Xây."
      },
      map_config: {
        recommended_zoom: 11,
        search_center_hint: "Dương Đông, Phú Quốc"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Oanh tạc ẩm thực & Check-in Hoàng hôn Chợ đêm",
          schedule: [
            {
              id: "pq_day1_1",
              time_slot: "08:00 - 09:30",
              time_period: "morning",
              place_name: "Bún Quậy Kiến Xây",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "28 Bạch Đằng, Dương Đông, Phú Quốc",
              recommended_dish_or_activity: "Bún quậy hải sản tôm mực tươi tự pha nước chấm",
              cost_vnd: 65000,
              social_trend: {
                is_viral: true,
                platform: "tiktok",
                badge_label: "Hot TikTok 2.4M views",
                sentiment_score: 0.96
              },
              ui_card: {
                badge_color: "#E2A854",
                quick_description: "Đặc sản trứ danh không thể bỏ lỡ"
              }
            },
            {
              id: "pq_day1_2",
              time_slot: "10:00 - 12:00",
              time_period: "morning",
              place_name: "Dinh Cậu & Biển Dương Đông",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Khu phố 2, Dương Đông, Phú Quốc",
              recommended_dish_or_activity: "Thắp hương ngắm sóng biển và chụp ảnh hải đăng",
              cost_vnd: 0,
              social_trend: {
                is_viral: true,
                platform: "facebook",
                badge_label: "Điểm check-in truyền thống",
                sentiment_score: 0.92
              },
              ui_card: {
                badge_color: "#1B6D24",
                quick_description: "Biểu tượng tâm linh ven biển"
              }
            },
            {
              id: "pq_day1_3",
              time_slot: "16:30 - 18:30",
              time_period: "afternoon",
              place_name: "Sunset Sanato Beach Club",
              category: "cafe",
              category_icon: "local_cafe",
              address_hint: "Bãi Trường, Dương Tơ, Phú Quốc",
              recommended_dish_or_activity: "Ngắm hoàng hôn rực rỡ bên tượng voi chân dài bí ẩn",
              cost_vnd: 100000,
              social_trend: {
                is_viral: true,
                platform: "threads",
                badge_label: "Trend Threads sống ảo",
                sentiment_score: 0.98
              },
              ui_card: {
                badge_color: "#E2A854",
                quick_description: "Nơi ngắm hoàng hôn đẹp nhất đảo"
              }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1800000,
        attractions_and_activities_vnd: 1700000,
        transport_and_others_vnd: 1000000
      },
      local_insider_tips: [
        {
          type: "transport",
          icon: "directions_bus",
          content: "Thuê xe máy tại trung tâm Dương Đông khoảng 120k/ngày để chủ động di chuyển dọc Bãi Trường."
        },
        {
          type: "warning",
          icon: "warning",
          content: "Tự pha nước chấm bún quậy theo công thức: 2 thìa muôi, 1 thìa tắc, 1/2 thìa ớt cay vừa ăn."
        }
      ]
    };
  }

  // 1b. HUẾ
  if (destLower.includes("huế") || destLower.includes("hue")) {
    return {
      meta: {
        destination: "Huế",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2600000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Khám phá di sản cố đô Huế trầm mặc, tham quan Đại Nội cổ kính, lăng tẩm và thưởng thức ẩm thực cung đình đặc sắc."
      },
      map_config: {
        recommended_zoom: 13,
        search_center_hint: "Kinh thành Huế, Thừa Thiên Huế"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Tham quan Kinh Thành cổ & Thưởng thức ẩm thực Huế",
          schedule: [
            {
              id: "hu_day1_1",
              time_slot: "08:00 - 09:30",
              time_period: "morning",
              place_name: "Bún bò Huế Mụ Rơi",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "40 Nguyễn Chí Diểu, Thuận Thành, Huế",
              recommended_dish_or_activity: "Thưởng thức tô bún bò giò heo chuẩn vị Huế cay nồng",
              cost_vnd: 45000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Bún bò lâu đời cực HOT" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Hương vị Huế truyền thống" }
            },
            {
              id: "hu_day1_2",
              time_slot: "10:00 - 12:00",
              time_period: "morning",
              place_name: "Đại Nội Huế (Kinh Thành Huế)",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Phú Hậu, Thành phố Huế",
              recommended_dish_or_activity: "Khám phá Ngọ Môn, Điện Thái Hòa, Thế Miếu và chụp hình cổ trang",
              cost_vnd: 200000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Di sản văn hóa thế giới" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Quần thể kiến trúc lịch sử triều Nguyễn" }
            },
            {
              id: "hu_day1_3",
              time_slot: "16:00 - 18:00",
              time_period: "afternoon",
              place_name: "Tiệm Trà Cung Đình Vy Dạ Xưa",
              category: "cafe",
              category_icon: "local_cafe",
              address_hint: "131 Nguyễn Sinh Cung, Vỹ Dạ, Huế",
              recommended_dish_or_activity: "Nhâm nhi tách trà sen Cung Đình ngắm cảnh sông Hương êm đềm",
              cost_vnd: 50000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend chill sông Hương" },
              ui_card: { badge_color: "#E2A854", quick_description: "Không gian trà đạo cổ xưa" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 900000,
        attractions_and_activities_vnd: 1000000,
        transport_and_others_vnd: 700000
      },
      local_insider_tips: [
        { type: "culture", icon: "explore", content: "Hãy mặc đồ lịch sự khi đi Đại Nội và lăng tẩm vì đây là nơi tôn nghiêm." },
        { type: "transport", icon: "directions_bus", content: "Buổi tối nên trải nghiệm nghe ca Huế trên sông Hương và đi dạo cầu Trường Tiền." }
      ]
    };
  }

  // 1c. HẠ LONG
  if (destLower.includes("hạ long") || destLower.includes("ha long") || destLower.includes("quảng ninh")) {
    return {
      meta: {
        destination: "Hạ Long",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 3900000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Hành trình vịnh Hạ Long kỳ vĩ, đi du thuyền ngắm đảo đá, khám phá hang động hoang sơ và thưởng thức bánh cuốn chả mực nóng hổi."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Bãi Cháy, Hạ Long"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Thưởng thức bánh cuốn chả mực & Du ngoạn Vịnh Hạ Long",
          schedule: [
            {
              id: "hl_day1_1",
              time_slot: "08:00 - 09:30",
              time_period: "morning",
              place_name: "Bánh cuốn chả mực Bà Ngân",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "34 Đoàn Thị Điểm, Bạch Đằng, Hạ Long",
              recommended_dish_or_activity: "Thưởng thức bánh cuốn nóng tráng tay ăn kèm chả mực giã tay giòn ngọt",
              cost_vnd: 50000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok đặc sản Hạ Long" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Món ăn sáng nổi danh nhất" }
            },
            {
              id: "hl_day1_2",
              time_slot: "10:00 - 16:30",
              time_period: "afternoon",
              place_name: "Du thuyền tham quan Vịnh Hạ Long",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Cảng tàu khách quốc tế Hạ Long, Bãi Cháy",
              recommended_dish_or_activity: "Du ngoạn vịnh ngắm Hòn Trống Mái, khám phá Động Thiên Cung và chèo thuyền Kayak",
              cost_vnd: 350000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Kỳ quan thiên nhiên thế giới" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Khám phá kỳ quan đá vôi nghìn năm" }
            },
            {
              id: "hl_day1_3",
              time_slot: "17:30 - 19:30",
              time_period: "evening",
              place_name: "Thông Reo Phin Bar Hạ Long",
              category: "cafe",
              category_icon: "local_cafe",
              address_hint: "Đường Hải Quân, Bãi Cháy, Hạ Long",
              recommended_dish_or_activity: "Uống cà phê muối ngắm cảnh hoàng hôn buông xuống vịnh tuyệt đẹp",
              cost_vnd: 70000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Góc ngắm hoàng hôn cực chill" },
              ui_card: { badge_color: "#E2A854", quick_description: "Không gian thông reo thơ mộng" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1200000,
        attractions_and_activities_vnd: 1500000,
        transport_and_others_vnd: 1200000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy chọn xe điện đi quanh khu Bãi Cháy chỉ khoảng 20k/lượt rất thoáng mát." },
        { type: "warning", icon: "warning", content: "Luôn mua vé tàu tham quan vịnh tại cảng tàu chính thức để tránh cò mồi giá cao." }
      ]
    };
  }

  // 1d. NINH BÌNH
  if (destLower.includes("ninh bình") || destLower.includes("ninh binh")) {
    return {
      meta: {
        destination: "Ninh Bình",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2400000,
        currency_symbol: "đ",
        theme_color: "#E2A854",
        summary: "Du ngoạn non nước Ninh Bình, đi thuyền ngắm hang động Tràng An, check-in Hang Múa kỳ vĩ & thưởng thức đặc sản dê núi cơm cháy."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Tràng An, Ninh Bình"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Danh thắng Tràng An & Chinh phục Hang Múa",
          schedule: [
            {
              id: "nb_day1_1",
              time_slot: "08:00 - 09:30",
              time_period: "morning",
              place_name: "Miến lươn bà Phấn",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "Trần Hưng Đạo, Ninh Bình",
              recommended_dish_or_activity: "Thưởng thức miến lươn nước dùng đậm đà đặc sản",
              cost_vnd: 45000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Quán ăn gia truyền" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Đặc sản nức tiếng cố đô" }
            },
            {
              id: "nb_day1_2",
              time_slot: "10:00 - 13:30",
              time_period: "morning",
              place_name: "Khu du lịch sinh thái Tràng An",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Tràng An, Trường Yên, Ninh Bình",
              recommended_dish_or_activity: "Đi đò chèo ngắm cảnh hang động karst, chùa cổ, phim trường cũ",
              cost_vnd: 250000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok phong cảnh hữu tình" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Di sản thế giới kép UNESCO" }
            },
            {
              id: "nb_day1_3",
              time_slot: "14:30 - 16:30",
              time_period: "afternoon",
              place_name: "Khu thắng cảnh Hang Múa",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Khê Đầu Hạ, Ninh Xuân, Ninh Bình",
              recommended_dish_or_activity: "Leo 486 bậc đá lên đỉnh núi Ngọa Long ngắm toàn cảnh lúa chín Tam Cốc",
              cost_vnd: 100000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Đỉnh núi check-in ngắm cảnh siêu đẹp" },
              ui_card: { badge_color: "#E2A854", quick_description: "Vạn lý trường thành thu nhỏ" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 800000,
        attractions_and_activities_vnd: 900000,
        transport_and_others_vnd: 700000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy đi thuyền Tràng An tuyến 2 hoặc tuyến 3 để có sự kết hợp đền thờ và hang động đẹp nhất." },
        { type: "warning", icon: "warning", content: "Chuẩn bị nón, kem chống nắng và nước lọc vì thời gian ngồi thuyền trên sông khoảng 3 tiếng." }
      ]
    };
  }

  // 1e. QUY NHƠN
  if (destLower.includes("quy nhơn") || destLower.includes("quy nhon")) {
    return {
      meta: {
        destination: "Quy Nhơn",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2800000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Khám phá thiên đường biển Quy Nhơn, lướt sóng Kỳ Co, đón gió Eo Gió kỳ vĩ & oanh tạc bánh xèo tôm nhảy."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Trần Phú, Quy Nhơn"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Oanh tạc Eo Gió, Kỳ Co & Bánh xèo tôm nhảy",
          schedule: [
            {
              id: "qn_day1_1",
              time_slot: "08:00 - 09:30",
              time_period: "morning",
              place_name: "Bánh xèo tôm nhảy Gia Vĩ",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "19 Diên Hồng, Quy Nhơn",
              recommended_dish_or_activity: "Bánh xèo giòn rụm nhân tôm đất tươi rói cuốn rau mầm",
              cost_vnd: 50000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Đặc sản Quy Nhơn" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Đặc sản số một Bình Định" }
            },
            {
              id: "qn_day1_2",
              time_slot: "10:00 - 14:00",
              time_period: "morning",
              place_name: "Khu du lịch Kỳ Co",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Nhơn Lý, Quy Nhơn",
              recommended_dish_or_activity: "Tắm biển xanh ngọc bích, chụp ảnh cầu gỗ và lặn ngắm san hô bãi Dứa",
              cost_vnd: 150000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Maldives thu nhỏ tại Việt Nam" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Bãi biển đẹp hoang sơ bậc nhất" }
            },
            {
              id: "qn_day1_3",
              time_slot: "15:00 - 17:00",
              time_period: "afternoon",
              place_name: "Khu thắng cảnh Eo Gió",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Nhơn Lý, Quy Nhơn",
              recommended_dish_or_activity: "Đi bộ dọc con đường tay vịn đỏ ven vách đá ngắm sóng biển xô bồ",
              cost_vnd: 25000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Nơi đón bình minh & hoàng hôn đẹp nhất" },
              ui_card: { badge_color: "#E2A854", quick_description: "Thung lũng đón gió biển" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1000000,
        attractions_and_activities_vnd: 1000000,
        transport_and_others_vnd: 800000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy đi ca nô từ Nhơn Lý sang Kỳ Co để tiết kiệm thời gian và có cơ hội ngắm rặng san hô tuyệt đẹp." },
        { type: "weather", icon: "wb_sunny", content: "Thời điểm lý tưởng nhất đi Quy Nhơn là từ tháng 3 đến tháng 9 khi biển lặng, trong xanh." }
      ]
    };
  }

  // 1f. PHAN THIẾT / MŨI NÉ
  if (destLower.includes("phan thiết") || destLower.includes("phan thiet") || destLower.includes("mũi né") || destLower.includes("mui ne")) {
    return {
      meta: {
        destination: "Mũi Né",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2900000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Check-in sa mạc cát Bàu Trắng Mũi Né, trượt cát Đồi Cát Bay, thưởng thức hải sản tươi sống và lướt sóng biển xanh."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Bãi Cháy Mũi Né, Bình Thuận"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Trải nghiệm xe Jeep Bàu Trắng & Đồi Cát Bay",
          schedule: [
            {
              id: "mn_day1_1",
              time_slot: "08:30 - 09:30",
              time_period: "morning",
              place_name: "Bánh canh chả cá Phan Thiết - Xíu mại",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "Trần Hưng Đạo, Phan Thiết",
              recommended_dish_or_activity: "Thưởng thức bánh canh chả cá hấp hoặc chiên ngọt vị cá thu",
              cost_vnd: 35000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Ẩm thực truyền thống Phan Thiết" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Vị ngọt thanh đượm vị biển" }
            },
            {
              id: "mn_day1_2",
              time_slot: "14:00 - 16:30",
              time_period: "afternoon",
              place_name: "Đồi Cát Trắng (Bàu Trắng)",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Hòa Thắng, Bắc Bình, Bình Thuận",
              recommended_dish_or_activity: "Thuê xe jeep địa hình chạy lên đỉnh đồi cát, trượt cát ngắm hồ sen",
              cost_vnd: 300000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Tiểu Sahara Việt Nam" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Đồi cát trắng tinh mộng mơ" }
            },
            {
              id: "mn_day1_3",
              time_slot: "17:00 - 18:30",
              time_period: "evening",
              place_name: "Đồi Cát Bay Mũi Né",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Vòng xoay Mũi Né, Phan Thiết",
              recommended_dish_or_activity: "Ngắm hoàng hôn nhuộm đỏ đồi cát vàng óng ả",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend Threads hoàng hôn đồi cát" },
              ui_card: { badge_color: "#E2A854", quick_description: "Điểm chụp ảnh bóng hoàng hôn" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1100000,
        attractions_and_activities_vnd: 1000000,
        transport_and_others_vnd: 800000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Nên thuê tour xe Jeep đi 4 điểm (Bàu Trắng, Đồi Cát Đỏ, Làng Chài, Suối Tiên) khoảng 500k/xe 4-6 người." },
        { type: "warning", icon: "warning", content: "Nắng ở đồi cát rất gắt, hãy mang kính râm, thoa kem chống nắng kỹ trước khi đi." }
      ]
    };
  }

  // 1g. CẦN THƠ
  if (destLower.includes("cần thơ") || destLower.includes("can tho")) {
    return {
      meta: {
        destination: "Cần Thơ",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2200000,
        currency_symbol: "đ",
        theme_color: "#E2A854",
        summary: "Trải nghiệm văn hóa sông nước miền Tây độc đáo tại Cần Thơ, đi đò Chợ nổi Cái Răng từ sáng sớm và tham quan vườn trái cây."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Ninh Kiều, Cần Thơ"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Khám phá Chợ nổi Cái Răng & Vườn trái cây Mỹ Khánh",
          schedule: [
            {
              id: "ct_day1_1",
              time_slot: "05:30 - 07:30",
              time_period: "morning",
              place_name: "Chợ nổi Cái Răng",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Sông Cần Thơ, Cái Răng",
              recommended_dish_or_activity: "Đi thuyền ngắm cảnh mua bán nhộn nhịp, ăn hủ tiếu chợ nổi nóng hổi trên ghe",
              cost_vnd: 100000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok văn hóa miền Tây" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Biểu tượng sông nước Tây Đô" }
            },
            {
              id: "ct_day1_2",
              time_slot: "08:00 - 09:30",
              time_period: "morning",
              place_name: "Hủ tiếu Pizza Chợ Nổi",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "Lộ Vòng Cung, An Bình, Ninh Kiều",
              recommended_dish_or_activity: "Thử hủ tiếu chiên giòn rụm độc đáo kèm thịt khìa trứng chiên",
              cost_vnd: 40000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Món ăn sáng độc đáo" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Đặc sản chế biến độc lạ" }
            },
            {
              id: "ct_day1_3",
              time_slot: "10:00 - 14:00",
              time_period: "afternoon",
              place_name: "Làng du lịch sinh thái Mỹ Khánh",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "335 Lộ Vòng Cung, Mỹ Khánh, Phong Điền",
              recommended_dish_or_activity: "Tham quan vườn cây trĩu quả chôm chôm, măng cụt, dâu Hạ Châu và chơi các trò chơi dân gian",
              cost_vnd: 90000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Khu du lịch sinh thái miệt vườn" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Miệt vườn trái cây Nam Bộ" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 800000,
        attractions_and_activities_vnd: 700000,
        transport_and_others_vnd: 700000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy ra bến Ninh Kiều từ 5h00 sáng để thuê thuyền đò đi chợ nổi thời điểm đẹp nhất." },
        { type: "culture", icon: "explore", content: "Người dân miền Tây vô cùng hiếu khách và thật thà, bạn có thể thoải mái giao tiếp trò chuyện." }
      ]
    };
  }

  // 1h. CÔN ĐẢO
  if (destLower.includes("côn đảo") || destLower.includes("con dao") || destLower.includes("côn sơn")) {
    return {
      meta: {
        destination: "Côn Đảo",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 4800000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Hành trình tâm linh thiêng liêng tại Côn Đảo, thăm nhà tù lịch sử, viếng mộ chị Sáu và nghỉ dưỡng bãi biển Đầm Trầu hoang sơ."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Côn Sơn, Bà Rịa Vũng Tàu"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Thăm Nhà tù Lịch sử & Bãi biển Đầm Trầu ngắm máy bay",
          schedule: [
            {
              id: "cd_day1_1",
              time_slot: "08:30 - 11:30",
              time_period: "morning",
              place_name: "Hệ thống nhà tù Côn Đảo",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Lê Văn Việt, Côn Đảo",
              recommended_dish_or_activity: "Viếng thăm Trại Phú Hải, Chuồng Cọp Pháp - Mỹ tìm hiểu lịch sử anh hùng cách mạng",
              cost_vnd: 50000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Di tích lịch sử quốc gia" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Địa ngục trần gian một thời" }
            },
            {
              id: "cd_day1_2",
              time_slot: "12:00 - 13:00",
              time_period: "morning",
              place_name: "Bún riêu cua biển Côn Đảo",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "Đường Nguyễn Huệ, Côn Đảo",
              recommended_dish_or_activity: "Thưởng thức bún riêu cua biển ngọt béo bùi chuẩn vị đảo",
              cost_vnd: 50000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Ẩm thực biển đảo ngon bổ" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Ăn trưa cua biển đậm đà" }
            },
            {
              id: "cd_day1_3",
              time_slot: "14:30 - 17:00",
              time_period: "afternoon",
              place_name: "Bãi biển Đầm Trầu",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Gần sân bay Cỏ Ống, Côn Đảo",
              recommended_dish_or_activity: "Tắm biển bãi cát mịn, chờ đón khoảnh khắc máy bay đáp sát đầu để check-in sống ảo",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Check-in máy bay HOT nhất Việt Nam" },
              ui_card: { badge_color: "#E2A854", quick_description: "Bãi biển có trải nghiệm có một không hai" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1500000,
        attractions_and_activities_vnd: 1300000,
        transport_and_others_vnd: 2000000
      },
      local_insider_tips: [
        { type: "culture", icon: "explore", content: "Viếng mộ chị Võ Thị Sáu tại nghĩa trang Hàng Dương thường diễn ra trang nghiêm từ 22h00 - 24h00 đêm." },
        { type: "transport", icon: "directions_bus", content: "Nên thuê xe máy đi quanh đảo vì các bãi tắm cách nhau khoảng 10-15km và ít taxi." }
      ]
    };
  }

  // 2. NHA TRANG
  if (destLower.includes("nha trang")) {
    return {
      meta: {
        destination: "Nha Trang",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 3500000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Hành trình biển xanh Nha Trang, khám phá VinWonders, di tích Tháp Bà Ponagar và đặc sản ẩm thực biển."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Lộc Thọ, Nha Trang"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Check-in Biển Bãi Dài & Vui chơi VinWonders",
          schedule: [
            {
              id: "nt_day1_1",
              time_slot: "08:00 - 09:30",
              time_period: "morning",
              place_name: "Bánh căn hải sản Nha Trang - Tháp Bà",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "Khu Tháp Bà, Nha Trang",
              recommended_dish_or_activity: "Thưởng thức bánh căn nóng hổi nhân tôm mực tươi",
              cost_vnd: 55000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok 1.8M views" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Đặc sản sáng không thể bỏ qua" }
            },
            {
              id: "nt_day1_2",
              time_slot: "10:00 - 16:30",
              time_period: "afternoon",
              place_name: "Khu vui chơi VinWonders Nha Trang",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Đảo Hòn Tre, Vĩnh Nguyên, Nha Trang",
              recommended_dish_or_activity: "Vui chơi công viên nước, ngắm show diễn triệu đô Tata Show",
              cost_vnd: 880000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Hot check-in Hòn Tre" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Đảo giải trí đẳng cấp thế giới" }
            },
            {
              id: "nt_day1_3",
              time_slot: "17:00 - 19:00",
              time_period: "evening",
              place_name: "Sailing Club Nha Trang",
              category: "cafe",
              category_icon: "local_cafe",
              address_hint: "72 Trần Phú, Lộc Thọ, Nha Trang",
              recommended_dish_or_activity: "Ngắm hoàng hôn ven biển với ly cocktail hoặc cafe muối",
              cost_vnd: 120000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Bar bãi biển HOT nhất" },
              ui_card: { badge_color: "#E2A854", quick_description: "Nơi ngắm biển chiều cực chill" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1200000,
        attractions_and_activities_vnd: 1500000,
        transport_and_others_vnd: 800000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy chọn di chuyển bằng xe điện dọc đường Trần Phú để ngắm cảnh biển tiết kiệm." },
        { type: "culture", icon: "explore", content: "Khi tham quan Tháp Bà Ponagar, nên mặc trang phục lịch sự che vai và đầu gối." }
      ]
    };
  }

  // 3. ĐÀ LẠT
  if (destLower.includes("đà lạt") || destLower.includes("da lat")) {
    return {
      meta: {
        destination: "Đà Lạt",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2900000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Hành trình săn mây Đà Lạt, chill tiệm cafe view đồi núi rừng thông & thưởng thức Lẩu gà lá é ấm áp."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Phường 1, Đà Lạt"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Săn mây Đồi chè & Chill rừng thông",
          schedule: [
            {
              id: "dl_day1_1",
              time_slot: "04:30 - 07:30",
              time_period: "morning",
              place_name: "Săn Mây Đồi Chè Cầu Đất",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Xuân Trường, Đà Lạt",
              recommended_dish_or_activity: "Chụp ảnh thảm gỗ săn mây bồng bềnh buổi sớm",
              cost_vnd: 120000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Top 1 sống ảo Đà Lạt" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Trải nghiệm săn mây đỉnh cao" }
            },
            {
              id: "dl_day1_2",
              time_slot: "08:30 - 10:00",
              time_period: "morning",
              place_name: "Bánh mì xíu mại Hoàng Diệu",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "26 Hoàng Diệu, Phường 5, Đà Lạt",
              recommended_dish_or_activity: "Chén bánh mì xíu mại cay nồng ấm bụng",
              cost_vnd: 35000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok Review" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Bữa sáng trứ danh Đà Lạt" }
            },
            {
              id: "dl_day1_3",
              time_slot: "14:00 - 17:00",
              time_period: "afternoon",
              place_name: "Tiệm Cà phê Túi Mơ To",
              category: "cafe",
              category_icon: "local_cafe",
              address_hint: "Hẻm 31 Sào Nam, Phường 11, Đà Lạt",
              recommended_dish_or_activity: "Thưởng thức trà nóng giữa vườn cúc họa mi lãng mạn",
              cost_vnd: 65000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend Threads check-in" },
              ui_card: { badge_color: "#E2A854", quick_description: "View thung lũng đèn cực đẹp" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 900000,
        attractions_and_activities_vnd: 1200000,
        transport_and_others_vnd: 800000
      },
      local_insider_tips: [
        { type: "weather", icon: "cloud", content: "Đà Lạt chiều tối lạnh sâu, hãy luôn mang theo áo khoác ấm khi ra ngoài." },
        { type: "transport", icon: "motorcycle", content: "Đường Đà Lạt nhiều đèo dốc và không có đèn đỏ, lái xe máy cần hết sức cẩn thận." }
      ]
    };
  }

  // 4. VŨNG TÀU
  if (destLower.includes("vũng tàu") || destLower.includes("vung tau")) {
    return {
      meta: {
        destination: "Vũng Tàu",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2500000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Chuyến đi tránh nóng Vũng Tàu cực nhanh, oanh tạc bánh khọt, check-in ngọn hải đăng & hít thở gió biển."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Bãi Sau, Vũng Tàu"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Oanh tạc Bánh Khọt & Check-in Hải Đăng",
          schedule: [
            {
              id: "vt_day1_1",
              time_slot: "08:30 - 10:00",
              time_period: "morning",
              place_name: "Bánh khọt Cô Ba Vũng Tàu",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "01 Hoàng Hoa Thám, Phường 3, Vũng Tàu",
              recommended_dish_or_activity: "Bánh khọt tôm nhảy giòn rụm cuốn rau cải chấm nước mắm chua ngọt",
              cost_vnd: 75000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Quán bánh khọt lâu đời" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Đặc sản số 1 Vũng Tàu" }
            },
            {
              id: "vt_day1_2",
              time_slot: "14:30 - 16:30",
              time_period: "afternoon",
              place_name: "Ngọn Hải Đăng Vũng Tàu",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Núi Nhỏ, Phường 2, Vũng Tàu",
              recommended_dish_or_activity: "Ngắm toàn cảnh biển bãi Trước và ăn sữa chua cô Tiên",
              cost_vnd: 20000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Check-in ngắm biển view đỉnh" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Ngọn hải đăng cổ nhất Việt Nam" }
            },
            {
              id: "vt_day1_3",
              time_slot: "17:00 - 19:00",
              time_period: "evening",
              place_name: "Marina Club Vũng Tàu",
              category: "cafe",
              category_icon: "local_cafe",
              address_hint: "03 Hạ Long, Phường 2, Vũng Tàu",
              recommended_dish_or_activity: "Uống nước hóng gió biển rì rào ngắm hoàng hôn rực sắc đỏ",
              cost_vnd: 90000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend Threads hoàng hôn" },
              ui_card: { badge_color: "#E2A854", quick_description: "Tọa độ ngắm hoàng hôn sát biển" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1000000,
        attractions_and_activities_vnd: 700000,
        transport_and_others_vnd: 800000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_car", content: "Chỉ cách Sài Gòn 2 tiếng đi xe khách hoặc tàu cao tốc, rất thích hợp du lịch cuối tuần." },
        { type: "warning", icon: "warning", content: "Hãy hỏi kỹ giá hải sản trước khi mua tại các chợ đêm ven biển để tránh bị chặt chém." }
      ]
    };
  }

  // 5. HÀ NỘI
  if (destLower.includes("hà nội") || destLower.includes("ha noi")) {
    return {
      meta: {
        destination: "Hà Nội",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 2700000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Du lịch thủ đô Hà Nội ngàn năm văn hiến, dạo hồ Gươm, thưởng thức cà phê trứng & bia Tạ Hiện sôi động."
      },
      map_config: {
        recommended_zoom: 13,
        search_center_hint: "Hoàn Kiếm, Hà Nội"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Hoài niệm Hồ Gươm, Lăng Bác & Thưởng thức Phở",
          schedule: [
            {
              id: "hn_day1_1",
              time_slot: "07:30 - 09:00",
              time_period: "morning",
              place_name: "Phở Bò Bát Đàn",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "49 Bát Đàn, Cửa Đông, Hoàn Kiếm",
              recommended_dish_or_activity: "Xếp hàng ăn phở bò gia truyền nước dùng ngọt thanh",
              cost_vnd: 60000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Phở gia truyền xếp hàng" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Tinh hoa ẩm thực Hà Thành" }
            },
            {
              id: "hn_day1_2",
              time_slot: "09:30 - 11:30",
              time_period: "morning",
              place_name: "Lăng Chủ tịch Hồ Chí Minh",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Hùng Vương, Điện Biên, Ba Đình",
              recommended_dish_or_activity: "Vào lăng viếng Bác và dạo quanh khu nhà sàn, ao cá",
              cost_vnd: 0,
              social_trend: { is_viral: false, platform: "none", badge_label: "Điểm tham quan lịch sử" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Trái tim thiêng liêng đất nước" }
            },
            {
              id: "hn_day1_3",
              time_slot: "14:30 - 16:00",
              time_period: "afternoon",
              place_name: "Cà phê Giảng - Cà phê Trứng",
              category: "cafe",
              category_icon: "local_cafe",
              address_hint: "39 Nguyễn Hữu Huân, Lý Thái Tổ, Hoàn Kiếm",
              recommended_dish_or_activity: "Thưởng thức cà phê trứng nóng ngậy béo thơm",
              cost_vnd: 40000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok ẩm thực thủ đô" },
              ui_card: { badge_color: "#E2A854", quick_description: "Khai sinh ra món Cà phê trứng" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1100000,
        attractions_and_activities_vnd: 800000,
        transport_and_others_vnd: 800000
      },
      local_insider_tips: [
        { type: "culture", icon: "explore", content: "Hãy thử trải nghiệm đi xe xích lô quanh khu phố cổ để tận hưởng không khí cổ xưa." },
        { type: "weather", icon: "wb_sunny", content: "Hà Nội mùa thu (tháng 9-11) là thời điểm đẹp nhất năm với nắng vàng gió heo may." }
      ]
    };
  }

  // 6. SAPA
  if (destLower.includes("sapa")) {
    return {
      meta: {
        destination: "Sapa",
        trip_duration: duration || "3N2Đ",
        total_estimated_cost_vnd: 3200000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Hành trình chinh phục Fansipan huyền thoại, dạo chơi bản Cát Cát mộc mạc và ăn đồ nướng ngói Sapa thơm phức."
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: "Sa Pa, Lào Cai"
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Chinh phục đỉnh Fansipan & Bản Cát Cát",
          schedule: [
            {
              id: "sp_day1_1",
              time_slot: "08:00 - 12:00",
              time_period: "morning",
              place_name: "Cáp treo Fansipan Legend",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "Đường Nguyễn Chí Thanh, Sa Pa",
              recommended_dish_or_activity: "Đi cáp treo leo núi ngắm thung lũng Mường Hoa, chụp ảnh cột mốc 3143m",
              cost_vnd: 850000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Nóc nhà Đông Dương" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Đỉnh núi cao nhất Việt Nam" }
            },
            {
              id: "sp_day1_2",
              time_slot: "14:00 - 16:30",
              time_period: "afternoon",
              place_name: "Bản Cát Cát - Bản H'Mông cổ",
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: "San Sả Hồ, Sa Pa",
              recommended_dish_or_activity: "Thuê trang phục dân tộc check-in thác nước, nhà gỗ",
              cost_vnd: 150000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok check-in vùng cao" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Ngôi làng đẹp nhất Tây Bắc" }
            },
            {
              id: "sp_day1_3",
              time_slot: "18:30 - 21:00",
              time_period: "evening",
              place_name: "Ẩm thực nướng ngói Sapa",
              category: "food_specialty",
              category_icon: "restaurant",
              address_hint: "Phố Cầu Mây, Sa Pa",
              recommended_dish_or_activity: "Thưởng thức thịt heo bản, bò cuộn cải mèo nướng ngói nóng hổi",
              cost_vnd: 200000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Ăn vặt đêm Sapa cực đắt khách" },
              ui_card: { badge_color: "#E2A854", quick_description: "Món ăn sưởi ấm đêm sương mù" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 1000000,
        attractions_and_activities_vnd: 1400000,
        transport_and_others_vnd: 800000
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy đi tàu hỏa leo núi Mường Hoa từ ga Sapa để có view thung lũng tuyệt đẹp." },
        { type: "warning", icon: "warning", content: "Sapa quanh năm có sương mù dầy, chú ý mang giày chống trơn trượt khi leo núi." }
      ]
    };
  }

  // 7. ĐÀ NẴNG (Default / Fallback)
  const capitalizedDestination = destination.charAt(0).toUpperCase() + destination.slice(1);
  return {
    meta: {
      destination: capitalizedDestination || "Đà Nẵng",
      trip_duration: duration || "3N2Đ",
      total_estimated_cost_vnd: 2800000,
      currency_symbol: "đ",
      theme_color: "#E2A854",
      summary: `Khám phá thiên đường du lịch và ẩm thực tại ${capitalizedDestination}. Lịch trình kết hợp đặc sản địa phương và những điểm sống ảo độc đáo.`
    },
    map_config: {
      recommended_zoom: 12,
      search_center_hint: `${capitalizedDestination}, Việt Nam`
    },
    itinerary: [
      {
        day_number: 1,
        day_title: "Oanh tạc ẩm thực đặc sắc & Địa điểm check-in tiêu biểu",
        schedule: [
          {
            id: "fallback_item1",
            time_slot: "08:00 - 09:30",
            time_period: "morning",
            place_name: `Bữa sáng ẩm thực đặc sản ${capitalizedDestination}`,
            category: "food_specialty",
            category_icon: "restaurant",
            address_hint: `Trung tâm thành phố ${capitalizedDestination}`,
            recommended_dish_or_activity: "Thưởng thức món ăn truyền thống được thực khách đánh giá cao",
            cost_vnd: 65000,
            social_trend: { is_viral: true, platform: "tiktok", badge_label: "Quán địa phương nổi bật" },
            ui_card: { badge_color: "#E2A854", quick_description: "Vị ngon chuẩn địa phương" }
          },
          {
            id: "fallback_item2",
            time_slot: "10:00 - 12:00",
            time_period: "morning",
            place_name: `Điểm danh lam thắng cảnh ${capitalizedDestination}`,
            category: "attraction",
            category_icon: "photo_camera",
            address_hint: `Thành phố ${capitalizedDestination}`,
            recommended_dish_or_activity: "Chụp ảnh lưu niệm toàn cảnh, trải nghiệm không khí thiên nhiên trong lành",
            cost_vnd: 0,
            social_trend: { is_viral: true, platform: "facebook", badge_label: "Tuyệt tác tự nhiên" },
            ui_card: { badge_color: "#1B6D24", quick_description: "Không gian thoáng đãng & check-in" }
          },
          {
            id: "fallback_item3",
            time_slot: "14:00 - 16:30",
            time_period: "afternoon",
            place_name: `Tiệm Cà phê chill ngắm cảnh`,
            category: "cafe",
            category_icon: "local_cafe",
            address_hint: `Khu trung tâm ${capitalizedDestination}`,
            recommended_dish_or_activity: "Nhâm nhi ly nước đặc trưng, ngắm nhìn phố phường chuyển động",
            cost_vnd: 50000,
            social_trend: { is_viral: true, platform: "threads", badge_label: "Tọa độ sống ảo cực xịn" },
            ui_card: { badge_color: "#E2A854", quick_description: "View xinh thư giãn" }
          }
        ]
      }
    ],
    budget_breakdown: {
      food_and_drink_vnd: 1100000,
      attractions_and_activities_vnd: 1000000,
      transport_and_others_vnd: 700000
    },
    local_insider_tips: [
      { type: "transport", icon: "directions_bus", content: "Hãy thuê xe máy (khoảng 100k - 150k/ngày) để tự do di chuyển chủ động nhất." },
      { type: "weather", icon: "wb_sunny", content: "Hãy chuẩn bị ô dù và kem chống nắng để check-in ngoài trời thoải mái." }
    ]
  };
}

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
