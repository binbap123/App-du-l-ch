import { WanderItineraryData } from "../types";

// Helper to extract destination accurately from any user message or query
export function extractDestinationFromText(text: string): { city: string; duration: string } {
  const msgLower = (text || "").toLowerCase().trim();

  // 1. Duration extraction
  let duration = "3N2Đ";
  if (msgLower.includes("1n") || msgLower.includes("1 ngày") || msgLower.includes("trong ngày")) duration = "1N";
  else if (msgLower.includes("2n1đ") || msgLower.includes("2 ngày 1 đêm") || msgLower.includes("2 ngày")) duration = "2N1Đ";
  else if (msgLower.includes("4n3đ") || msgLower.includes("4 ngày 3 đêm") || msgLower.includes("4 ngày")) duration = "4N3Đ";
  else if (msgLower.includes("5n4đ") || msgLower.includes("5 ngày 4 đêm") || msgLower.includes("5 ngày")) duration = "5N4Đ";
  else if (msgLower.includes("3n2đ") || msgLower.includes("3 ngày 2 đêm") || msgLower.includes("3 ngày")) duration = "3N2Đ";

  // 2. Exact city / destination matching (order from specific to general)
  if (msgLower.includes("hạ long") || msgLower.includes("ha long") || msgLower.includes("vịnh hạ long") || msgLower.includes("vinh ha long") || msgLower.includes("quảng ninh") || msgLower.includes("quang ninh") || msgLower.includes("bãi cháy") || msgLower.includes("bai chay") || msgLower.includes("tuần châu") || msgLower.includes("tuan chau")) {
    return { city: "Vịnh Hạ Long", duration };
  }
  if (msgLower.includes("phú quốc") || msgLower.includes("phu quoc")) return { city: "Phú Quốc", duration };
  if (msgLower.includes("đà lạt") || msgLower.includes("da lat")) return { city: "Đà Lạt", duration };
  if (msgLower.includes("huế") || msgLower.includes("hue") || msgLower.includes("cố đô")) return { city: "Cố đô Huế", duration };
  if (msgLower.includes("ninh bình") || msgLower.includes("ninh binh") || msgLower.includes("tràng an") || msgLower.includes("trang an") || msgLower.includes("tam cốc")) return { city: "Ninh Bình", duration };
  if (msgLower.includes("quy nhơn") || msgLower.includes("quy nhon") || msgLower.includes("bình định") || msgLower.includes("binh dinh")) return { city: "Quy Nhơn", duration };
  if (msgLower.includes("phú yên") || msgLower.includes("phu yen") || msgLower.includes("tuy hòa")) return { city: "Phú Yên", duration };
  if (msgLower.includes("hà giang") || msgLower.includes("ha giang") || msgLower.includes("đồng văn") || msgLower.includes("dong van")) return { city: "Hà Giang", duration };
  if (msgLower.includes("sapa") || msgLower.includes("sa pa") || msgLower.includes("lào cai") || msgLower.includes("fansipan")) return { city: "Sa Pa", duration };
  if (msgLower.includes("nha trang") || msgLower.includes("khánh hòa")) return { city: "Nha Trang", duration };
  if (msgLower.includes("đà nẵng") || msgLower.includes("da nang")) return { city: "Đà Nẵng", duration };
  if (msgLower.includes("hội an") || msgLower.includes("hoi an")) return { city: "Hội An", duration };
  if (msgLower.includes("hà nội") || msgLower.includes("ha noi") || msgLower.includes("hồ gươm")) return { city: "Hà Nội", duration };
  if (msgLower.includes("hồ chí minh") || msgLower.includes("ho chi minh") || msgLower.includes("sài gòn") || msgLower.includes("sai gon") || msgLower.includes("tp.hcm") || msgLower.includes("tphcm")) return { city: "TP. Hồ Chí Minh", duration };
  if (msgLower.includes("cần thơ") || msgLower.includes("can tho") || msgLower.includes("miền tây") || msgLower.includes("cái răng")) return { city: "Cần Thơ", duration };
  if (msgLower.includes("vũng tàu") || msgLower.includes("vung tau")) return { city: "Vũng Tàu", duration };
  if (msgLower.includes("phan thiết") || msgLower.includes("mũi né") || msgLower.includes("binh thuan")) return { city: "Phan Thiết - Mũi Né", duration };
  if (msgLower.includes("cát bà") || msgLower.includes("cat ba") || msgLower.includes("hải phòng")) return { city: "Cát Bà - Hải Phòng", duration };

  // 3. Regex extraction for dynamic destinations (e.g. "Lên kế hoạch đi Côn Đảo", "Gợi ý lịch trình Mộc Châu")
  const regexPatterns = [
    /(?:kế hoạch đi|lịch trình đi|du lịch|khám phá|tour|đi|đến|tại)\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,20}?)(?:\s+\d+n|\s+\d+\s*ngày|\s*3n2đ|\s*2n1đ|\s*săn|\s*check|\s*$|[,\.\?!])/i,
    /([A-ZÀ-Ỹa-zà-ỹ\s]{2,20}?)\s+(?:\d+n\d+đ|\d+\s*ngày)/i
  ];

  for (const regex of regexPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const lower = candidate.toLowerCase();
      if (!["cho tôi", "mình", "ngẫu nhiên", "chuyến đi", "tự chọn", "thông minh"].includes(lower) && candidate.length >= 2) {
        return { city: candidate.charAt(0).toUpperCase() + candidate.slice(1), duration };
      }
    }
  }

  return { city: "Vịnh Hạ Long", duration };
}

// Helper to parse duration string (e.g. "3N2Đ", "3 ngày 2 đêm", "2N1Đ", "4N3Đ", "5N4Đ") into number of days
export function parseDurationDays(durationStr?: string): number {
  if (!durationStr) return 3;
  const matchN = durationStr.match(/(\d+)\s*[nN]/);
  if (matchN && matchN[1]) {
    const d = parseInt(matchN[1], 10);
    if (!isNaN(d) && d > 0) return Math.min(d, 7);
  }
  const matchNgay = durationStr.match(/(\d+)\s*(?:ngày|ngay|day)/i);
  if (matchNgay && matchNgay[1]) {
    const d = parseInt(matchNgay[1], 10);
    if (!isNaN(d) && d > 0) return Math.min(d, 7);
  }
  return 3;
}

export function getSampleItinerary(destination: string, duration: string = "3N2Đ"): WanderItineraryData {
  const destLower = (destination || "Vịnh Hạ Long").trim().toLowerCase();
  const targetDays = parseDurationDays(duration);
  const durationLabel = duration.trim() || `${targetDays}N${Math.max(1, targetDays - 1)}Đ`;

  let baseData: WanderItineraryData;

  // 1. VỊNH HẠ LONG / QUẢNG NINH
  if (destLower.includes("hạ long") || destLower.includes("ha long") || destLower.includes("quảng ninh") || destLower.includes("quang ninh") || destLower.includes("bãi cháy") || destLower.includes("tuần châu")) {
    baseData = {
      meta: {
        destination: "Vịnh Hạ Long",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 3600000,
        currency_symbol: "đ",
        theme_color: "#1A73E8",
        summary: "Khám phá kỳ quan thiên nhiên thế giới Vịnh Hạ Long 3N2Đ: Trải nghiệm du thuyền ngắm vịnh di sản, chèo kayak Hang Luồn, check-in đỉnh đảo TiTop, oanh tạc Chả mực giã tay & Bảo tàng Quảng Ninh."
      },
      map_config: { recommended_zoom: 12, search_center_hint: "Bãi Cháy, Hạ Long, Quảng Ninh" },
      itinerary: [
        {
          day_number: 1,
          day_title: "Du thuyền Vịnh Hạ Long di sản, Đảo TiTop & Bánh cuốn Chả mực",
          schedule: [
            {
              id: "hl_d1_1", time_slot: "07:30 - 09:00", time_period: "morning",
              place_name: "Bánh cuốn Chả mực Bà Ngân", category: "food_specialty", category_icon: "restaurant",
              address_hint: "34 Đoàn Thị Điểm, Bạch Đằng, Hạ Long",
              recommended_dish_or_activity: "Bánh cuốn nóng tráng mỏng ăn kèm chả mực giã tay vàng ruộm giòn sần sật",
              cost_vnd: 55000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Được nhắc nhiều trên TikTok" },
              ui_card: { badge_color: "#E2A854", quick_description: "Đặc sản nức tiếng đất mỏ" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX"
            },
            {
              id: "hl_d1_2", time_slot: "09:30 - 15:30", time_period: "morning",
              place_name: "Du thuyền thăm Vịnh Hạ Long: Hang Sửng Sốt & Đảo TiTop", category: "attraction", category_icon: "photo_camera",
              address_hint: "Cảng tàu khách quốc tế Tuần Châu hoặc Sun World Bãi Cháy",
              recommended_dish_or_activity: "Đi du thuyền ngắm hòn Trống Mái, thám hiểm hang Sửng Sốt, leo 400 bậc lên đỉnh TiTop ngắm toàn cảnh 360 độ vịnh di sản",
              cost_vnd: 690000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Kỳ quan thiên nhiên thế giới" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Tuyệt tác đá vôi kỳ vĩ" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-"
            },
            {
              id: "hl_d1_3", time_slot: "16:30 - 18:30", time_period: "afternoon",
              place_name: "Tiệm Cà phê Đồi Hải Đăng ngắm Vịnh", category: "cafe", category_icon: "local_cafe",
              address_hint: "Đường Hải Đăng, Phường Bãi Cháy, Hạ Long",
              recommended_dish_or_activity: "Thưởng thức dừa xiêm mát lạnh ngắm hoàng hôn buông xuống cầu Bãi Cháy",
              cost_vnd: 60000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend Threads sống ảo" },
              ui_card: { badge_color: "#1A73E8", quick_description: "View toàn cảnh cầu Bãi Cháy" }
            },
            {
              id: "hl_d1_4", time_slot: "19:00 - 22:00", time_period: "evening",
              place_name: "Phố cổ Bãi Cháy & Chợ đêm Hạ Long", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Đường Hạ Long, Phường Bãi Cháy",
              recommended_dish_or_activity: "Thưởng thức hải sản bún cù kỳ, hàu nướng mỡ hành & chè bưởi Bãi Cháy",
              cost_vnd: 220000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Tụ điểm ẩm thực về đêm" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Hải sản tươi sống đậm vị" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Bảo tàng Quảng Ninh, Cung Cá Heo & Cáp treo Nữ Hoàng",
          schedule: [
            {
              id: "hl_d2_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: "Bảo tàng Quảng Ninh & Cung Cá Heo", category: "attraction", category_icon: "photo_camera",
              address_hint: "Đường Trần Quốc Nghiễn, Tuần Châu, TP. Hạ Long",
              recommended_dish_or_activity: "Check-in bức tường kính đen phản chiếu vịnh biển và khám phá mô hình hầm mỏ than đá độc đáo",
              cost_vnd: 40000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Top 1 check-in Quảng Ninh" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Kiến trúc than đá huyền bí" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf"
            },
            {
              id: "hl_d2_2", time_slot: "12:00 - 13:30", time_period: "morning",
              place_name: "Bún bề bề & Cù kỳ Cầu Trắng", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Khu Cầu Trắng, Hà Tu, TP. Hạ Long",
              recommended_dish_or_activity: "Tô bún bề bề tôm nõn nước dùng chua thanh ngọt lịm từ gạch cù kỳ",
              cost_vnd: 60000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Đặc sản không thể bỏ lỡ" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Nước dùng ngọt đậm đà" }
            },
            {
              id: "hl_d2_3", time_slot: "15:00 - 21:00", time_period: "afternoon",
              place_name: "Sun World Hạ Long: Cáp treo Nữ Hoàng & Vòng quay Mặt Trời", category: "attraction", category_icon: "celebration",
              address_hint: "Số 9 Hạ Long, Bãi Cháy, Quảng Ninh",
              lat: 20.9568, lng: 107.044, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Đi cáp treo 2 tầng ngắm vịnh Hạ Long từ trên cao, chơi Vòng quay Sun Wheel và dạo Vườn Nhật Zen Garden",
              cost_vnd: 350000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Kỷ lục cáp treo thế giới" },
              ui_card: { badge_color: "#1A73E8", quick_description: "Tổ hợp vui chơi giải trí đẳng cấp" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Chợ cá Hòn Gai, Mua đặc sản Chả mực Thoan & Vịnh Bái Tử Long",
          schedule: [
            {
              id: "hl_d3_1", time_slot: "06:30 - 08:30", time_period: "morning",
              place_name: "Chợ sớm Hòn Gai & Mua Chả mực Giã tay Thoan", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Chợ Hạ Long 1, Đường Lê Quý Đôn, Bạch Đằng",
              recommended_dish_or_activity: "Xem giã chả mực thủ công trực tiếp và mua chả mực nóng hổi vừa vớt khỏi chảo",
              cost_vnd: 250000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Chả mực gia truyền số 1" },
              ui_card: { badge_color: "#E2A854", quick_description: "Đặc sản vàng mua làm quà" }
            },
            {
              id: "hl_d3_2", time_slot: "09:30 - 12:00", time_period: "morning",
              place_name: "Chùa Ba Vàng / Núi Bài Thơ check-in", category: "attraction", category_icon: "photo_camera",
              address_hint: "Phường Bạch Đằng, TP. Hạ Long",
              recommended_dish_or_activity: "Ngắm bài thơ khắc trên vách đá của vua Lê Thánh Tông và toàn cảnh vịnh biển tĩnh lặng",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Di tích lịch sử thiêng liêng" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Cảnh sắc non nước hữu tình" }
            },
            {
              id: "hl_d3_3", time_slot: "12:30 - 14:30", time_period: "afternoon",
              place_name: "Nhà hàng Hải sản Cua Vàng Bãi Cháy", category: "food_specialty", category_icon: "restaurant",
              address_hint: "32 Phan Chu Trinh, Bãi Cháy, Hạ Long",
              recommended_dish_or_activity: "Thưởng thức lẩu cua biển nấu niêu đất & tu hài nướng mỡ hành",
              cost_vnd: 250000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Hải sản tươi rói" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Bữa tiệc hải sản chào tạm biệt" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 1400000, attractions_and_activities_vnd: 1400000, transport_and_others_vnd: 800000 },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Đi từ Hà Nội đến Hạ Long chỉ mất 2 tiếng qua cao tốc Hà Nội - Hải Phòng - Hạ Long rất êm ái." },
        { type: "warning", icon: "warning", content: "Khi mua chả mực ở chợ Hạ Long 1, nhớ chọn quầy giã tay thủ công như Thoan hoặc Hoài Phương để đúng chuẩn vị dai giòn." }
      ]
    };
  }
  // 2. PHÚ QUỐC
  else if (destLower.includes("phú quốc") || destLower.includes("phu quoc")) {
    baseData = {
      meta: {
        destination: "Phú Quốc",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 4500000,
        currency_symbol: "đ",
        theme_color: "#E2A854",
        summary: "Hành trình nghỉ dưỡng đảo ngọc Phú Quốc 3N2Đ: Lặn ngắm san hô Hòn Mây Rút, check-in hoàng hôn Sunset Sanato, Grand World & thưởng thức bún quậy Kiến Xây."
      },
      map_config: { recommended_zoom: 11, search_center_hint: "Dương Đông, Phú Quốc" },
      itinerary: [
        {
          day_number: 1,
          day_title: "Oanh tạc Bún quậy, Check-in Dinh Cậu & Hoàng hôn Sunset Sanato",
          schedule: [
            {
              id: "pq_d1_1", time_slot: "08:00 - 09:30", time_period: "morning",
              place_name: "Bún Quậy Kiến Xây", category: "food_specialty", category_icon: "restaurant",
              address_hint: "28 Bạch Đằng, Dương Đông, Phú Quốc",
              lat: 10.2185, lng: 103.9582, geo_source: "verified",
              recommended_dish_or_activity: "Bún quậy hải sản tôm mực tươi tự pha nước chấm",
              cost_vnd: 65000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Được nhắc nhiều trên TikTok" },
              ui_card: { badge_color: "#E2A854", quick_description: "Đặc sản trứ danh đảo ngọc" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwsezEKNM0xjso44KApjBlIAZZaPR8BbuF26IKDs89_HhDPxwROMoWQaPVUNDfJc_4Lv8HIQl4ARTiJ3iITULMA23cBds30WWklqCkoT_cB6eE750YoXTAo-Lu7qqSEdkulhVCRssUi992duh2VP-W9NxV3tFWolnDdoKQFDyDecT7QIYPjcWCJBjcxsGW99ZYhkkDCnbO8ltcNpHXOm6SnEMtCDoMdlsUKGzYpgYjh0jUqWckqEUR"
            },
            {
              id: "pq_d1_2", time_slot: "10:00 - 12:00", time_period: "morning",
              place_name: "Dinh Cậu & Biển Dương Đông", category: "attraction", category_icon: "photo_camera",
              address_hint: "Khu phố 2, Dương Đông, Phú Quốc",
              lat: 10.217, lng: 103.9563, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Thắp hương ngắm sóng biển và chụp ảnh hải đăng",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Điểm check-in truyền thống" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Biểu tượng tâm linh ven biển" }
            },
            {
              id: "pq_d1_3", time_slot: "16:30 - 18:30", time_period: "afternoon",
              place_name: "Sunset Sanato Beach Club", category: "cafe", category_icon: "local_cafe",
              address_hint: "Bãi Trường, Dương Tơ, Phú Quốc",
              lat: 10.1524, lng: 103.9682, geo_source: "verified",
              recommended_dish_or_activity: "Ngắm hoàng hôn rực rỡ bên tượng voi chân dài bí ẩn",
              cost_vnd: 100000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend Threads sống ảo" },
              ui_card: { badge_color: "#E2A854", quick_description: "Nơi ngắm hoàng hôn đẹp nhất đảo" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV"
            },
            {
              id: "pq_d1_4", time_slot: "19:30 - 22:00", time_period: "evening",
              place_name: "Chợ đêm Phú Quốc", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Đường Bạch Đằng, Dương Đông, Phú Quốc",
              lat: 10.2167, lng: 103.96, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Thưởng thức nhum nướng mỡ hành, bánh khéo & kem dừa cuộn",
              cost_vnd: 200000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Thiên đường ẩm thực đêm" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Hải sản tươi sống tại quầy" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Tour 4 Đảo Nam Phú Quốc & Cáp treo Hòn Thơm",
          schedule: [
            {
              id: "pq_d2_1", time_slot: "08:30 - 14:30", time_period: "morning",
              place_name: "Tour Cano 4 Đảo: Hòn Mây Rút, Hòn Gầm Ghì, Hòn Móng Tay", category: "attraction", category_icon: "explore",
              address_hint: "Cảng An Thới, Nam Phú Quốc",
              recommended_dish_or_activity: "Đi cano lặn ngắm san hô tự nhiên, quay flycam SUP sống ảo",
              cost_vnd: 650000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Được nhắc nhiều trên TikTok" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Trải nghiệm biển đảo tuyệt đỉnh" }
            },
            {
              id: "pq_d2_2", time_slot: "15:00 - 18:00", time_period: "afternoon",
              place_name: "Thị trấn Hoàng Hôn Sunset Town & Cầu Hôn", category: "attraction", category_icon: "photo_camera",
              address_hint: "An Thới, Phú Quốc",
              lat: 10.0321, lng: 104.0152, geo_source: "verified",
              recommended_dish_or_activity: "Dạo bộ thị trấn phong cách Địa Trung Hải và check-in Cầu Hôn Kiss Bridge",
              cost_vnd: 150000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Kiến trúc Địa Trung Hải siêu HOT" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Góc ảnh châu Âu giữa lòng đảo ngọc" }
            },
            {
              id: "pq_d2_3", time_slot: "19:30 - 21:00", time_period: "evening",
              place_name: "Show Kiss of the Sea & Pháo hoa", category: "nightlife", category_icon: "celebration",
              address_hint: "Bãi biển Sunset Town, An Thới",
              lat: 10.0321, lng: 104.0152, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Thưởng thức show trình diễn công nghệ đa phương tiện kết hợp pháo hoa đỉnh cao",
              cost_vnd: 250000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Bắn pháo hoa mỗi tối" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Show diễn đẳng cấp thế giới" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Thành phố không ngủ Grand World & Mua quà đặc sản",
          schedule: [
            {
              id: "pq_d3_1", time_slot: "09:00 - 12:00", time_period: "morning",
              place_name: "Grand World Phú Quốc (Venice thu nhỏ)", category: "attraction", category_icon: "photo_camera",
              address_hint: "Khu Bãi Dài, Gành Dầu, Bắc Phú Quốc",
              lat: 10.3341, lng: 103.8562, geo_source: "verified",
              recommended_dish_or_activity: "Đi thuyền Gondola trên sông Venice, check-in nhà tre Bamboo Legend khổng lồ",
              cost_vnd: 200000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Khu giải trí không ngủ" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Venice mộng mơ rực rỡ sắc màu" }
            },
            {
              id: "pq_d3_2", time_slot: "12:30 - 14:00", time_period: "afternoon",
              place_name: "Cơm chiên ghẹ & Gỏi cá trích Quán Ra Khơi", category: "food_specialty", category_icon: "restaurant",
              address_hint: "131 Đường 30 Tháng 4, Dương Đông",
              recommended_dish_or_activity: "Thưởng thức gỏi cá trích cuốn bánh tráng rau rừng & cơm chiên ghẹ thơm phức",
              cost_vnd: 150000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Món ăn quốc hồn đảo ngọc" },
              ui_card: { badge_color: "#E2A854", quick_description: "Hải sản tươi đậm đà" }
            },
            {
              id: "pq_d3_3", time_slot: "14:30 - 16:30", time_period: "afternoon",
              place_name: "Vườn Tiêu & Cơ sở Nước mắm Khải Hoàn", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Hùng Vương, Dương Đông",
              recommended_dish_or_activity: "Mua tiêu sọ, muối tiêu dưỡng, nước mắm truyền thống cốt nhĩ về làm quà",
              cost_vnd: 200000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Đặc sản chính gốc" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Quà tặng ý nghĩa cho người thân" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 1800000, attractions_and_activities_vnd: 1700000, transport_and_others_vnd: 1000000 },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Sử dụng xe buýt điện VinBus miễn phí chạy 24/7 từ sân bay đến Grand World cực kỳ tiện lợi." },
        { type: "warning", icon: "warning", content: "Khi ăn gỏi cá trích, nhớ uống kèm chút rượu sim Phú Quốc để ấm bụng và tăng hương vị." }
      ]
    };
  }
  // 3. CỐ ĐÔ HUẾ
  else if (destLower.includes("huế") || destLower.includes("hue") || destLower.includes("cố đô")) {
    baseData = {
      meta: {
        destination: "Cố đô Huế",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 2600000,
        currency_symbol: "đ",
        theme_color: "#8B5CF6",
        summary: "Hành trình di sản Cố đô Huế 3N2Đ: Chiêm ngưỡng Đại Nội hoàng cung, Lăng Khải Định tráng lệ, thưởng thức Bún bò Mụ Rơi, Bánh ép Cầu Hai & nghe Ca Huế trên sông Hương."
      },
      map_config: { recommended_zoom: 13, search_center_hint: "TP. Huế, Thừa Thiên Huế" },
      itinerary: [
        {
          day_number: 1,
          day_title: "Bún bò Mụ Rơi, Đại Nội Hoàng Cung & Nghe Ca Huế Sông Hương",
          schedule: [
            {
              id: "hue_d1_1", time_slot: "07:30 - 09:00", time_period: "morning",
              place_name: "Bún bò Huế Mụ Rơi", category: "food_specialty", category_icon: "restaurant",
              address_hint: "40 Nguyễn Chí Diểu, Thuận Thành, TP. Huế",
              recommended_dish_or_activity: "Tô bún bò giò heo chả cua thơm nồng mùi mắm ruốc sả ớt",
              cost_vnd: 50000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Được nhắc nhiều trên TikTok" },
              ui_card: { badge_color: "#E2A854", quick_description: "Vị ngon gia truyền 30 năm" }
            },
            {
              id: "hue_d1_2", time_slot: "09:30 - 12:30", time_period: "morning",
              place_name: "Đại Nội Huế & Cung Diên Thọ", category: "attraction", category_icon: "photo_camera",
              address_hint: "Đường 23/8, Phường Thuận Hòa, TP. Huế",
              lat: 16.4698, lng: 107.5786, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Thuê áo dài Cổ phục Nhật Bình chụp ảnh Ngọ Môn, Điện Thái Hòa",
              cost_vnd: 200000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Di sản văn hóa thế giới" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Hoàng cung triều Nguyễn nguy nga" }
            },
            {
              id: "hue_d1_3", time_slot: "15:00 - 17:30", time_period: "afternoon",
              place_name: "Chùa Thiên Mụ & Bánh bèo chén Bà Đỏ", category: "attraction", category_icon: "photo_camera",
              address_hint: "Đồi Hà Khê, Kim Long, TP. Huế",
              lat: 16.4532, lng: 107.5447, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Ngắm tháp Phước Duyên soi bóng dòng sông Hương thơ mộng",
              cost_vnd: 0,
              social_trend: { is_viral: false, platform: "none", badge_label: "Biểu tượng tâm linh cố đô" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Ngôi chùa cổ kính 400 năm" }
            },
            {
              id: "hue_d1_4", time_slot: "19:00 - 21:30", time_period: "evening",
              place_name: "Thuyền Rồng Nghe Ca Huế Sông Hương", category: "nightlife", category_icon: "celebration",
              address_hint: "Bến thuyền Tòa Khâm, Lê Lợi, TP. Huế",
              lat: 16.4665, lng: 107.589, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Đi thuyền rồng thả hoa đăng và lắng nghe nhã nhạc cung đình Huế",
              cost_vnd: 120000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Trải nghiệm văn hóa đỉnh cao" },
              ui_card: { badge_color: "#8B5CF6", quick_description: "Không gian âm nhạc cung đình" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Lăng Khải Định, Lăng Tự Đức & Làng hương Thủy Xuân",
          schedule: [
            {
              id: "hue_d2_1", time_slot: "08:30 - 11:00", time_period: "morning",
              place_name: "Lăng Khải Định (Ứng Lăng)", category: "attraction", category_icon: "photo_camera",
              address_hint: "Xã Thủy Bằng, Hương Thủy, Thừa Thiên Huế",
              lat: 16.399, lng: 107.5904, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Chiêm ngưỡng nghệ thuật ghép sành sứ tinh xảo bậc nhất phương Đông",
              cost_vnd: 150000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Đỉnh cao kiến trúc giao thoa" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Tuyệt tác phù điêu sành sứ" }
            },
            {
              id: "hue_d2_2", time_slot: "11:30 - 14:00", time_period: "morning",
              place_name: "Làng Hương Thủy Xuân sống ảo", category: "attraction", category_icon: "photo_camera",
              address_hint: "Đường Huyền Trân Công Chúa, Thủy Xuân",
              recommended_dish_or_activity: "Check-in bên những bó hương trầm đủ sắc màu rực rỡ",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Góc chụp ảnh quen thuộc" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Sắc màu làng nghề truyền thống" }
            },
            {
              id: "hue_d2_3", time_slot: "17:00 - 20:30", time_period: "evening",
              place_name: "Phố ẩm thực Chợ Đông Ba & Chè Hẻm 20 món", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Trần Hưng Đạo, Phú Hòa & Hùng Vương",
              lat: 16.4729, lng: 107.5888, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Ăn chè bột lọc bọc heo quay độc đáo & bánh bột lọc lá chuối",
              cost_vnd: 70000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Thiên đường ẩm thực Huế" },
              ui_card: { badge_color: "#E2A854", quick_description: "Đặc sản chè heo quay lạ miệng" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Cà phê Muối Nhà Trang, Đồi Vọng Cảnh & Mua Mè Xửng",
          schedule: [
            {
              id: "hue_d3_1", time_slot: "08:00 - 10:30", time_period: "morning",
              place_name: "Cà phê Muối chính gốc Huế", category: "cafe", category_icon: "local_cafe",
              address_hint: "10 Nguyễn Lương Bằng, Phú Hội, TP. Huế",
              recommended_dish_or_activity: "Thưởng thức ly cà phê muối béo ngậy mặn mòi nguyên bản nơi khai sinh",
              cost_vnd: 35000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Cái nôi Cà phê Muối" },
              ui_card: { badge_color: "#E2A854", quick_description: "Hương vị cà phê gây sốt cả nước" }
            },
            {
              id: "hue_d3_2", time_slot: "11:00 - 13:30", time_period: "morning",
              place_name: "Đồi Vọng Cảnh ngắm khúc quanh Sông Hương", category: "attraction", category_icon: "photo_camera",
              address_hint: "Đồi Vọng Cảnh, Thủy Biều, TP. Huế",
              recommended_dish_or_activity: "Dạo rừng thông lộng gió ngắm khúc uốn lượn đẹp nhất của dòng sông Hương",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Góc chill thơ mộng" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Toàn cảnh sông nước êm đềm" }
            },
            {
              id: "hue_d3_3", time_slot: "14:30 - 16:30", time_period: "afternoon",
              place_name: "Mè Xửng Thiên Hương & Tôm chua Huế", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Chợ Đông Ba / Đường Chi Lăng, TP. Huế",
              recommended_dish_or_activity: "Mua kẹo mè xửng dẻo thơm, tôm chua Trọng Tín và nón bài thơ làm quà",
              cost_vnd: 180000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Quà tặng cố đô" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Hương vị ngọt bùi xứ Huế" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 900000, attractions_and_activities_vnd: 900000, transport_and_others_vnd: 800000 },
      local_insider_tips: [
        { type: "culture", icon: "explore", content: "Nên thuê trang phục cổ phục tại khu vực đối diện cửa Hiển Nhơn để có những bức ảnh chuẩn hoàng tộc." },
        { type: "weather", icon: "wb_sunny", content: "Mùa hè ở Huế khá nắng, hãy mang theo ô dù che nắng và kem chống nắng khi đi tham quan các lăng tẩm." }
      ]
    };
  }
  // 4. NINH BÌNH
  else if (destLower.includes("ninh bình") || destLower.includes("ninh binh") || destLower.includes("tràng an") || destLower.includes("tam cốc")) {
    baseData = {
      meta: {
        destination: "Ninh Bình",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 2700000,
        currency_symbol: "đ",
        theme_color: "#15803D",
        summary: "Hành trình sơn thủy hữu tình Ninh Bình 3N2Đ: Chèo thuyền di sản Tràng An, leo 486 bậc Hang Múa săn mây mùa lúa, Tuyệt Tình Cốc & ẩm thực thịt dê cơm cháy."
      },
      map_config: { recommended_zoom: 12, search_center_hint: "Tràng An, Hoa Lư, Ninh Bình" },
      itinerary: [
        {
          day_number: 1,
          day_title: "Chèo thuyền Tràng An & Leo đỉnh Hang Múa",
          schedule: [
            {
              id: "nb_d1_1", time_slot: "08:30 - 12:30", time_period: "morning",
              place_name: "Quần thể Danh thắng Tràng An (Tuyến 3)", category: "attraction", category_icon: "photo_camera",
              address_hint: "Tràng An, Hoa Lư, Ninh Bình",
              lat: 20.254, lng: 105.9, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Đi thuyền nan qua hang Mây dài 1km, thăm phim trường Kong và Đền Suối Tiên",
              cost_vnd: 250000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Di sản kép thế giới UNESCO" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Non xanh nước biếc tuyệt mỹ" }
            },
            {
              id: "nb_d1_2", time_slot: "13:00 - 14:30", time_period: "afternoon",
              place_name: "Thịt Dê Núi & Cơm Cháy Ninh Bình", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Nhà hàng Ba Cửa, Tràng An, Hoa Lư",
              recommended_dish_or_activity: "Dê tái chanh thơm lừng cuốn lá mơ chấm tương bần, cơm cháy giòn rụm",
              cost_vnd: 160000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Đặc sản số 1 Ninh Bình" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Thịt dê săn chắc thơm ngon" }
            },
            {
              id: "nb_d1_3", time_slot: "16:00 - 18:30", time_period: "afternoon",
              place_name: "Hang Múa & Đỉnh Ngọa Long", category: "attraction", category_icon: "photo_camera",
              address_hint: "Thôn Khê Hạ, Ninh Xuân, Hoa Lư",
              lat: 20.229, lng: 105.9355, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Chinh phục 486 bậc đá ngắm toàn cảnh thung lũng lúa Tam Cốc uốn lượn",
              cost_vnd: 100000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Góc ngắm hoàng hôn triệu đô" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Vạn Lý Trường Thành thu nhỏ" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Cố Đô Hoa Lư, Động Am Tiên & Chùa Bái Đính",
          schedule: [
            {
              id: "nb_d2_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: "Tuyệt Tình Cốc - Động Am Tiên", category: "attraction", category_icon: "photo_camera",
              address_hint: "Trường Yên, Hoa Lư, Ninh Bình",
              recommended_dish_or_activity: "Chụp ảnh cổng thành cổ bên hồ nước xanh ngọc bích phẳng lặng như gương",
              cost_vnd: 50000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Khung cảnh cổ trang huyền bí" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Hồ nước ngọc bích tựa chốn bồng lai" }
            },
            {
              id: "nb_d2_2", time_slot: "14:00 - 18:00", time_period: "afternoon",
              place_name: "Quần thể Chùa Bái Đính", category: "attraction", category_icon: "photo_camera",
              address_hint: "Gia Sinh, Gia Viễn, Ninh Bình",
              lat: 20.275, lng: 105.8646, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Chiêm ngưỡng hành lang 500 tượng La Hán, Tháp Chuông đồng lớn nhất VN và ngắm đèn lồng thắp sáng về đêm",
              cost_vnd: 60000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Ngôi chùa nắm giữ nhiều kỷ lục nhất" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Tâm linh Phật giáo hùng tráng" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Tam Cốc Bích Động & Mua Cơm Cháy Ruốc làm quà",
          schedule: [
            {
              id: "nb_d3_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: "Chùa Bích Động (Nam Thiên Đệ Nhị Động)", category: "attraction", category_icon: "photo_camera",
              address_hint: "Ninh Hải, Hoa Lư, Ninh Bình",
              recommended_dish_or_activity: "Check-in cây cầu đá phủ rêu xanh cổ kính bắc qua đầm sen",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Cổng chùa cổ kính lên ảnh đẹp mê hồn" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Ngôi chùa ẩn mình trong hang đá" }
            },
            {
              id: "nb_d3_2", time_slot: "12:30 - 15:00", time_period: "afternoon",
              place_name: "Mua Cơm cháy ruốc & Rượu cần Nho Quan", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Khu trung tâm TP. Ninh Bình",
              recommended_dish_or_activity: "Chọn cơm cháy nếp thơm phủ chà bông đậm đà về làm quà",
              cost_vnd: 150000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Đặc sản chính gốc" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Quà tặng nức lòng du khách" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 950000, attractions_and_activities_vnd: 1050000, transport_and_others_vnd: 700000 },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy thuê xe đạp dạo quanh các cung đường làng Tam Cốc rợp bóng tre cực kỳ thơ mộng." },
        { type: "weather", icon: "wb_sunny", content: "Mùa lúa chín Tam Cốc (cuối tháng 5 - đầu tháng 6) là thời điểm vàng để chụp ảnh rực rỡ nhất." }
      ]
    };
  }
  // 5. ĐÀ NẴNG / HỘI AN
  else if (destLower.includes("đà nẵng") || destLower.includes("da nang") || destLower.includes("hội an") || destLower.includes("hoi an")) {
    baseData = {
      meta: {
        destination: "Đà Nẵng - Hội An",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 2800000,
        currency_symbol: "đ",
        theme_color: "#E2A854",
        summary: "Chuyến đi Đà Nẵng 3N2Đ: Oanh tạc ẩm thực Bánh tráng cuốn thịt heo, Mì Quảng, check-in Bán đảo Sơn Trà, Cầu Rồng phun lửa, Phố cổ Hội An & Cầu Vàng Bà Nà Hills."
      },
      map_config: { recommended_zoom: 12, search_center_hint: "Hải Châu, Đà Nẵng" },
      itinerary: [
        {
          day_number: 1,
          day_title: "Bánh tráng cuốn thịt heo, Bán đảo Sơn Trà & Cà phê biển",
          schedule: [
            {
              id: "dn_d1_1", time_slot: "08:00 - 09:30", time_period: "morning",
              place_name: "Bánh tráng cuốn thịt heo Hoàng Diệu", category: "food_specialty", category_icon: "restaurant",
              address_hint: "28 Hoàng Diệu, Hải Châu, Đà Nẵng",
              lat: 16.0645, lng: 108.2198, geo_source: "verified",
              recommended_dish_or_activity: "Thịt heo hai đầu da cuốn bánh tráng & mắm nêm đậm đà",
              cost_vnd: 65000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Được nhắc nhiều trên TikTok" },
              ui_card: { badge_color: "#E2A854", quick_description: "Đặc sản local trứ danh" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAJv_fxHPny19r9Mz6x1FSxf87vdPfHL8tAlxINmlvsa070RslOYxqb7IjZfd8fnGfcyhiEK6lVgkENmXi3VQT3WRvgsccRVOSOCTcWJXlXtWfXVn_08oQeRLNtSCpi2kLXMOLxjUfYffsUmlCdbilVTegtm-OUpFi_ttXlWfp8qNZe8BO7d3DmozKnLShYh7QuVuuXQXzMIOIQWpIilXEmZZExyzhrxmcYojs9jldg6gntsuhlr088"
            },
            {
              id: "dn_d1_2", time_slot: "10:00 - 12:30", time_period: "morning",
              place_name: "Bán đảo Sơn Trà & Chùa Linh Ứng", category: "attraction", category_icon: "photo_camera",
              address_hint: "Thọ Quang, Sơn Trà, Đà Nẵng",
              lat: 16.1003, lng: 108.2779, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Chụp ảnh tượng Phật Bà 67m ngắm toàn cảnh biển Mỹ Khê",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Check-in ngắm biển" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Thiên nhiên & Biển xanh" }
            },
            {
              id: "dn_d1_3", time_slot: "14:30 - 16:30", time_period: "afternoon",
              place_name: "Tiệm Cafe Sơn Trà Studio", category: "cafe", category_icon: "local_cafe",
              address_hint: "Hoàng Sa, Sơn Trà, Đà Nẵng",
              recommended_dish_or_activity: "Cà phê muối béo ngậy & ngắm biển chạng vạng",
              cost_vnd: 80000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend Threads chill" },
              ui_card: { badge_color: "#E2A854", quick_description: "Cảnh đẹp view biển" }
            },
            {
              id: "dn_d1_4", time_slot: "18:30 - 21:30", time_period: "evening",
              place_name: "Cầu Rồng & Chợ đêm Sơn Trà", category: "attraction", category_icon: "celebration",
              address_hint: "Đường Mai Hắc Đế, An Hải Tây, Sơn Trà",
              lat: 16.0617, lng: 108.2295, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Xem Cầu Rồng phun lửa (cuối tuần 21h), ăn ốc hút & hải sản nướng",
              cost_vnd: 120000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok Đà Nẵng về đêm" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Biểu tượng thành phố đáng sống" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Ẩm thực Chợ Cồn, Ngũ Hành Sơn & Phố cổ Hội An",
          schedule: [
            {
              id: "dn_d2_1", time_slot: "08:30 - 11:00", time_period: "morning",
              place_name: "Chợ Cồn - Thiên đường Ẩm thực", category: "food_specialty", category_icon: "restaurant",
              address_hint: "290 Hùng Vương, Vĩnh Trung, Hải Châu",
              lat: 16.068, lng: 108.214, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Mì Quảng ếch, Bún mắm nêm, Chè bưởi",
              cost_vnd: 90000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok Reviewer" },
              ui_card: { badge_color: "#E2A854", quick_description: "Tụ điểm ăn vặt sầm uất" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX"
            },
            {
              id: "dn_d2_2", time_slot: "14:00 - 16:00", time_period: "afternoon",
              place_name: "Danh thắng Ngũ Hành Sơn & Động Huyền Không", category: "attraction", category_icon: "photo_camera",
              address_hint: "Hòa Hải, Ngũ Hành Sơn, Đà Nẵng",
              lat: 16.004, lng: 108.263, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Khám phá động Huyền Không với luồng ánh sáng trời huyền ảo",
              cost_vnd: 40000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Kỳ quan đá non nước" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Cảnh sắc hang động tâm linh" }
            },
            {
              id: "dn_d2_3", time_slot: "16:30 - 21:00", time_period: "evening",
              place_name: "Phố cổ Hội An & Thả đèn hoa đăng", category: "attraction", category_icon: "photo_camera",
              address_hint: "Minh An, Hội An, Quảng Nam",
              lat: 15.877, lng: 108.328, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Đi thuyền sông Hoài thả đèn hoa đăng, ăn bánh mì Phượng & Cao Lầu Bá Lễ",
              cost_vnd: 200000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Di sản văn hóa thế giới" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Phố cổ huyền ảo về đêm" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Bà Nà Hills Cầu Vàng & Mua quà Chợ Hàn",
          schedule: [
            {
              id: "dn_d3_1", time_slot: "08:00 - 13:30", time_period: "morning",
              place_name: "Sun World Bà Nà Hills & Cầu Vàng", category: "attraction", category_icon: "photo_camera",
              address_hint: "Hòa Phú, Hòa Vang, Đà Nẵng",
              lat: 15.9965, lng: 107.9865, geo_source: "verified",
              recommended_dish_or_activity: "Check-in Cầu Vàng Bàn Tay Khổng Lồ, ngắm Làng Pháp mộng mơ",
              cost_vnd: 850000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Biểu tượng du lịch quốc tế" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Kỳ quan kiến trúc thế giới" },
              image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQaeLXcuxT8j0GQ-8ehr1wvon3ary3s-08q3238jTI_mjWLZ4xJqRcyx-FDcO_PId8Cy05ZyPzULXmsFiyoJd5quv6YJPAgl7Q0l3KK9_5Gro1sXZ6KzEYwyfaMjLWmUzFyxm2EBAErAoTWxJWbJVCbNOh-iSXbNYquOHWPfUNCCUUybNuLVtKuW-BbGUWoNokOowCY2mOuMailuPADz0C7Qzz3LKe0yssD0WOQxhBcS8A9rndZGIj"
            },
            {
              id: "dn_d3_2", time_slot: "14:30 - 16:30", time_period: "afternoon",
              place_name: "Chợ Hàn - Mua đặc sản làm quà", category: "food_specialty", category_icon: "restaurant",
              address_hint: "119 Trần Phú, Hải Châu 1, Đà Nẵng",
              lat: 16.0678, lng: 108.224, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Mua chả bò Đà Nẵng, mực rim me, bánh khô mè Cẩm Lệ",
              cost_vnd: 200000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Thiên đường mua sắm đặc sản" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Đặc sản chính gốc mang về" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 1100000, attractions_and_activities_vnd: 1000000, transport_and_others_vnd: 700000 },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Nên thuê xe máy nhận tại sân bay Đà Nẵng (100k-120k/ngày) tiết kiệm 60% chi phí di chuyển." },
        { type: "weather", icon: "wb_sunny", content: "Thời điểm đi Bán đảo Sơn Trà đẹp nhất là từ 7h00 - 9h00 sáng tránh nắng gắt." }
      ]
    };
  }
  // 6. ĐÀ LẠT
  else if (destLower.includes("đà lạt") || destLower.includes("da lat")) {
    baseData = {
      meta: {
        destination: "Đà Lạt",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 2900000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Hành trình săn mây Đà Lạt 3N2Đ: Check-in Cầu Đất, chill tiệm cafe Túi Mơ To view đồi thông, oanh tạc lẩu gà lá é Tao Ngộ & dạo chợ đêm."
      },
      map_config: { recommended_zoom: 12, search_center_hint: "Phường 1, Đà Lạt" },
      itinerary: [
        {
          day_number: 1,
          day_title: "Săn mây Đồi chè Cầu Đất & Chill hoàng hôn Túi Mơ To",
          schedule: [
            {
              id: "dl_d1_1", time_slot: "04:30 - 07:30", time_period: "morning",
              place_name: "Săn Mây Đồi Chè Cầu Đất", category: "attraction", category_icon: "photo_camera",
              address_hint: "Xuân Trường, Đà Lạt",
              recommended_dish_or_activity: "Chụp ảnh thảm gỗ săn mây bồng bềnh buổi sớm & uống cafe đồi chè",
              cost_vnd: 120000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Top 1 sống ảo Đà Lạt" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Trải nghiệm săn mây đỉnh cao" }
            },
            {
              id: "dl_d1_2", time_slot: "08:30 - 10:00", time_period: "morning",
              place_name: "Bánh mì xíu mại Hoàng Diệu", category: "food_specialty", category_icon: "restaurant",
              address_hint: "26 Hoàng Diệu, Phường 5, Đà Lạt",
              recommended_dish_or_activity: "Chén bánh mì xíu mại cay nồng ấm bụng kèm sữa đậu nành",
              cost_vnd: 35000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok Review" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Bữa sáng trứ danh Đà Lạt" }
            },
            {
              id: "dl_d1_3", time_slot: "14:30 - 17:30", time_period: "afternoon",
              place_name: "Tiệm Cà phê Túi Mơ To", category: "cafe", category_icon: "local_cafe",
              address_hint: "Hẻm 31 Sào Nam, Phường 11, Đà Lạt",
              recommended_dish_or_activity: "Thưởng thức trà nóng giữa vườn cúc họa mi lãng mạn ngắm thung lũng đèn",
              cost_vnd: 65000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend Threads check-in" },
              ui_card: { badge_color: "#E2A854", quick_description: "View thung lũng đèn cực đẹp" }
            },
            {
              id: "dl_d1_4", time_slot: "18:30 - 21:00", time_period: "evening",
              place_name: "Lẩu gà lá é Tao Ngộ", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Số 5 Đường 3 Tháng 4, Phường 3, Đà Lạt",
              lat: 11.9285, lng: 108.4412, geo_source: "verified",
              recommended_dish_or_activity: "Nồi lẩu gà lá é bốc khói nghi ngút chua thanh the the trong đêm lạnh",
              cost_vnd: 150000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Món ăn sưởi ấm Đà Lạt" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Lẩu trứ danh đêm se lạnh" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Thung Lũng Dasar, Chùa Linh Phước & Chợ Đêm",
          schedule: [
            {
              id: "dl_d2_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: "Chùa Ve Chai (Linh Phước)", category: "attraction", category_icon: "photo_camera",
              address_hint: "Trại Mát, Đà Lạt",
              recommended_dish_or_activity: "Chiêm ngưỡng kiến trúc khảm sành sứ độc nhất vô nhị và tượng Phật hoa bất tử",
              cost_vnd: 0,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Kỷ lục kiến trúc sành sứ" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Ngôi chùa độc đáo bậc nhất" }
            },
            {
              id: "dl_d2_2", time_slot: "14:00 - 17:00", time_period: "afternoon",
              place_name: "Khu du lịch Fresh Garden & Vườn dâu tây", category: "attraction", category_icon: "photo_camera",
              address_hint: "90 Vạn Thành, Phường 5, Đà Lạt",
              recommended_dish_or_activity: "Chụp ảnh đồi hoa rực rỡ, trải nghiệm hái dâu tây tươi tại vườn",
              cost_vnd: 120000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Vườn hoa sống ảo triệu góc" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Thiên đường sắc hoa Đà Lạt" }
            },
            {
              id: "dl_d2_3", time_slot: "18:30 - 22:00", time_period: "evening",
              place_name: "Chợ đêm Đà Lạt & Bánh tráng nướng Dì Đinh", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Khu Hòa Bình & Đường Hoàng Diệu",
              lat: 11.943, lng: 108.437, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Ăn pizza Đà Lạt bánh tráng nướng giòn rụm, uống sữa đậu nành hột gà",
              cost_vnd: 80000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Pizza Đà Lạt nức tiếng" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Không khí chợ đêm nhộn nhịp" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Hồ Tuyền Lâm, Dinh Bảo Đại & Mua đặc sản mứt sấy",
          schedule: [
            {
              id: "dl_d3_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: "Hồ Tuyền Lâm & Thiền Viện Trúc Lâm", category: "attraction", category_icon: "photo_camera",
              address_hint: "Trúc Lâm Yên Tử, Phường 3, Đà Lạt",
              lat: 11.902, lng: 108.435, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Đi cáp treo đồi Robin ngắm rừng thông, dạo quanh hồ nước xanh biếc",
              cost_vnd: 100000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Không gian bình yên tĩnh lặng" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Hồ nước thơ mộng giữa ngàn thông" }
            },
            {
              id: "dl_d3_2", time_slot: "13:00 - 15:30", time_period: "afternoon",
              place_name: "Lò mứt L'angfarm & Cửa hàng đặc sản", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Khu Chợ Đà Lạt hoặc Nguyễn Thị Minh Khai",
              recommended_dish_or_activity: "Thưởng thức buffet trà mứt sấy và mua hồng treo gió, atisô về làm quà",
              cost_vnd: 200000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Đặc sản chính hãng" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Hồng treo gió chuẩn Đà Lạt" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 900000, attractions_and_activities_vnd: 1200000, transport_and_others_vnd: 800000 },
      local_insider_tips: [
        { type: "weather", icon: "cloud", content: "Đà Lạt chiều tối nhiệt độ xuống 14-16°C, nhớ mang theo áo len và áo khoác ấm." },
        { type: "transport", icon: "motorcycle", content: "Đường đèo dốc nhiều khúc cua khuất tầm nhìn, lái xe máy chậm rãi và chú ý quan sát." }
      ]
    };
  }
  // 7. HÀ NỘI
  else if (destLower.includes("hà nội") || destLower.includes("ha noi")) {
    baseData = {
      meta: {
        destination: "Hà Nội",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 2700000,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "Du lịch thủ đô Hà Nội ngàn năm văn hiến 3N2Đ: Dạo quanh Hồ Gươm, Lăng Bác, Cà phê trứng Giảng, phố cổ 36 phố phường & ẩm thực Bún chả Hàng Quạt."
      },
      map_config: { recommended_zoom: 13, search_center_hint: "Hoàn Kiếm, Hà Nội" },
      itinerary: [
        {
          day_number: 1,
          day_title: "Phở Bát Đàn, Lăng Bác & Cà phê trứng Giảng",
          schedule: [
            {
              id: "hn_d1_1", time_slot: "07:30 - 09:00", time_period: "morning",
              place_name: "Phở Bò Bát Đàn", category: "food_specialty", category_icon: "restaurant",
              address_hint: "49 Bát Đàn, Cửa Đông, Hoàn Kiếm",
              lat: 21.0345, lng: 105.8472, geo_source: "verified",
              recommended_dish_or_activity: "Xếp hàng ăn phở bò gia truyền nước dùng ngọt thanh trong vắt",
              cost_vnd: 60000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Phở gia truyền xếp hàng" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Tinh hoa ẩm thực Hà Thành" }
            },
            {
              id: "hn_d1_2", time_slot: "09:30 - 11:30", time_period: "morning",
              place_name: "Lăng Chủ tịch Hồ Chí Minh & Chùa Một Cột", category: "attraction", category_icon: "photo_camera",
              address_hint: "Hùng Vương, Điện Biên, Ba Đình",
              lat: 21.0367, lng: 105.8346, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Vào lăng viếng Bác và dạo quanh khu nhà sàn, ao cá Bác Hồ",
              cost_vnd: 0,
              social_trend: { is_viral: false, platform: "none", badge_label: "Điểm tham quan lịch sử" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Trái tim thiêng liêng đất nước" }
            },
            {
              id: "hn_d1_3", time_slot: "14:30 - 16:30", time_period: "afternoon",
              place_name: "Cà phê Giảng - Cà phê Trứng", category: "cafe", category_icon: "local_cafe",
              address_hint: "39 Nguyễn Hữu Huân, Lý Thái Tổ, Hoàn Kiếm",
              lat: 21.0332, lng: 105.8545, geo_source: "verified",
              recommended_dish_or_activity: "Thưởng thức cà phê trứng nóng ngậy béo thơm trứ danh",
              cost_vnd: 40000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Hot TikTok ẩm thực thủ đô" },
              ui_card: { badge_color: "#E2A854", quick_description: "Nơi khai sinh Cà phê trứng" }
            },
            {
              id: "hn_d1_4", time_slot: "18:30 - 22:00", time_period: "evening",
              place_name: "Phố Tạ Hiện & Dạo Hồ Hoàn Kiếm", category: "nightlife", category_icon: "celebration",
              address_hint: "Tạ Hiện, Hàng Buồm, Hoàn Kiếm",
              lat: 21.035, lng: 105.852, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Uống bia hơi vỉa hè Tạ Hiện, nem chua rán và dạo phố đi bộ",
              cost_vnd: 150000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Ngã tư quốc tế sôi động" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Cuộc sống về đêm náo nhiệt" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Văn Miếu, Bún chả Obama & Hoàng Thành Thăng Long",
          schedule: [
            {
              id: "hn_d2_1", time_slot: "08:30 - 11:00", time_period: "morning",
              place_name: "Văn Miếu - Quốc Tử Giám", category: "attraction", category_icon: "photo_camera",
              address_hint: "58 Quốc Tử Giám, Đống Đa, Hà Nội",
              lat: 21.0285, lng: 105.8355, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Tham quan trường đại học đầu tiên của Việt Nam, xin chữ may mắn",
              cost_vnd: 30000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Biểu tượng hiếu học" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Di tích lịch sử văn hóa ngàn năm" }
            },
            {
              id: "hn_d2_2", time_slot: "11:30 - 13:00", time_period: "morning",
              place_name: "Bún chả Hương Liên (Bún chả Obama)", category: "food_specialty", category_icon: "restaurant",
              address_hint: "24 Lê Văn Hưu, Phan Chu Trinh, Hai Bà Trưng",
              lat: 21.0183, lng: 105.8535, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Combo bún chả thịt nướng than hoa + nem cua bể giòn rụm",
              cost_vnd: 70000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Quán bún chả nổi tiếng thế giới" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Hương vị thịt nướng thơm lừng" }
            },
            {
              id: "hn_d2_3", time_slot: "14:30 - 17:00", time_period: "afternoon",
              place_name: "Hoàng Thành Thăng Long & Cột cờ Hà Nội", category: "attraction", category_icon: "photo_camera",
              address_hint: "19C Hoàng Diệu, Quán Thánh, Ba Đình",
              lat: 21.0352, lng: 105.84, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Khám phá di sản khảo cổ học UNESCO, chụp ảnh áo dài cổ trang",
              cost_vnd: 30000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Trend chụp ảnh áo dài" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Dấu ấn các triều đại lịch sử" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Hồ Tây, Chùa Trấn Quốc & Mua sắm Ô mai Hàng Đường",
          schedule: [
            {
              id: "hn_d3_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: "Chùa Trấn Quốc & Cà phê Ven Hồ Tây", category: "attraction", category_icon: "local_cafe",
              address_hint: "Đường Thanh Niên, Yên Phụ, Tây Hồ",
              lat: 21.048, lng: 105.8368, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Viếng ngôi chùa cổ nhất Hà Nội bên đường Thanh Niên lộng gió và ăn kem Hồ Tây",
              cost_vnd: 30000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Góc ngắm cảnh chill nhất thủ đô" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Không gian thoáng đãng bên mặt hồ" }
            },
            {
              id: "hn_d3_2", time_slot: "14:00 - 16:30", time_period: "afternoon",
              place_name: "Phố Ô mai Hàng Đường & Bánh cốm Hàng Than", category: "food_specialty", category_icon: "restaurant",
              address_hint: "Phố Hàng Đường & Hàng Than, Hoàn Kiếm",
              lat: 21.0375, lng: 105.8495, geo_source: "ai_estimate",
              recommended_dish_or_activity: "Thử và mua ô mai sấu bao tử, bánh cốm dẻo thơm mang về làm quà thủ đô",
              cost_vnd: 150000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Đặc sản truyền thống thủ đô" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Vị ngon nồng nàn ký ức Hà Nội" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 1100000, attractions_and_activities_vnd: 800000, transport_and_others_vnd: 800000 },
      local_insider_tips: [
        { type: "culture", icon: "explore", content: "Hãy trải nghiệm ngồi xích lô dạo quanh 36 phố phường để cảm nhận nhịp sống chậm rãi của Hà Nội." },
        { type: "weather", icon: "wb_sunny", content: "Mùa thu Hà Nội (tháng 9-11) là thời điểm đẹp nhất năm với hoa sữa thơm và nắng vàng ươm." }
      ]
    };
  }
  // 8. GENERIC FALLBACK FOR ANY OTHER LOCATION
  else {
    const capitalizedDest = destination.charAt(0).toUpperCase() + destination.slice(1);
    baseData = {
      meta: {
        destination: capitalizedDest || "Việt Nam",
        trip_duration: durationLabel,
        total_estimated_cost_vnd: 2800000,
        currency_symbol: "đ",
        theme_color: "#E2A854",
        summary: `Hành trình khám phá trọn vẹn nét đẹp thiên nhiên, đặc sản ẩm thực và các tọa độ check-in HOT nhất tại ${capitalizedDest}.`
      },
      map_config: { recommended_zoom: 12, search_center_hint: `${capitalizedDest}, Việt Nam` },
      itinerary: [
        {
          day_number: 1,
          day_title: "Oanh tạc ẩm thực đặc sắc & Địa điểm check-in tiêu biểu",
          schedule: [
            {
              id: "gen_d1_1", time_slot: "08:00 - 09:30", time_period: "morning",
              place_name: `Bữa sáng đặc sản truyền thống ${capitalizedDest}`, category: "food_specialty", category_icon: "restaurant",
              address_hint: `Trung tâm ${capitalizedDest}`,
              recommended_dish_or_activity: "Thưởng thức món ăn địa phương nức tiếng truyền đời",
              cost_vnd: 55000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Quán địa phương nổi bật" },
              ui_card: { badge_color: "#E2A854", quick_description: "Vị ngon chuẩn bản địa" }
            },
            {
              id: "gen_d1_2", time_slot: "10:00 - 12:30", time_period: "morning",
              place_name: `Danh thắng biểu tượng ${capitalizedDest}`, category: "attraction", category_icon: "photo_camera",
              address_hint: `Khu thắng cảnh ${capitalizedDest}`,
              recommended_dish_or_activity: "Chụp ảnh lưu niệm toàn cảnh, trải nghiệm không gian thiên nhiên trong lành",
              cost_vnd: 50000,
              social_trend: { is_viral: true, platform: "facebook", badge_label: "Tuyệt tác tự nhiên" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Không gian thoáng đãng & check-in" }
            },
            {
              id: "gen_d1_3", time_slot: "15:00 - 17:30", time_period: "afternoon",
              place_name: "Tiệm Cà phê view ngắm cảnh hoàng hôn", category: "cafe", category_icon: "local_cafe",
              address_hint: `Khu trung tâm ${capitalizedDest}`,
              recommended_dish_or_activity: "Nhâm nhi ly nước đặc trưng, ngắm nhìn phố phường và hoàng hôn buông xuống",
              cost_vnd: 60000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Tọa độ sống ảo cực xịn" },
              ui_card: { badge_color: "#E2A854", quick_description: "View xinh thư giãn" }
            }
          ]
        },
        {
          day_number: 2,
          day_title: "Khám phá văn hóa bản địa, danh lam & chợ đêm",
          schedule: [
            {
              id: "gen_d2_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: `Di tích lịch sử - văn hóa ${capitalizedDest}`, category: "attraction", category_icon: "explore",
              address_hint: `Thành phố ${capitalizedDest}`,
              recommended_dish_or_activity: "Tìm hiểu phong tục tập quán và dấu ấn lịch sử lâu đời của vùng đất",
              cost_vnd: 40000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Văn hóa truyền thống" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Dấu ấn văn hóa cổ truyền" }
            },
            {
              id: "gen_d2_2", time_slot: "18:00 - 21:30", time_period: "evening",
              place_name: `Phố đi bộ & Chợ đêm ẩm thực ${capitalizedDest}`, category: "nightlife", category_icon: "restaurant",
              address_hint: `Khu phố trung tâm ${capitalizedDest}`,
              recommended_dish_or_activity: "Thưởng thức các món ăn vặt đường phố nóng hổi và cảm nhận nhịp sống về đêm",
              cost_vnd: 120000,
              social_trend: { is_viral: true, platform: "tiktok", badge_label: "Ẩm thực đường phố náo nhiệt" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Phố đêm sầm uất" }
            }
          ]
        },
        {
          day_number: 3,
          day_title: "Trải nghiệm sinh thái & Mua sắm đặc sản làm quà",
          schedule: [
            {
              id: "gen_d3_1", time_slot: "08:30 - 11:30", time_period: "morning",
              place_name: `Khu du lịch sinh thái ngoại ô ${capitalizedDest}`, category: "attraction", category_icon: "photo_camera",
              address_hint: `Khu vực ngoại ô ${capitalizedDest}`,
              recommended_dish_or_activity: "Tận hưởng bầu không khí trong lành và chụp ảnh lưu niệm cùng bạn bè",
              cost_vnd: 60000,
              social_trend: { is_viral: true, platform: "threads", badge_label: "Điểm dã ngoại yên bình" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Thiên nhiên xanh mát" }
            },
            {
              id: "gen_d3_2", time_slot: "14:00 - 16:30", time_period: "afternoon",
              place_name: `Chợ truyền thống ${capitalizedDest}`, category: "food_specialty", category_icon: "restaurant",
              address_hint: `Khu thương mại ${capitalizedDest}`,
              recommended_dish_or_activity: "Chọn mua những món đặc sản tươi ngon, bánh trái thủ công mang về cho người thân",
              cost_vnd: 180000,
              social_trend: { is_viral: false, platform: "none", badge_label: "Đặc sản chính gốc" },
              ui_card: { badge_color: "#FF6B35", quick_description: "Món quà trọn vẹn nghĩa tình" }
            }
          ]
        }
      ],
      budget_breakdown: { food_and_drink_vnd: 1100000, attractions_and_activities_vnd: 1000000, transport_and_others_vnd: 700000 },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy thuê xe máy để linh hoạt khám phá các cung đường và ngõ hẻm ẩm thực." },
        { type: "weather", icon: "wb_sunny", content: "Chuẩn bị sẵn máy ảnh và kem chống nắng để lưu lại những bức ảnh kỷ niệm tuyệt đẹp." }
      ]
    };
  }

  // Adjust number of days based on targetDays
  if (targetDays <= baseData.itinerary.length) {
    baseData.itinerary = baseData.itinerary.slice(0, targetDays);
  } else {
    const currentCount = baseData.itinerary.length;
    for (let i = currentCount + 1; i <= targetDays; i++) {
      baseData.itinerary.push({
        day_number: i,
        day_title: `Ngày ${i} - Khám phá tự do & Trải nghiệm chuyên sâu`,
        schedule: [
          {
            id: `ext_d${i}_1`, time_slot: "09:00 - 11:30", time_period: "morning",
            place_name: `Cà phê sáng thư giãn tại ${baseData.meta.destination}`,
            category: "cafe", category_icon: "local_cafe",
            address_hint: `Khu trung tâm ${baseData.meta.destination}`,
            recommended_dish_or_activity: "Thưởng thức điểm tâm nhẹ và đồ uống ngắm phố phường",
            cost_vnd: 50000,
            social_trend: { is_viral: false, platform: "none", badge_label: "Thư giãn ngày mới" },
            ui_card: { badge_color: "#E2A854", quick_description: "Không gian nghỉ ngơi thư thái" }
          },
          {
            id: `ext_d${i}_2`, time_slot: "14:30 - 17:30", time_period: "afternoon",
            place_name: `Tự do khám phá các góc phố cổ & check-in`,
            category: "attraction", category_icon: "photo_camera",
            address_hint: `${baseData.meta.destination}`,
            recommended_dish_or_activity: "Dạo chơi mua sắm quà lưu niệm và chụp ảnh tự do",
            cost_vnd: 100000,
            social_trend: { is_viral: true, platform: "threads", badge_label: "Trải nghiệm cá nhân hóa" },
            ui_card: { badge_color: "#1B6D24", quick_description: "Khoảnh khắc tự do theo sở thích" }
          }
        ]
      });
    }
  }

  baseData.meta.trip_duration = durationLabel;
  return baseData;
}
