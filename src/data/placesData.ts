export interface PlaceSearchResult {
  id: string;
  name: string;
  category: "food_specialty" | "cafe" | "attraction" | "accommodation" | "nightlife" | "shopping" | "nature";
  category_label: string;
  category_icon: string;
  address: string;
  city: string;
  rating: number;
  user_ratings_total: number;
  price_level_text: string;
  cost_vnd: number;
  opening_hours_text: string;
  open_now?: boolean;
  recommended_dish_or_activity: string;
  photo_url: string;
  social_trend?: {
    is_viral: boolean;
    platform: "tiktok" | "threads" | "facebook" | "none";
    badge_label: string;
  };
  google_maps_url: string;
  lat?: number;
  lng?: number;
  quick_description: string;
}

export const VERIFIED_VIETNAM_PLACES: PlaceSearchResult[] = [
  // ĐÀ NẴNG
  {
    id: "dn_banhtrang_hoangdieu",
    name: "Bánh Tráng Cuốn Thịt Heo Hoàng Diệu",
    category: "food_specialty",
    category_label: "Quán Ăn Đặc Sản",
    category_icon: "restaurant",
    address: "28 Hoàng Diệu, Phước Ninh, Hải Châu, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.8,
    user_ratings_total: 2450,
    price_level_text: "50.000đ - 90.000đ",
    cost_vnd: 65000,
    opening_hours_text: "Đang mở cửa • 09:00 - 21:30",
    open_now: true,
    recommended_dish_or_activity: "Thịt heo hai đầu da cuốn bánh tráng kèm mắm nêm đậm đà",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAJv_fxHPny19r9Mz6x1FSxf87vdPfHL8tAlxINmlvsa070RslOYxqb7IjZfd8fnGfcyhiEK6lVgkENmXi3VQT3WRvgsccRVOSOCTcWJXlXtWfXVn_08oQeRLNtSCpi2kLXMOLxjUfYffsUmlCdbilVTegtm-OUpFi_ttXlWfp8qNZe8BO7d3DmozKnLShYh7QuVuuXQXzMIOIQWpIilXEmZZExyzhrxmcYojs9jldg6gntsuhlr088",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "🔥 Nổi tiếng trên TikTok"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Banh+Trang+Thit+Heo+Hoang+Dieu+Da+Nang",
    lat: 16.0645,
    lng: 108.2198,
    quick_description: "Đặc sản Đà Nẵng trứ danh với mắm nêm bí truyền"
  },
  {
    id: "dn_che_lien",
    name: "Chè Liên - Đặc Sản Chè Thái Sầu Riêng Đà Nẵng",
    category: "food_specialty",
    category_label: "Ăn Vặt & Tráng Miệng",
    category_icon: "local_cafe",
    address: "189 Hoàng Diệu, Nam Dương, Hải Châu, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.7,
    user_ratings_total: 5120,
    price_level_text: "25.000đ - 45.000đ",
    cost_vnd: 35000,
    opening_hours_text: "Đang mở cửa • 08:00 - 22:30",
    open_now: true,
    recommended_dish_or_activity: "Chè Thái Sầu Riêng múi to béo ngậy, Tàu hũ Singapore",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQaeLXcuxT8j0GQ-8ehr1wvon3ary3s-08q3238jTI_mjWLZ4xJqRcyx-FDcO_PId8Cy05ZyPzULXmsFiyoJd5quv6YJPAgl7Q0l3KK9_5Gro1sXZ6KzEYwyfaMjLWmUzFyxm2EBAErAoTWxJWbJVCbNOh-iSXbNYquOHWPfUNCCUUybNuLVtKuW-BbGUWoNokOowCY2mOuMailuPADz0C7Qzz3LKe0yssD0WOQxhBcS8A9rndZGIj",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Quán chè số 1 Đà Nẵng"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Che+Lien+Hoang+Dieu+Da+Nang",
    lat: 16.0598,
    lng: 108.2165,
    quick_description: "Thương hiệu chè sầu riêng nổi tiếng nhất miền Trung"
  },
  {
    id: "dn_miquang_ech",
    name: "Mì Quảng Ếch Bếp Trang",
    category: "food_specialty",
    category_label: "Quán Ăn Đặc Sản",
    category_icon: "restaurant",
    address: "24 Pasteur, Hải Châu 1, Hải Châu, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.6,
    user_ratings_total: 1890,
    price_level_text: "55.000đ - 95.000đ",
    cost_vnd: 70000,
    opening_hours_text: "Đang mở cửa • 07:00 - 22:00",
    open_now: true,
    recommended_dish_or_activity: "Mì Quảng ếch om niêu đất nóng hổi ăn kèm bánh tráng mè nướng",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    social_trend: {
      is_viral: true,
      platform: "threads",
      badge_label: "Check-in hot ẩm thực"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Mi+Quang+Ech+Bep+Trang+Da+Nang",
    lat: 16.0692,
    lng: 108.2215,
    quick_description: "Mì Quảng biến tấu độc đáo phong cách mẹt truyền thống"
  },
  {
    id: "dn_cau_rong",
    name: "Cầu Rồng Đà Nẵng & Công viên bờ Đông",
    category: "attraction",
    category_label: "Điểm Tham Quan & Check-in",
    category_icon: "photo_camera",
    address: "Đường Nguyễn Văn Linh nối Võ Văn Kiệt, Sơn Trà, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.9,
    user_ratings_total: 14500,
    price_level_text: "Miễn phí",
    cost_vnd: 0,
    opening_hours_text: "Mở cả ngày • Phun lửa & nước 21h Thứ 7, CN",
    open_now: true,
    recommended_dish_or_activity: "Xem Rồng phun lửa, ngắm cầu Tình Yêu & chụp tượng Cá chép hóa rồng",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Biểu tượng Đà Nẵng"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Cau+Rong+Da+Nang",
    lat: 16.0611,
    lng: 108.2269,
    quick_description: "Cây cầu biểu tượng với màn phun lửa nước ấn tượng"
  },
  {
    id: "dn_son_tra_studio",
    name: "Sơn Trà Marina - Santorini phiên bản Đà Nẵng",
    category: "cafe",
    category_label: "Cà Phê View Biển",
    category_icon: "local_cafe",
    address: "Đường Hồ Xanh, Thọ Quang, Sơn Trà, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.7,
    user_ratings_total: 3100,
    price_level_text: "60.000đ - 110.000đ",
    cost_vnd: 85000,
    opening_hours_text: "Đang mở cửa • 07:00 - 22:00",
    open_now: true,
    recommended_dish_or_activity: "Thưởng thức Trà ổi hồng, Cà phê muối ngắm hoàng hôn vịnh Đà Nẵng",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    social_trend: {
      is_viral: true,
      platform: "threads",
      badge_label: "Góc ảnh phong cách Santorini"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Son+Tra+Marina+Da+Nang",
    lat: 16.1084,
    lng: 108.2576,
    quick_description: "Quán cà phê kiến trúc trắng xanh phong cách Địa Trung Hải ôm trọn biển"
  },
  {
    id: "dn_bana_hills",
    name: "Sun World Bà Nà Hills & Cầu Vàng",
    category: "attraction",
    category_label: "Khu Du Lịch & Cáp Treo",
    category_icon: "photo_camera",
    address: "Thôn An Sơn, Xã Hòa Ninh, Hòa Vang, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.9,
    user_ratings_total: 28000,
    price_level_text: "850.000đ - 1.250.000đ",
    cost_vnd: 900000,
    opening_hours_text: "Đang mở cửa • 07:30 - 21:00",
    open_now: true,
    recommended_dish_or_activity: "Đi cáp treo đạt kỷ lục Guinness, check-in Cầu Vàng Bàn Tay Khổng Lồ",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQaeLXcuxT8j0GQ-8ehr1wvon3ary3s-08q3238jTI_mjWLZ4xJqRcyx-FDcO_PId8Cy05ZyPzULXmsFiyoJd5quv6YJPAgl7Q0l3KK9_5Gro1sXZ6KzEYwyfaMjLWmUzFyxm2EBAErAoTWxJWbJVCbNOh-iSXbNYquOHWPfUNCCUUybNuLVtKuW-BbGUWoNokOowCY2mOuMailuPADz0C7Qzz3LKe0yssD0WOQxhBcS8A9rndZGIj",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Cầu Vàng nổi tiếng thế giới"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Ba+Na+Hills+Cau+Vang+Da+Nang",
    lat: 15.9965,
    lng: 107.9865,
    quick_description: "Đỉnh núi tiên cảnh với Làng Pháp, Cầu Vàng và khí hậu 4 mùa trong 1 ngày"
  },
  {
    id: "dn_hai_san_nam_danh",
    name: "Hải Sản Năm Đảnh Sơn Trà",
    category: "food_specialty",
    category_label: "Hải Sản Tươi Sống",
    category_icon: "restaurant",
    address: "K139/H59/38 Trần Quang Khải, Thọ Quang, Sơn Trà, Đà Nẵng",
    city: "Đà Nẵng",
    rating: 4.6,
    user_ratings_total: 6200,
    price_level_text: "60.000đ - 150.000đ/món",
    cost_vnd: 180000,
    opening_hours_text: "Đang mở cửa • 10:00 - 20:30",
    open_now: true,
    recommended_dish_or_activity: "Nghêu hấp sả, ghẹ rang me, ốc hương sốt trứng muối, mực chiên mắm",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwsezEKNM0xjso44KApjBlIAZZaPR8BbuF26IKDs89_HhDPxwROMoWQaPVUNDfJc_4Lv8HIQl4ARTiJ3iITULMA23cBds30WWklqCkoT_cB6eE750YoXTAo-Lu7qqSEdkulhVCRssUi992duh2VP-W9NxV3tFWolnDdoKQFDyDecT7QIYPjcWCJBjcxsGW99ZYhkkDCnbO8ltcNpHXOm6SnEMtCDoMdlsUKGzYpgYjh0jUqWckqEUR",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Hải sản ngon bổ rẻ nức tiếng"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Hai+San+Nam+Danh+Da+Nang",
    lat: 16.0965,
    lng: 108.2415,
    quick_description: "Quán hải sản trong ngõ nhưng luôn tấp nập khách sành ăn"
  },

  // PHÚ QUỐC
  {
    id: "pq_bun_quay_kien_xay",
    name: "Bún Quậy Kiến Xây - Bạch Đằng",
    category: "food_specialty",
    category_label: "Quán Ăn Đặc Sản",
    category_icon: "restaurant",
    address: "28 Bạch Đằng, Phường Dương Đông, Phú Quốc",
    city: "Phú Quốc",
    rating: 4.8,
    user_ratings_total: 4800,
    price_level_text: "50.000đ - 85.000đ",
    cost_vnd: 65000,
    opening_hours_text: "Đang mở cửa • 07:30 - 22:30",
    open_now: true,
    recommended_dish_or_activity: "Bún quậy tôm mực tươi xay nóng tại chỗ, tự pha nước chấm thần thánh",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwsezEKNM0xjso44KApjBlIAZZaPR8BbuF26IKDs89_HhDPxwROMoWQaPVUNDfJc_4Lv8HIQl4ARTiJ3iITULMA23cBds30WWklqCkoT_cB6eE750YoXTAo-Lu7qqSEdkulhVCRssUi992duh2VP-W9NxV3tFWolnDdoKQFDyDecT7QIYPjcWCJBjcxsGW99ZYhkkDCnbO8ltcNpHXOm6SnEMtCDoMdlsUKGzYpgYjh0jUqWckqEUR",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Món ăn quốc dân Phú Quốc"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Bun+Quay+Kien+Xay+Bach+Dang+Phu+Quoc",
    lat: 10.2185,
    lng: 103.9582,
    quick_description: "Đặc sản độc nhất vô nhị trải nghiệm tự pha nước chấm tại chỗ"
  },
  {
    id: "pq_sunset_sanato",
    name: "Sunset Sanato Beach Club Phú Quốc",
    category: "cafe",
    category_label: "Beach Club Hoàng Hôn",
    category_icon: "local_cafe",
    address: "Khu Bãi Trường, Ấp Đường Bào, Dương Tơ, Phú Quốc",
    city: "Phú Quốc",
    rating: 4.7,
    user_ratings_total: 3950,
    price_level_text: "80.000đ - 180.000đ",
    cost_vnd: 120000,
    opening_hours_text: "Đang mở cửa • 08:00 - 21:00",
    open_now: true,
    recommended_dish_or_activity: "Chụp ảnh tượng voi chân dài, tượng đầu người tách đôi ngắm hoàng hôn",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV",
    social_trend: {
      is_viral: true,
      platform: "threads",
      badge_label: "Trend sống ảo hoàng hôn"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Sunset+Sanato+Phu+Quoc",
    lat: 10.1524,
    lng: 103.9682,
    quick_description: "Thánh địa ngắm hoàng hôn rực rỡ bên biển đảo Ngọc"
  },
  {
    id: "pq_grand_world",
    name: "Grand World Phú Quốc - Thành phố không ngủ",
    category: "attraction",
    category_label: "Khu Giải Trí & Venice Thu Nhỏ",
    category_icon: "celebration",
    address: "Bãi Dài, Gành Dầu, Phú Quốc, Kiên Giang",
    city: "Phú Quốc",
    rating: 4.8,
    user_ratings_total: 12000,
    price_level_text: "Miễn phí vé vào cổng",
    cost_vnd: 200000,
    opening_hours_text: "Mở cửa 24/7",
    open_now: true,
    recommended_dish_or_activity: "Đi thuyền Gondola trên kênh Venice, xem show thực cảnh Tinh Hoa Việt Nam",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Show diễn sắc màu Venice"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Grand+World+Phu+Quoc",
    lat: 10.3341,
    lng: 103.8562,
    quick_description: "Trung tâm giải trí, ẩm thực và mua sắm sầm uất thắp sáng cả ngày lẫn đêm"
  },
  {
    id: "pq_sunset_town",
    name: "Thị Trấn Hoàng Hôn Sunset Town & Cầu Hôn Kiss Bridge",
    category: "attraction",
    category_label: "Điểm Check-in & Pháo Hoa",
    category_icon: "photo_camera",
    address: "Khu đô thị Sun Grand City An Thới, Nam Phú Quốc",
    city: "Phú Quốc",
    rating: 4.9,
    user_ratings_total: 8200,
    price_level_text: "150.000đ - 250.000đ",
    cost_vnd: 180000,
    opening_hours_text: "Mở cả ngày • Pháo hoa lúc 21:00 hàng đêm",
    open_now: true,
    recommended_dish_or_activity: "Dạo bước trên Cầu Hôn, check-in tháp đồng hồ Venice và xem pháo hoa",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Bắn pháo hoa mỗi tối"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Sunset+Town+Phu+Quoc+Kiss+Bridge",
    lat: 10.0321,
    lng: 104.0152,
    quick_description: "Kiến trúc Địa Trung Hải rực rỡ với show diễn đa phương tiện Kiss of the Sea"
  },

  // HỘI AN
  {
    id: "ha_banhmi_phuong",
    name: "Bánh Mì Phượng Hội An",
    category: "food_specialty",
    category_label: "Quán Ăn Đặc Sản",
    category_icon: "restaurant",
    address: "2B Phan Chu Trinh, Phường Cẩm Châu, Hội An, Quảng Nam",
    city: "Hội An",
    rating: 4.7,
    user_ratings_total: 8900,
    price_level_text: "30.000đ - 45.000đ",
    cost_vnd: 35000,
    opening_hours_text: "Đang mở cửa • 06:30 - 21:30",
    open_now: true,
    recommended_dish_or_activity: "Bánh mì thập cẩm pate bơ thịt nướng được Anthony Bourdain ca ngợi",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Bánh mì ngon nhất thế giới"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Banh+Mi+Phuong+Hoi+An",
    lat: 15.8792,
    lng: 108.3312,
    quick_description: "Ổ bánh mì giòn rụm với nước sốt đậm đà nổi danh toàn cầu"
  },
  {
    id: "ha_pho_co_hoa_dang",
    name: "Chùa Cầu & Thả Đèn Hoa Đăng Sông Hoài",
    category: "attraction",
    category_label: "Di Sản Văn Hóa",
    category_icon: "photo_camera",
    address: "Đường Nguyễn Thị Minh Khai, Phường Minh An, Hội An",
    city: "Hội An",
    rating: 4.9,
    user_ratings_total: 19500,
    price_level_text: "20.000đ - 100.000đ (đi thuyền)",
    cost_vnd: 50000,
    opening_hours_text: "Mở cả ngày • Lung linh nhất từ 18:00",
    open_now: true,
    recommended_dish_or_activity: "Đi thuyền gỗ thả hoa đăng cầu may mắn, thưởng thức Cao Lầu phố cổ",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-",
    social_trend: {
      is_viral: true,
      platform: "threads",
      badge_label: "Phố đèn lồng huyền ảo"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Chua+Cau+Song+Hoai+Hoi+An",
    lat: 15.8771,
    lng: 108.3262,
    quick_description: "Trái tim di sản phố cổ rực rỡ đèn lồng và dòng sông Hoài thơ mộng"
  },

  // ĐÀ LẠT
  {
    id: "dl_tiem_ca_phe_cheo_veo",
    name: "Tiệm Cà Phê Chèo Veooo Đà Lạt",
    category: "cafe",
    category_label: "Cà Phê Săn Mây & Hoàng Hôn",
    category_icon: "local_cafe",
    address: "116 Hùng Vương, Hẻm Dã Chiến, Phường 11, Đà Lạt",
    city: "Đà Lạt",
    rating: 4.8,
    user_ratings_total: 2900,
    price_level_text: "50.000đ - 75.000đ",
    cost_vnd: 60000,
    opening_hours_text: "Đang mở cửa • 06:00 - 21:00",
    open_now: true,
    recommended_dish_or_activity: "Săn mây thung lũng sáng sớm, thưởng thức cacao nóng ngắm hoàng hôn",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    social_trend: {
      is_viral: true,
      platform: "threads",
      badge_label: "Chill hoàng hôn Đà Lạt"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Tiem+Ca+Phe+Cheo+Veo+Da+Lat",
    lat: 11.9421,
    lng: 108.4715,
    quick_description: "Quán cà phê mộc mạc bên triền dốc ngắm trọn thung lũng đèn đêm"
  },
  {
    id: "dl_lau_ga_la_e_tao_ngo",
    name: "Lẩu Gà Lá É Tao Ngộ - 3/4",
    category: "food_specialty",
    category_label: "Quán Ăn Đặc Sản",
    category_icon: "restaurant",
    address: "Số 5 Đường 3/4, Phường 3, Đà Lạt, Lâm Đồng",
    city: "Đà Lạt",
    rating: 4.7,
    user_ratings_total: 6800,
    price_level_text: "200.000đ - 350.000đ/nồi",
    cost_vnd: 120000,
    opening_hours_text: "Đang mở cửa • 08:00 - 22:00",
    open_now: true,
    recommended_dish_or_activity: "Lẩu gà đồi chắc thịt thơm lừng lá é cay nồng giữa tiết trời se lạnh",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwsezEKNM0xjso44KApjBlIAZZaPR8BbuF26IKDs89_HhDPxwROMoWQaPVUNDfJc_4Lv8HIQl4ARTiJ3iITULMA23cBds30WWklqCkoT_cB6eE750YoXTAo-Lu7qqSEdkulhVCRssUi992duh2VP-W9NxV3tFWolnDdoKQFDyDecT7QIYPjcWCJBjcxsGW99ZYhkkDCnbO8ltcNpHXOm6SnEMtCDoMdlsUKGzYpgYjh0jUqWckqEUR",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Món ăn sưởi ấm Đà Lạt"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Lau+Ga+La+E+Tao+Ngo+3/4+Da+Lat",
    lat: 11.9285,
    lng: 108.4412,
    quick_description: "Món lẩu trứ danh không thể bỏ qua mỗi khi đặt chân đến xứ sở ngàn hoa"
  },
  {
    id: "dl_quang_truong_lam_vien",
    name: "Quảng Trường Lâm Viên & Nụ Hoa Atiso",
    category: "attraction",
    category_label: "Điểm Tham Quan & Check-in",
    category_icon: "photo_camera",
    address: "Đường Trần Quốc Toản, Phường 10, Đà Lạt",
    city: "Đà Lạt",
    rating: 4.8,
    user_ratings_total: 15400,
    price_level_text: "Miễn phí",
    cost_vnd: 0,
    opening_hours_text: "Mở cả ngày",
    open_now: true,
    recommended_dish_or_activity: "Chụp ảnh Bông hoa dã quỳ khổng lồ và nụ hoa Atiso kính màu bên bờ hồ Xuân Hương",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Tọa độ check-in quốc dân"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Quang+Truong+Lam+Vien+Da+Lat",
    lat: 11.9362,
    lng: 108.4451,
    quick_description: "Biểu tượng trung tâm thành phố ngắm trọn vẻ đẹp hồ Xuân Hương"
  },

  // HÀ NỘI
  {
    id: "hn_pho_bat_dan",
    name: "Phở Gia Truyền Bát Đàn",
    category: "food_specialty",
    category_label: "Quán Ăn Đặc Sản",
    category_icon: "restaurant",
    address: "49 Bát Đàn, Cửa Đông, Hoàn Kiếm, Hà Nội",
    city: "Hà Nội",
    rating: 4.7,
    user_ratings_total: 7300,
    price_level_text: "55.000đ - 85.000đ",
    cost_vnd: 65000,
    opening_hours_text: "Đang mở cửa • 06:00 - 10:00 & 18:00 - 20:30",
    open_now: true,
    recommended_dish_or_activity: "Phở bò tái lăn nước dùng ngọt thanh gia truyền từ xương bò hầm",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Huyền thoại ẩm thực phố cổ"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Pho+Gia+Truyen+Bat+Dan+Ha+Noi",
    lat: 21.0345,
    lng: 105.8472,
    quick_description: "Quán phở xếp hàng nổi tiếng nhất 36 phố phường Hà Nội"
  },
  {
    id: "hn_cafe_giang_trung",
    name: "Cafe Giảng - Cà Phê Trứng Nguyên Bản 1946",
    category: "cafe",
    category_label: "Cà Phê Cổ Truyền",
    category_icon: "local_cafe",
    address: "39 Nguyễn Hữu Huân, Lý Thái Tổ, Hoàn Kiếm, Hà Nội",
    city: "Hà Nội",
    rating: 4.8,
    user_ratings_total: 9200,
    price_level_text: "35.000đ - 55.000đ",
    cost_vnd: 40000,
    opening_hours_text: "Đang mở cửa • 07:00 - 22:30",
    open_now: true,
    recommended_dish_or_activity: "Cà phê trứng nóng đánh bông mịn béo ngậy, Cacao trứng",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQaeLXcuxT8j0GQ-8ehr1wvon3ary3s-08q3238jTI_mjWLZ4xJqRcyx-FDcO_PId8Cy05ZyPzULXmsFiyoJd5quv6YJPAgl7Q0l3KK9_5Gro1sXZ6KzEYwyfaMjLWmUzFyxm2EBAErAoTWxJWbJVCbNOh-iSXbNYquOHWPfUNCCUUybNuLVtKuW-BbGUWoNokOowCY2mOuMailuPADz0C7Qzz3LKe0yssD0WOQxhBcS8A9rndZGIj",
    social_trend: {
      is_viral: true,
      platform: "threads",
      badge_label: "Nơi khai sinh cà phê trứng"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Cafe+Giang+Nguyen+Huu+Huan+Ha+Noi",
    lat: 21.0332,
    lng: 105.8545,
    quick_description: "Nơi cụ Giảng sáng tạo ra món cà phê trứng trứ danh làm say lòng du khách"
  },
  {
    id: "hn_ho_hoan_kiem",
    name: "Hồ Hoàn Kiếm, Tháp Rùa & Cầu Thê Húc Đền Ngọc Sơn",
    category: "attraction",
    category_label: "Di Tích Lịch Sử & Thắng Cảnh",
    category_icon: "photo_camera",
    address: "Phố Đinh Tiên Hoàng, Hàng Trống, Hoàn Kiếm, Hà Nội",
    city: "Hà Nội",
    rating: 4.9,
    user_ratings_total: 24000,
    price_level_text: "30.000đ (vé vào đền)",
    cost_vnd: 30000,
    opening_hours_text: "Mở cả ngày • Phố đi bộ cuối tuần",
    open_now: true,
    recommended_dish_or_activity: "Dạo quanh bờ hồ, chụp cầu Thê Húc son đỏ và ăn kem Tràng Tiền",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-",
    social_trend: {
      is_viral: true,
      platform: "facebook",
      badge_label: "Trái tim thủ đô nghìn năm"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Ho+Hoan+Kiem+Den+Ngoc+Son+Ha+Noi",
    lat: 21.0287,
    lng: 105.8523,
    quick_description: "Trái tim lịch sử và văn hóa ngàn năm văn hiến của thủ đô Hà Nội"
  },

  // TP. HỒ CHÍ MINH
  {
    id: "hcm_cho_ben_thanh",
    name: "Chợ Bến Thành & Khu Ẩm Thực Đêm",
    category: "shopping",
    category_label: "Chợ Truyền Thống & Ẩm Thực",
    category_icon: "shopping_bag",
    address: "Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
    city: "TP. Hồ Chí Minh",
    rating: 4.6,
    user_ratings_total: 21000,
    price_level_text: "40.000đ - 120.000đ",
    cost_vnd: 80000,
    opening_hours_text: "Đang mở cửa • 06:00 - 22:00",
    open_now: true,
    recommended_dish_or_activity: "Ăn bún suông, chè Sài Gòn, gỏi cuốn & mua sắm quà lưu niệm",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui",
    social_trend: {
      is_viral: true,
      platform: "tiktok",
      badge_label: "Biểu tượng Sài Gòn"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Cho+Ben+Thanh+Quan+1+TPHCM",
    lat: 10.7725,
    lng: 106.6981,
    quick_description: "Khu chợ lịch sử giao thương sầm uất hơn 100 năm tại trung tâm Sài Gòn"
  },
  {
    id: "hcm_pho_di_bo_nguyen_hue",
    name: "Phố Đi Bộ Nguyễn Huệ & Chung Cư Cà Phê 42 Nguyễn Huệ",
    category: "attraction",
    category_label: "Điểm Vui Chơi & Cà Phê View Đẹp",
    category_icon: "celebration",
    address: "Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    city: "TP. Hồ Chí Minh",
    rating: 4.8,
    user_ratings_total: 18400,
    price_level_text: "50.000đ - 90.000đ",
    cost_vnd: 60000,
    opening_hours_text: "Mở cả ngày • Sôi động nhất từ 19:00",
    open_now: true,
    recommended_dish_or_activity: "Uống trà đào tại chung cư cổ 42 Nguyễn Huệ ngắm toàn cảnh phố đi bộ về đêm",
    photo_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    social_trend: {
      is_viral: true,
      platform: "threads",
      badge_label: "Trend Threads tụ họp giới trẻ"
    },
    google_maps_url: "https://www.google.com/maps/search/?api=1&query=Pho+Di+Bo+Nguyen+Hue+Chung+Cu+42",
    lat: 10.7745,
    lng: 106.7025,
    quick_description: "Không gian đi bộ hiện đại bậc nhất bao quanh bởi các quán cà phê độc đáo"
  }
];

export function searchLocalPlaces(query: string, city?: string, category?: string): PlaceSearchResult[] {
  const q = (query || "").toLowerCase().trim();
  const targetCity = (city || "").toLowerCase().trim();
  const cat = (category || "").toLowerCase().trim();

  return VERIFIED_VIETNAM_PLACES.filter((p) => {
    // City filter
    if (targetCity && targetCity !== "tất cả" && targetCity !== "all") {
      const pCity = p.city.toLowerCase();
      if (!pCity.includes(targetCity) && !targetCity.includes(pCity)) {
        // If searching specifically with a query, don't strictly exclude if place name matches
        if (!q || !p.name.toLowerCase().includes(q)) {
          return false;
        }
      }
    }

    // Category filter
    if (cat && cat !== "all" && cat !== "tất cả") {
      if (cat === "food" && p.category !== "food_specialty") return false;
      if (cat === "cafe" && p.category !== "cafe") return false;
      if (cat === "attraction" && p.category !== "attraction") return false;
      if (cat === "shopping" && p.category !== "shopping") return false;
      if (cat === "trending" && !p.social_trend?.is_viral) return false;
    }

    // Query match
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.recommended_dish_or_activity.toLowerCase().includes(q) ||
      p.category_label.toLowerCase().includes(q) ||
      p.quick_description.toLowerCase().includes(q)
    );
  });
}
