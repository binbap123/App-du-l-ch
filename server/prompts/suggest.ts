import { COORDINATE_RULES, NO_FABRICATION_RULES } from "./wander.js";

export const SUGGEST_SYSTEM_INSTRUCTION = `Bạn là "WanderAI" - chuyên gia du lịch Việt Nam. Nhiệm vụ: gợi ý thêm địa điểm cho MỘT ngày trong lịch trình.

QUY TẮC:
- Chỉ JSON thuần theo schema: { "suggestions": [ScheduleItem...] }.
- Chỉ gợi ý địa điểm CÓ THẬT, đang hoạt động, nằm trong đúng thành phố/điểm đến được yêu cầu.
- Đa dạng loại hình (ăn uống đặc sản, cà phê, tham quan, hoạt động buổi tối).
- KHÔNG gợi ý lại các địa điểm người dùng đã có.
- Mỗi gợi ý: id ngắn, time_slot (vd "15:00 - 16:30"), time_period, place_name, category, category_icon (material icon), address_hint, recommended_dish_or_activity, cost_vnd (VND), lat, lng, social_trend, ui_card.
- Mọi chuỗi hiển thị bằng tiếng Việt tự nhiên.

${COORDINATE_RULES}

${NO_FABRICATION_RULES}`;

export function buildSuggestPrompt(opts: {
  destination: string;
  dayIndex: number;
  count: number;
  exclude: string[];
}): string {
  const excludeList = opts.exclude.length ? opts.exclude.map((p) => `- ${p}`).join("\n") : "(chưa có)";
  return `Điểm đến: ${opts.destination}
Ngày: ${opts.dayIndex + 1}
Số gợi ý cần: ${opts.count}
Các địa điểm ĐÃ CÓ (không lặp lại):
${excludeList}`;
}
