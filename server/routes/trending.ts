import { Router } from "express";
import { limits } from "../lib/rateLimit.js";
import { generateJson, isGeminiConfigured } from "../lib/gemini.js";

/**
 * Trending trung thực: KHÔNG có số lượt xem (trước đây Gemini tự bịa "45M views").
 * - Danh sách tuyển chọn (source "fallback") khi chưa có Gemini.
 * - Làm mới bằng Gemini tối đa 1 lần/6 giờ (khi thành công) và không thử lại trong 30 phút sau khi lỗi,
 *   dù gọi qua POST /refresh hay tự động khi GET thấy dữ liệu cũ. UI hiện "Gợi ý bởi AI • cập nhật <ngày>".
 */

const REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const FAILED_RETRY_MS = 30 * 60 * 1000;
const PLATFORMS = ["tiktok", "threads", "facebook", "instagram"];
const CATEGORIES = ["food", "attraction", "cafe", "nature"];
const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  threads: "Threads",
  facebook: "Facebook",
  instagram: "Instagram",
};

export const FALLBACK_TRENDING: any[] = [
  {
    id: "trend_1", name: "Bánh mì Phượng Hội An", city: "Hội An",
    platform: "tiktok", badge_label: "Nổi tiếng trên TikTok",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    category: "food", description: "Ổ bánh mì nhân thập cẩm huyền thoại được du khách trong nước và quốc tế yêu thích",
  },
  {
    id: "trend_2", name: "Hang Múa Ninh Bình", city: "Ninh Bình",
    platform: "threads", badge_label: "Được bàn tán trên Threads",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-",
    category: "attraction", description: "Leo 486 bậc đá ngắm toàn cảnh sông Ngô Đồng và mùa lúa Tam Cốc đẹp mê hồn",
  },
  {
    id: "trend_3", name: "Eo Gió Quy Nhơn", city: "Quy Nhơn",
    platform: "facebook", badge_label: "Hay xuất hiện trên Facebook Reels",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    category: "nature", description: "Vách đá ven biển gió lộng với con đường dạo bộ ôm sát biển cực kỳ ấn tượng",
  },
  {
    id: "trend_4", name: "Chợ nổi Cái Răng", city: "Cần Thơ",
    platform: "tiktok", badge_label: "Quen thuộc với TikTok du lịch",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
    category: "attraction", description: "Chợ nổi sông nước miền Tây độc đáo họp từ tờ mờ sáng với món hủ tiếu ghe trứ danh",
  },
  {
    id: "trend_5", name: "Sunset Sanato Phú Quốc", city: "Phú Quốc",
    platform: "threads", badge_label: "Điểm ngắm hoàng hôn nổi tiếng",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV",
    category: "cafe", description: "Bar bãi biển đón hoàng hôn lãng mạn bậc nhất đảo ngọc Phú Quốc",
  },
  {
    id: "trend_6", name: "Bún bò Huế Mụ Rơi", city: "Huế",
    platform: "facebook", badge_label: "Quán quen của dân địa phương",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui",
    category: "food", description: "Quán bún bò gia truyền 30 năm cay nồng thơm mùi sả ruốc chuẩn vị cố đô",
  },
];

/** Bỏ mọi số liệu lượt xem/like mà model có thể tự nghĩ ra; chuẩn hoá field. */
export function sanitizeSpot(raw: any, i: number, savedAt: string) {
  const platform = PLATFORMS.includes(String(raw?.platform)) ? String(raw.platform) : "tiktok";
  const category = CATEGORIES.includes(String(raw?.category)) ? String(raw.category) : "attraction";
  let badge = typeof raw?.badge_label === "string" ? raw.badge_label.trim().slice(0, 40) : "";
  if (!badge || /\d|views?|lượt|triệu|nghìn/i.test(badge)) badge = `Được nhắc nhiều trên ${PLATFORM_LABEL[platform]}`;
  return {
    id: typeof raw?.id === "string" && raw.id ? raw.id.slice(0, 40) : `trend_ai_${i + 1}`,
    name: String(raw?.name || "").slice(0, 80),
    city: String(raw?.city || "").slice(0, 60),
    platform,
    badge_label: badge,
    imageUrl: typeof raw?.imageUrl === "string" && /^https:\/\//.test(raw.imageUrl) ? raw.imageUrl : "",
    category,
    description: String(raw?.description || "").slice(0, 200),
    savedAt,
  };
}

/** State in-memory (server free tier không có ổ đĩa bền vững). */
let current: { spots: any[]; source: string; updatedAt: number } = {
  spots: FALLBACK_TRENDING,
  source: "fallback",
  updatedAt: 0,
};
let lastAttemptAt = 0;
let refreshing: Promise<void> | null = null;

const PROMPT = `Bạn là chuyên gia du lịch Việt Nam. Liệt kê 6 địa điểm du lịch/ẩm thực Việt Nam đang được nhiều người quan tâm trên mạng xã hội gần đây.
Trả về JSON array:
[{ "id": "trend_X", "name": "...", "city": "...", "platform": "tiktok" | "threads" | "facebook", "badge_label": "nhãn ngắn, KHÔNG chứa con số", "imageUrl": "", "category": "food" | "attraction" | "cafe" | "nature", "description": "1 câu vì sao nổi bật" }]
Tuyệt đối không đưa ra số lượt xem, lượt thích hay bất kỳ số liệu thống kê nào.`;

function canRefresh(now = Date.now()) {
  if (!isGeminiConfigured()) return false;
  if (current.source === "gemini" && now - current.updatedAt < REFRESH_COOLDOWN_MS) return false;
  if (now - lastAttemptAt < FAILED_RETRY_MS) return false;
  return true;
}

function refreshTrending(): Promise<void> {
  if (refreshing) return refreshing;
  lastAttemptAt = Date.now();
  refreshing = (async () => {
    try {
      const spots = await generateJson<any[]>({ contents: PROMPT });
      if (!Array.isArray(spots) || spots.length === 0) throw new Error("empty");
      const now = Date.now();
      const savedAt = new Date(now).toISOString();
      const clean = spots
        .slice(0, 12)
        .map((s, i) => sanitizeSpot(s, i, savedAt))
        .filter((s) => s.name);
      if (clean.length === 0) throw new Error("empty after sanitize");
      current = { spots: clean, source: "gemini", updatedAt: now };
    } catch (err: any) {
      console.error("[trending/refresh]", err?.code || "", err?.message);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function payload() {
  return { success: true, data: current.spots, source: current.source, updatedAt: current.updatedAt || null };
}

export const trendingRouter = Router();

trendingRouter.get("/api/trending-spots", limits.read, (_req, res) => {
  // Dữ liệu cũ → làm mới nền (không chờ). Người dùng không tự ép gọi Gemini được.
  if (canRefresh()) void refreshTrending();
  res.json(payload());
});

/** Giữ cho nút "Làm mới" — cùng cooldown như trên nên không thể dùng để đốt quota Gemini. */
trendingRouter.post("/api/trending-spots/refresh", limits.generate, async (_req, res) => {
  if (canRefresh()) await refreshTrending();
  return res.json(payload());
});
