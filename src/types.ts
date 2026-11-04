export type TabType = "explore" | "trending" | "ai_assistant" | "itinerary" | "map" | "builder" | "settings";

export interface SocialTrend {
  is_viral: boolean;
  platform: "tiktok" | "threads" | "facebook" | "none" | string;
  badge_label: string;
  sentiment_score?: number;
}

export interface UICard {
  badge_color: string;
  quick_description: string;
}

export interface ScheduleItem {
  id: string;
  time_slot: string;
  time_period: "morning" | "afternoon" | "evening" | "night" | string;
  place_name: string;
  category: "food_specialty" | "attraction" | "cafe" | "accommodation" | "nightlife" | string;
  category_icon: string;
  address_hint: string;
  recommended_dish_or_activity: string;
  cost_vnd: number;
  social_trend: SocialTrend;
  ui_card: UICard;
  image_url?: string;
  lat?: number;
  lng?: number;
  /** Nguồn tọa độ: DB đã xác minh > geocode (Nominatim) > AI ước lượng. UI phải hiện khác nhau. */
  geo_source?: GeoSource;
}

export type GeoSource = "verified" | "geocoded" | "ai_estimate";

export interface DayItinerary {
  day_number: number;
  day_title: string;
  schedule: ScheduleItem[];
}

export interface BudgetBreakdown {
  food_and_drink_vnd: number;
  attractions_and_activities_vnd: number;
  transport_and_others_vnd: number;
}

export interface LocalTip {
  type: "transport" | "culture" | "warning" | "weather" | string;
  icon: string;
  content: string;
}

export interface MetaInfo {
  destination: string;
  trip_duration: string;
  total_estimated_cost_vnd: number;
  currency_symbol: string;
  theme_color: string;
  summary: string;
}

export interface MapConfig {
  recommended_zoom: number;
  search_center_hint: string;
}

export interface WanderItineraryData {
  /** tripStore (Agent Data) luôn gán id khi lưu; dữ liệu từ AI chưa lưu có thể chưa có. */
  id?: string;
  /** ISO timestamps — tripStore gán */
  created_at?: string;
  updated_at?: string;
  /** Ngày bắt đầu chuyến đi (YYYY-MM-DD), để builder hiển thị ngày thật */
  start_date?: string;
  meta: MetaInfo;
  map_config: MapConfig;
  itinerary: DayItinerary[];
  budget_breakdown: BudgetBreakdown;
  local_insider_tips: LocalTip[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  itineraryData?: WanderItineraryData;
}

export interface TrendingSpot {
  id: string;
  name: string;
  city: string;
  platform: "tiktok" | "threads" | "instagram" | "facebook";
  badge_label: string;
  /** @deprecated server không còn trả số lượt xem (tránh số liệu bịa) */
  views?: string;
  imageUrl: string;
  category: "food" | "attraction" | "cafe" | "nature";
  description: string;
  savedAt?: string;
}

/** Nguồn dữ liệu do server trả về, để UI gắn nhãn "Lịch trình mẫu" khi fallback. */
export type DataSource = "gemini" | "cache" | "sample" | "error" | "verified" | "database";

/** Body lỗi chuẩn của mọi /api */
export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}
