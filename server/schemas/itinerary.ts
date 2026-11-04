import { Type } from "@google/genai";

/**
 * MỘT nguồn duy nhất cho responseSchema của lịch trình (trước đây bị lặp 2 lần trong server.ts).
 * Phải khớp với `WanderItineraryData` trong src/types.ts.
 */

const scheduleItemSchema = {
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
    // Tọa độ ước lượng — tùy chọn. Agent Map sẽ geocode lại nếu thiếu.
    lat: { type: Type.NUMBER },
    lng: { type: Type.NUMBER },
    social_trend: {
      type: Type.OBJECT,
      properties: {
        is_viral: { type: Type.BOOLEAN },
        platform: { type: Type.STRING },
        badge_label: { type: Type.STRING },
        sentiment_score: { type: Type.NUMBER },
      },
      required: ["is_viral", "platform", "badge_label"],
    },
    ui_card: {
      type: Type.OBJECT,
      properties: {
        badge_color: { type: Type.STRING },
        quick_description: { type: Type.STRING },
      },
      required: ["badge_color", "quick_description"],
    },
  },
  required: [
    "id",
    "time_slot",
    "time_period",
    "place_name",
    "category",
    "category_icon",
    "address_hint",
    "recommended_dish_or_activity",
    "cost_vnd",
    "social_trend",
    "ui_card",
  ],
};

const itineraryProperties = {
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
    required: ["destination", "trip_duration", "total_estimated_cost_vnd", "currency_symbol", "theme_color", "summary"],
  },
  map_config: {
    type: Type.OBJECT,
    properties: {
      recommended_zoom: { type: Type.NUMBER },
      search_center_hint: { type: Type.STRING },
    },
    required: ["recommended_zoom", "search_center_hint"],
  },
  itinerary: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day_number: { type: Type.NUMBER },
        day_title: { type: Type.STRING },
        schedule: { type: Type.ARRAY, items: scheduleItemSchema },
      },
      required: ["day_number", "day_title", "schedule"],
    },
  },
  budget_breakdown: {
    type: Type.OBJECT,
    properties: {
      food_and_drink_vnd: { type: Type.NUMBER },
      attractions_and_activities_vnd: { type: Type.NUMBER },
      transport_and_others_vnd: { type: Type.NUMBER },
    },
    required: ["food_and_drink_vnd", "attractions_and_activities_vnd", "transport_and_others_vnd"],
  },
  local_insider_tips: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        icon: { type: Type.STRING },
        content: { type: Type.STRING },
      },
      required: ["type", "icon", "content"],
    },
  },
};

/** Schema cho /api/generate-itinerary — bắt buộc đủ field. */
export const itineraryResponseSchema = {
  type: Type.OBJECT,
  properties: itineraryProperties,
  required: ["meta", "map_config", "itinerary", "budget_breakdown", "local_insider_tips"],
};

/** Schema cho /api/chat — `itinerary` tùy chọn (null khi chỉ trò chuyện). */
export const chatResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    itinerary: { type: Type.OBJECT, properties: itineraryProperties },
  },
  required: ["reply"],
};

/** Kiểm tra tối thiểu để không đưa JSON hỏng lên UI. */
export function looksLikeItinerary(x: any): boolean {
  return (
    !!x &&
    typeof x === "object" &&
    !!x.meta &&
    typeof x.meta.destination === "string" &&
    Array.isArray(x.itinerary) &&
    x.itinerary.length > 0 &&
    x.itinerary.every((d: any) => Array.isArray(d?.schedule))
  );
}
