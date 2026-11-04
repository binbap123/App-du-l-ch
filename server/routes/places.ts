import { Router } from "express";
import { limits } from "../lib/rateLimit.js";
import { parseBody } from "../lib/http.js";
import { placesSearchBody } from "../lib/validate.js";
import { TTLCache, normalizeKey } from "../lib/cache.js";
import { searchLocalPlaces, type PlaceSearchResult } from "../../src/data/placesData.js";

/**
 * Tiết kiệm quota SerpApi (D4):
 * - FE chỉ gọi POST /api/places/search khi người dùng bấm Enter/nút tìm hoặc đổi thành phố/danh mục
 *   (gõ phím chỉ lọc DB nội bộ). Kết quả SerpApi cache 24h theo (query, city).
 * - Autocomplete chỉ gọi SerpApi khi SERPAPI_AUTOCOMPLETE=true; mặc định trả [].
 */

const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";
const GMAPS_ICON = "https://www.gstatic.com/images/branding/product/1x/places_16dp.png";
const DAY = 24 * 60 * 60 * 1000;

const searchCache = new TTLCache<PlaceSearchResult[]>(500, DAY);
const autocompleteCache = new TTLCache<any[]>(1000, DAY);

function serpKey() {
  return process.env.SERPAPI_API_KEY || "";
}

export function isAutocompleteEnabled() {
  return process.env.SERPAPI_AUTOCOMPLETE === "true" && !!serpKey();
}

function serpCategory(types: string[]): { category: PlaceSearchResult["category"]; label: string; icon: string } {
  const t = types || [];
  if (t.some((x) => /restaurant|food|meal_takeaway|bakery|caf[eé]|coffee/i.test(x))) {
    if (t.some((x) => /caf[eé]|coffee/i.test(x))) return { category: "cafe", label: "Cà Phê & Check-in", icon: "local_cafe" };
    return { category: "food_specialty", label: "Quán Ăn Đặc Sản", icon: "restaurant" };
  }
  if (t.some((x) => /hotel|lodging|inn|resort|hostel/i.test(x)))
    return { category: "accommodation", label: "Khách Sạn / Homestay", icon: "hotel" };
  if (t.some((x) => /night_club|bar|club/i.test(x)))
    return { category: "nightlife", label: "Vui Chơi & Nightlife", icon: "celebration" };
  if (t.some((x) => /market|mall|store|shopping/i.test(x)))
    return { category: "shopping", label: "Mua Sắm & Chợ", icon: "shopping_bag" };
  return { category: "attraction", label: "Điểm Tham Quan & Check-in", icon: "photo_camera" };
}

function categoryQuery(token: string): string {
  const map: Record<string, string> = {
    food: " quán ăn đặc sản nhà hàng",
    food_specialty: " quán ăn đặc sản nhà hàng",
    cafe: " quán cà phê check-in",
    attraction: " điểm tham quan du lịch",
    shopping: " chợ trung tâm mua sắm",
    accommodation: " khách sạn homestay",
    nightlife: " quán bar club giải trí đêm",
    trending: " điểm du lịch nổi tiếng",
  };
  return map[token] || "";
}

export function cityToLatLng(city: string): string {
  const map: Record<string, string> = {
    "Đà Nẵng": "16.0544,108.2022",
    "Hội An": "15.8799,108.3350",
    "Phú Quốc": "10.2899,103.9840",
    "Đà Lạt": "11.9404,108.4583",
    "Hà Nội": "21.0285,105.8542",
    "TP. Hồ Chí Minh": "10.8231,106.6297",
    "Hồ Chí Minh": "10.8231,106.6297",
    "Nha Trang": "12.2388,109.1967",
    Sapa: "22.3364,103.8440",
    "Sa Pa": "22.3364,103.8440",
    Huế: "16.4637,107.5909",
    "Quy Nhơn": "13.7700,109.2190",
    "Ninh Bình": "20.2506,105.9743",
    "Vịnh Hạ Long": "20.9101,107.1839",
    "Hạ Long": "20.9101,107.1839",
  };
  return map[city] || map[city.split("-")[0].trim()] || "16.0544,108.2022";
}

function estimateCostFromPrice(price: string): number {
  const n = parseInt(price.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? 60000 : n;
}

async function searchSerpMaps(query: string, city: string, category: string): Promise<PlaceSearchResult[]> {
  let textQuery = query.trim();
  if (city && city !== "all" && city !== "tất cả") textQuery = textQuery ? `${textQuery} ${city}` : city;
  if (category && category !== "all") textQuery += categoryQuery(category);
  if (!textQuery) textQuery = "địa điểm du lịch nổi tiếng Việt Nam";

  const cacheKey = normalizeKey(textQuery, city);
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    engine: "google_maps",
    q: textQuery,
    type: "search",
    ll: `@${cityToLatLng(city)},14z`,
    hl: "vi",
    gl: "vn",
    google_domain: "google.com.vn",
    api_key: serpKey(),
  });

  const r = await fetch(`${SERPAPI_SEARCH_URL}?${params.toString()}`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`SerpApi HTTP ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(data.error);

  const raw: any[] = Array.isArray(data.local_results) ? data.local_results : [];
  const cityName = (city || "").split("-")[0].trim();

  const mapped = raw.map((p: any, i: number): PlaceSearchResult => {
    const types: string[] = Array.isArray(p.types) ? p.types : [p.type || ""];
    const cat = serpCategory(types);
    const gps = p.gps_coordinates || {};
    return {
      id: p.data_id || `serp_${Date.now()}_${i}`,
      name: p.title || "Không rõ tên",
      category: cat.category,
      category_label: cat.label || p.type || "Địa điểm",
      category_icon: cat.icon,
      address: p.address || "",
      city: cityName || p.address?.split(",").pop()?.trim() || "Việt Nam",
      rating: p.rating ?? 0,
      user_ratings_total: p.reviews ?? 0,
      price_level_text: p.price || "Tùy theo lựa chọn",
      cost_vnd: typeof p.price === "string" ? estimateCostFromPrice(p.price) : 60000,
      opening_hours_text: p.open_state || "",
      open_now: typeof p.open_state === "string" ? /open|mở cửa/i.test(p.open_state) : undefined,
      recommended_dish_or_activity: p.description || "Khám phá và trải nghiệm tại đây",
      photo_url: p.thumbnail || GMAPS_ICON,
      social_trend: { is_viral: false, platform: "none", badge_label: "Google Maps" },
      google_maps_url:
        p.place_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.title || "")}`,
      lat: gps.latitude,
      lng: gps.longitude,
      quick_description: p.description || cat.label,
    };
  });

  searchCache.set(cacheKey, mapped);
  return mapped;
}

export const placesRouter = Router();

placesRouter.get("/api/places/search", limits.read, (req, res) => {
  const body = parseBody(placesSearchBody, req.query, res);
  if (!body) return;
  res.json({ success: true, data: searchLocalPlaces(body.query, body.city, body.category), source: "database" });
});

placesRouter.post("/api/places/search", limits.placesSearch, async (req, res) => {
  const body = parseBody(placesSearchBody, req.body, res);
  if (!body) return;
  const localResults = searchLocalPlaces(body.query, body.city, body.category);

  if (!serpKey()) return res.json({ success: true, data: localResults, source: "database" });

  try {
    const mapped = await searchSerpMaps(body.query, body.city, body.category);
    const combined: PlaceSearchResult[] = [...localResults];
    for (const gp of mapped) {
      if (!combined.some((c) => c.name.toLowerCase() === gp.name.toLowerCase())) combined.push(gp);
    }
    return res.json({ success: true, data: combined, source: "serpapi_google_maps" });
  } catch (err: any) {
    console.error("[places/search] SerpApi error:", err?.message);
    return res.json({ success: true, data: localResults, source: "database_fallback" });
  }
});

placesRouter.get("/api/places/autocomplete", limits.placesSearch, async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 120);
  const city = String(req.query.city || "").trim().slice(0, 60);
  if (!isAutocompleteEnabled() || q.length < 2) return res.json({ success: true, data: [] });

  const query = city && city !== "all" && city !== "tất cả" ? `${q} ${city}` : q;
  const key = normalizeKey(query);
  const cached = autocompleteCache.get(key);
  if (cached) return res.json({ success: true, data: cached });

  try {
    const params = new URLSearchParams({ engine: "google_maps_autocomplete", q: query, api_key: serpKey() });
    const r = await fetch(`${SERPAPI_SEARCH_URL}?${params.toString()}`, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`SerpApi autocomplete HTTP ${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    const suggestions = (data.suggestions || []).map((s: any, i: number) => ({
      id: s.data_id || `ac_${i}_${normalizeKey(s.value || s.title || "")}`,
      description: s.value || s.title || "",
      placeName: s.title || s.value || "",
      address: s.address || "",
      lat: s.gps_coordinates?.latitude,
      lng: s.gps_coordinates?.longitude,
    }));
    autocompleteCache.set(key, suggestions);
    return res.json({ success: true, data: suggestions });
  } catch (err: any) {
    console.error("[places/autocomplete]", err?.message);
    return res.json({ success: true, data: [] });
  }
});
