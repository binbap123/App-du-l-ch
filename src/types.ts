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
}

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
  id?: string;
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

export interface PlaceMarker {
  id: string;
  name: string;
  category: "food" | "cafe" | "attraction" | "park";
  distance: string;
  rating?: number;
  views?: string;
  isHotTikTok?: boolean;
  hotBadge?: string;
  imageUrl: string;
  topPercent: string;
  leftPercent: string;
}

export interface TrendingSpot {
  id: string;
  name: string;
  city: string;
  platform: "tiktok" | "threads" | "instagram" | "facebook";
  badge_label: string;
  views: string;
  imageUrl: string;
  category: "food" | "attraction" | "cafe" | "nature";
  description: string;
  savedAt?: string;
}
