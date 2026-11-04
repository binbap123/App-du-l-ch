import { WanderItineraryData } from "../types";

export const DEFAULT_ITINERARY_DANANG: WanderItineraryData = {
  meta: {
    destination: "Đà Nẵng",
    trip_duration: "3N2Đ",
    total_estimated_cost_vnd: 2800000,
    currency_symbol: "đ",
    theme_color: "#E2A854",
    summary: "Chuyến đi Đà Nẵng 3N2Đ oanh tạc ẩm thực local, check-in điểm HOT TikTok & ngắm Bán đảo Sơn Trà."
  },
  map_config: {
    recommended_zoom: 12,
    search_center_hint: "Quận Hải Châu, Đà Nẵng"
  },
  itinerary: [
    {
      day_number: 1,
      day_title: "Oanh tạc ẩm thực & Check-in TikTok Sơn Trà",
      schedule: [
        {
          id: "dn_item1",
          time_slot: "08:00 - 09:30",
          time_period: "morning",
          place_name: "Bánh tráng cuốn thịt heo Hoàng Diệu",
          category: "food_specialty",
          category_icon: "restaurant",
          address_hint: "28 Hoàng Diệu, Hải Châu, Đà Nẵng",
          recommended_dish_or_activity: "Thịt heo hai đầu da cuốn bánh tráng & mắm nêm đậm đà",
          cost_vnd: 65000,
          social_trend: {
            is_viral: true,
            platform: "tiktok",
            badge_label: "Hot TikTok 1.2M view",
            sentiment_score: 0.95
          },
          ui_card: {
            badge_color: "#E2A854",
            quick_description: "Đặc sản local trứ danh"
          },
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAJv_fxHPny19r9Mz6x1FSxf87vdPfHL8tAlxINmlvsa070RslOYxqb7IjZfd8fnGfcyhiEK6lVgkENmXi3VQT3WRvgsccRVOSOCTcWJXlXtWfXVn_08oQeRLNtSCpi2kLXMOLxjUfYffsUmlCdbilVTegtm-OUpFi_ttXlWfp8qNZe8BO7d3DmozKnLShYh7QuVuuXQXzMIOIQWpIilXEmZZExyzhrxmcYojs9jldg6gntsuhlr088"
        },
        {
          id: "dn_item2",
          time_slot: "10:00 - 12:00",
          time_period: "morning",
          place_name: "Bán đảo Sơn Trà & Chùa Linh Ứng",
          category: "attraction",
          category_icon: "photo_camera",
          address_hint: "Thọ Quang, Sơn Trà, Đà Nẵng",
          recommended_dish_or_activity: "Chụp ảnh tượng Phật Bà 67m ngắm toàn cảnh biển Mỹ Khê",
          cost_vnd: 0,
          social_trend: {
            is_viral: true,
            platform: "facebook",
            badge_label: "Check-in ngắm biển",
            sentiment_score: 0.91
          },
          ui_card: {
            badge_color: "#1B6D24",
            quick_description: "Thiên nhiên & Biển xanh"
          },
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui"
        },
        {
          id: "dn_item3",
          time_slot: "14:00 - 16:30",
          time_period: "afternoon",
          place_name: "Tiệm Cafe Sơn Trà Studio",
          category: "cafe",
          category_icon: "local_cafe",
          address_hint: "Hoàng Sa, Sơn Trà, Đà Nẵng",
          recommended_dish_or_activity: "Cà phê muối béo ngậy & ngắm biển chạng vạng",
          cost_vnd: 80000,
          social_trend: {
            is_viral: true,
            platform: "threads",
            badge_label: "Trend Threads chill",
            sentiment_score: 0.97
          },
          ui_card: {
            badge_color: "#E2A854",
            quick_description: "Cảnh đẹp view biển"
          },
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBtpDnM2yyEFqE2iDhNheSVrXXUnILCfHL4PF--WBZSQ_TW4EGemqi0neft5rLGuouTGbg2u2k-egZtUf67CfShaUTkkTFGmLAJZNgpYPYmfw4GKER6as_beYsw58JqbqekpcHC6X64pjWg32oR0D-1nKEVGqCHwBIylmNIYDMVOlay2K7CsoMCzz_7eH2SbIh1vs7kvSx2xczuFPacSq0E8823977swoi2R8W7c7nLgg_U5Za02HOG"
        }
      ]
    },
    {
      day_number: 2,
      day_title: "Chợ Cồn, Cầu Rồng & Phố cổ Hội An",
      schedule: [
        {
          id: "dn_item4",
          time_slot: "08:30 - 11:00",
          time_period: "morning",
          place_name: "Chợ Cồn - Thiên đường Ẩm thực",
          category: "food_specialty",
          category_icon: "restaurant",
          address_hint: "290 Hùng Vương, Vĩnh Trung, Hải Châu",
          recommended_dish_or_activity: "Mì Quảng ếch, Bún mắm nêm, Chè ốc hút",
          cost_vnd: 120000,
          social_trend: {
            is_viral: true,
            platform: "tiktok",
            badge_label: "Hot TikTok Reviewer",
            sentiment_score: 0.96
          },
          ui_card: {
            badge_color: "#E2A854",
            quick_description: "Tụ điểm ăn vặt sầm uất"
          },
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX"
        },
        {
          id: "dn_item5",
          time_slot: "16:30 - 21:00",
          time_period: "evening",
          place_name: "Phố cổ Hội An & Thả đèn hoa đăng",
          category: "attraction",
          category_icon: "photo_camera",
          address_hint: "Minh An, Hội An, Quảng Nam",
          recommended_dish_or_activity: "Đi thuyền sông Hoài, ăn Cao Lầu, chụp ảnh đèn lồng",
          cost_vnd: 250000,
          social_trend: {
            is_viral: true,
            platform: "threads",
            badge_label: "Di sản thế giới",
            sentiment_score: 0.99
          },
          ui_card: {
            badge_color: "#1B6D24",
            quick_description: "Phố cổ huyền ảo về đêm"
          },
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX"
        }
      ]
    },
    {
      day_number: 3,
      day_title: "Bà Nà Hills, Cầu Vàng & Mua sắm Chợ Hàn",
      schedule: [
        {
          id: "dn_item6",
          time_slot: "08:00 - 13:30",
          time_period: "morning",
          place_name: "Sun World Bà Nà Hills & Cầu Vàng",
          category: "attraction",
          category_icon: "photo_camera",
          address_hint: "Hòa Phú, Hòa Vang, Đà Nẵng",
          recommended_dish_or_activity: "Check-in Cầu Vàng Bàn Tay Khổng Lồ, ngắm Làng Pháp mộng mơ",
          cost_vnd: 850000,
          social_trend: {
            is_viral: true,
            platform: "tiktok",
            badge_label: "Biểu tượng du lịch quốc tế",
            sentiment_score: 0.99
          },
          ui_card: {
            badge_color: "#1B6D24",
            quick_description: "Kỳ quan kiến trúc thế giới"
          },
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQaeLXcuxT8j0GQ-8ehr1wvon3ary3s-08q3238jTI_mjWLZ4xJqRcyx-FDcO_PId8Cy05ZyPzULXmsFiyoJd5quv6YJPAgl7Q0l3KK9_5Gro1sXZ6KzEYwyfaMjLWmUzFyxm2EBAErAoTWxJWbJVCbNOh-iSXbNYquOHWPfUNCCUUybNuLVtKuW-BbGUWoNokOowCY2mOuMailuPADz0C7Qzz3LKe0yssD0WOQxhBcS8A9rndZGIj"
        },
        {
          id: "dn_item7",
          time_slot: "15:00 - 17:00",
          time_period: "afternoon",
          place_name: "Chợ Hàn - Mua đặc sản làm quà",
          category: "food_specialty",
          category_icon: "restaurant",
          address_hint: "119 Trần Phú, Hải Châu 1, Đà Nẵng",
          recommended_dish_or_activity: "Mua chả bò Đà Nẵng, mực rim me, bánh khô mè Cẩm Lệ",
          cost_vnd: 200000,
          social_trend: {
            is_viral: true,
            platform: "facebook",
            badge_label: "Thiên đường mua sắm đặc sản",
            sentiment_score: 0.94
          },
          ui_card: {
            badge_color: "#FF6B35",
            quick_description: "Đặc sản chính gốc mang về"
          },
          image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwsezEKNM0xjso44KApjBlIAZZaPR8BbuF26IKDs89_HhDPxwROMoWQaPVUNDfJc_4Lv8HIQl4ARTiJ3iITULMA23cBds30WWklqCkoT_cB6eE750YoXTAo-Lu7qqSEdkulhVCRssUi992duh2VP-W9NxV3tFWolnDdoKQFDyDecT7QIYPjcWCJBjcxsGW99ZYhkkDCnbO8ltcNpHXOm6SnEMtCDoMdlsUKGzYpgYjh0jUqWckqEUR"
        }
      ]
    }
  ],
  budget_breakdown: {
    food_and_drink_vnd: 1100000,
    attractions_and_activities_vnd: 1000000,
    transport_and_others_vnd: 700000
  },
  local_insider_tips: [
    {
      type: "transport",
      icon: "directions_bus",
      content: "Nên thuê xe máy nhận tại sân bay Đà Nẵng (100k-120k/ngày) tiết kiệm 60% chi phí taxi."
    },
    {
      type: "weather",
      icon: "wb_sunny",
      content: "Thời điểm đi Bán đảo Sơn Trà đẹp nhất là từ 7h00 - 9h00 sáng tránh nắng gắt."
    }
  ]
};

export const MOCK_TRAY_SUGGESTIONS = [
  {
    id: "s1",
    title: "Tiệm Cafe Hoàng Hôn",
    distance: "Cách đây 1.2km",
    badge: "View xịn",
    cost: "60.000 đ",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcjmzHriXC4T7ACNHyFFoc-h3oFEvoWqQPeVGImOy5tpkHCcMG8Uefwfx9PN8vJyONghodNYa6xJPDaIzIT_q3W-TUB-NhbtYpnyKs8iPna2QB-QhQuyK6LRDWtZpiBkfp63GaSANHpWKVDAkrycfBmbV6LItGsyNN3o6-Qkz1aDkrf9cI9P9GMdO5q93vfE6ESXeB0dhYT4eb31HoYrCqxI1rHZPSrD2SKLwh5fyayo_g29RTyUqp"
  },
  {
    id: "s2",
    title: "Chợ Đêm Sơn Trà",
    distance: "Đang HOT trên TikTok",
    badge: "Hot TikTok",
    cost: "150.000 đ",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAd4X9LSb80PxNPsgTTUTaiTAh2k5bFK5heSKalRvB0gYsr9RkmdKpqIZbj5J34-S342QF8BDtJCt5YmLFRJaZRG99tHkp416wUNJ9HQkmZOjdGrk5D591jbsqLSCcdSsIvacCznz4ovc9jkTWzy7Ud-RYo_uSs1Dz3liBQv-ZvwZ4wk5ml1PkdN1kQmJYl4hliGpz9mD0ttsgBHDRUlsE_FW-73Fn-z2TM_yehDGNWRziq5k1_KRq"
  },
  {
    id: "s3",
    title: "Bún Chả Cả Ông Lý",
    distance: "Cách đây 800m",
    badge: "Đặc sản local",
    cost: "45.000 đ",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwsezEKNM0xjso44KApjBlIAZZaPR8BbuF26IKDs89_HhDPxwROMoWQaPVUNDfJc_4Lv8HIQl4ARTiJ3iITULMA23cBds30WWklqCkoT_cB6eE750YoXTAo-Lu7qqSEdkulhVCRssUi992duh2VP-W9NxV3tFWolnDdoKQFDyDecT7QIYPjcWCJBjcxsGW99ZYhkkDCnbO8ltcNpHXOm6SnEMtCDoMdlsUKGzYpgYjh0jUqWckqEUR"
  }
];
