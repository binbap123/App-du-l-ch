import { WANDER_CHAT_SYSTEM_INSTRUCTION } from "./wander.js";

/** Giới hạn độ dài JSON lịch trình đưa vào prompt (ký tự) để không đốt token free tier. */
export const MAX_ITINERARY_PROMPT_CHARS = 24_000;

const DROP_ITEM_KEYS = new Set(["ui_card", "social_trend", "image_url", "geo_source"]);

/**
 * Rút gọn lịch trình trước khi đưa vào prompt: bỏ ui_card, social_trend, image_url, geo_source
 * và các field client tự gán (id/created_at...) ở cấp trip.
 */
export function compactItineraryForPrompt(itinerary: any): any {
  if (!itinerary || typeof itinerary !== "object") return null;
  const { meta, map_config, itinerary: days, budget_breakdown, local_insider_tips } = itinerary;
  return {
    meta,
    map_config,
    itinerary: Array.isArray(days)
      ? days.map((d: any) => ({
          day_number: d?.day_number,
          day_title: d?.day_title,
          schedule: Array.isArray(d?.schedule)
            ? d.schedule.map((item: any) => {
                const out: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(item || {})) {
                  if (!DROP_ITEM_KEYS.has(k)) out[k] = v;
                }
                return out;
              })
            : [],
        }))
      : [],
    budget_breakdown,
    local_insider_tips,
  };
}

export type ChatIntentKind = "new_itinerary" | "edit_itinerary" | "general";

/** System instruction cho chat, kèm lịch trình hiện tại (nếu có) để AI sửa tiếp. */
export function buildChatSystemInstruction(opts: {
  currentItinerary?: any;
  intent?: ChatIntentKind;
  requestedDays?: number | null;
}): string {
  const parts = [WANDER_CHAT_SYSTEM_INSTRUCTION];

  if (opts.currentItinerary) {
    let json = JSON.stringify(compactItineraryForPrompt(opts.currentItinerary));
    if (json.length > MAX_ITINERARY_PROMPT_CHARS) json = json.slice(0, MAX_ITINERARY_PROMPT_CHARS) + "…(đã cắt bớt)";
    parts.push(`LỊCH TRÌNH HIỆN TẠI trong cuộc trò chuyện (JSON rút gọn, đã bỏ ui_card/social_trend/image_url):
${json}

SỬA LỊCH TRÌNH:
- Nếu người dùng yêu cầu thay đổi lịch trình này (vd "đổi buổi tối ngày 2 thành chợ đêm", "thêm 1 ngày", "bỏ quán cà phê", "giảm chi phí"), hãy trả về "itinerary" là lịch trình ĐẦY ĐỦ đã sửa (mọi ngày, mọi field theo schema), KHÔNG chỉ phần thay đổi.
- Giữ NGUYÊN mọi phần không bị yêu cầu đổi: cùng id, place_name, time_slot, address_hint, cost_vnd, lat/lng của các điểm đó.
- Điểm mới thêm dùng id mới không trùng id cũ. Cập nhật meta.trip_duration, total_estimated_cost_vnd và budget_breakdown nếu số ngày/chi phí thay đổi.
- Trong "reply", tóm tắt ngắn gọn những gì đã đổi.
- Nếu người dùng chỉ hỏi thông tin (không yêu cầu đổi), trả "itinerary": null.`);
  }

  if (opts.intent === "edit_itinerary") {
    parts.push(`Gợi ý phân loại: tin nhắn mới nhất có vẻ là YÊU CẦU SỬA lịch trình hiện tại.`);
  } else if (opts.intent === "new_itinerary") {
    parts.push(
      `Gợi ý phân loại: tin nhắn mới nhất có vẻ là YÊU CẦU TẠO lịch trình mới${
        opts.requestedDays ? ` (BẮT BUỘC đủ ${opts.requestedDays} ngày, day_number 1..${opts.requestedDays})` : ""
      }.`
    );
  }

  return parts.join("\n\n");
}
