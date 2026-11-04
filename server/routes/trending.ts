import { Router } from "express";
import { limits } from "../lib/rateLimit.js";
import { generateJson } from "../lib/gemini.js";

// TODO(agent-data): bỏ số "views" (đang là số Gemini tự nghĩ ra) và đổi nhãn thành "AI gợi ý • cập nhật <ngày>".

const REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export const FALLBACK_TRENDING: any[] = [
  {
    id: "trend_1", name: "Bánh mì Phượng Hội An", city: "Hội An",
    platform: "tiktok", badge_label: "48M views TikTok", views: "48M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    category: "food", description: "Ổ bánh mì nhân thập cẩm huyền thoại được du khách trong nước và quốc tế yêu thích",
  },
  {
    id: "trend_2", name: "Hang Múa Ninh Bình", city: "Ninh Bình",
    platform: "threads", badge_label: "Trending Threads", views: "8.2M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-",
    category: "attraction", description: "Leo 486 bậc đá ngắm toàn cảnh sông Ngô Đồng và mùa lúa Tam Cốc đẹp mê hồn",
  },
  {
    id: "trend_3", name: "Eo Gió Quy Nhơn", city: "Quy Nhơn",
    platform: "facebook", badge_label: "Facebook Reels HOT", views: "12M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    category: "nature", description: "Vách đá ven biển gió lộng với con đường dạo bộ ôm sát biển cực kỳ ấn tượng",
  },
  {
    id: "trend_4", name: "Chợ nổi Cái Răng", city: "Cần Thơ",
    platform: "tiktok", badge_label: "TikTok Du lịch VN", views: "22M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
    category: "attraction", description: "Chợ nổi sông nước miền Tây độc đáo họp từ tờ mờ sáng với món hủ tiếu ghe trứ danh",
  },
  {
    id: "trend_5", name: "Sunset Sanato Phú Quốc", city: "Phú Quốc",
    platform: "threads", badge_label: "Viral Threads 2025", views: "15M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV",
    category: "cafe", description: "Bar bãi biển đón hoàng hôn lãng mạn bậc nhất đảo ngọc Phú Quốc",
  },
  {
    id: "trend_6", name: "Bún bò Huế Mụ Rơi", city: "Huế",
    platform: "facebook", badge_label: "Facebook Top Food", views: "5.8M",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui",
    category: "food", description: "Quán bún bò gia truyền 30 năm cay nồng thơm mùi sả ruốc chuẩn vị cố đô",
  },
];

/** State in-memory (server free tier không có ổ đĩa bền vững). */
let current: { spots: any[]; source: string; updatedAt: number } = {
  spots: FALLBACK_TRENDING,
  source: "fallback",
  updatedAt: 0,
};

export const trendingRouter = Router();

trendingRouter.get("/api/trending-spots", limits.read, (_req, res) => {
  res.json({ success: true, data: current.spots, source: current.source, updatedAt: current.updatedAt || null });
});

trendingRouter.post("/api/trending-spots/refresh", limits.generate, async (_req, res) => {
  // Chống spam đốt quota Gemini: chỉ làm mới tối đa mỗi 6 giờ.
  if (current.source === "gemini" && Date.now() - current.updatedAt < REFRESH_COOLDOWN_MS) {
    return res.json({ success: true, data: current.spots, source: "cache", updatedAt: current.updatedAt });
  }

  const prompt = `Bạn là chuyên gia du lịch Việt Nam. Liệt kê 6 địa điểm du lịch/ẩm thực Việt Nam đang được nhiều người quan tâm trên mạng xã hội gần đây.
Trả về JSON array:
[{ "id": "trend_X", "name": "...", "city": "...", "platform": "tiktok" | "threads" | "facebook", "badge_label": "nhãn ngắn", "views": "", "imageUrl": "", "category": "food" | "attraction" | "cafe" | "nature", "description": "1 câu vì sao nổi bật" }]
Không bịa số lượt xem; để "views" là chuỗi rỗng.`;

  try {
    const spots = await generateJson<any[]>({ contents: prompt });
    if (!Array.isArray(spots) || spots.length === 0) throw new Error("empty");
    const now = Date.now();
    current = { spots: spots.slice(0, 12).map((s) => ({ ...s, savedAt: new Date(now).toISOString() })), source: "gemini", updatedAt: now };
    return res.json({ success: true, data: current.spots, source: "gemini", updatedAt: now });
  } catch (err: any) {
    console.error("[trending/refresh]", err?.code || "", err?.message);
    return res.json({ success: true, data: current.spots, source: current.source, updatedAt: current.updatedAt || null });
  }
});
