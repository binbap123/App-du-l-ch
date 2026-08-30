import React, { useState, useEffect, useRef } from "react";
import { ScheduleItem, DayItinerary } from "../types";
import { PlaceSearchResult, searchLocalPlaces } from "../data/placesData";

interface PlaceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndAdd: (dayIndex: number, newItem: ScheduleItem) => void;
  destinationCity: string;
  days: DayItinerary[];
  activeDayIndex: number;
}

export const PlaceSearchModal: React.FC<PlaceSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAndAdd,
  destinationCity,
  days,
  activeDayIndex,
}) => {
  const [activeTab, setActiveTab] = useState<"search" | "custom">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(destinationCity || "Đà Nẵng");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected place for step 2 configuration
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [targetDayIndex, setTargetDayIndex] = useState(activeDayIndex);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("09:00 - 11:00");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [customCost, setCustomCost] = useState<number>(50000);
  const [customNotes, setCustomNotes] = useState("");

  // Custom manual place state
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualCategory, setManualCategory] = useState<string>("food_specialty");
  const [manualTimeSlot, setManualTimeSlot] = useState("14:00 - 16:00");
  const [manualCost, setManualCost] = useState<number>(60000);
  const [manualNotes, setManualNotes] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronize target day when activeDayIndex prop changes
  useEffect(() => {
    setTargetDayIndex(activeDayIndex);
  }, [activeDayIndex]);

  // Synchronize city if destination changes
  useEffect(() => {
    if (destinationCity) {
      // Clean city name (e.g. "Đà Nẵng - Hội An" -> "Đà Nẵng")
      const mainCity = destinationCity.split("-")[0].trim();
      setSelectedCity(mainCity);
    }
  }, [destinationCity]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPlace(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      handleSearch(searchQuery, selectedCity, selectedCategory);
    }
  }, [isOpen, selectedCity, selectedCategory]);

  const handleSearch = async (query: string, city: string, category: string) => {
    setIsLoading(true);
    try {
      // 1. Initial fast local search
      const local = searchLocalPlaces(query, city, category);
      setResults(local);

      // 2. Fetch from backend with Gemini Google Maps Places enrichment if query is provided or local is small
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, city, category }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setResults(data.data);
      }
    } catch (err) {
      console.error("Lỗi khi tìm kiếm địa điểm:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced live search
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    handleSearch(val, selectedCity, selectedCategory);
  };

  // When user clicks a place from the search results
  const handlePickPlace = (place: PlaceSearchResult) => {
    setSelectedPlace(place);
    setCustomCost(place.cost_vnd || 50000);
    setCustomNotes(place.recommended_dish_or_activity || "");
    
    // Auto preset time based on category
    if (place.category === "food_specialty") {
      setSelectedTimeSlot("12:00 - 13:30");
      setSelectedTimePeriod("afternoon");
    } else if (place.category === "cafe") {
      setSelectedTimeSlot("15:00 - 16:30");
      setSelectedTimePeriod("afternoon");
    } else if (place.category === "nightlife") {
      setSelectedTimeSlot("20:00 - 22:30");
      setSelectedTimePeriod("night");
    } else {
      setSelectedTimeSlot("08:30 - 11:30");
      setSelectedTimePeriod("morning");
    }
  };

  // Confirm and add the selected place to the itinerary
  const handleConfirmAdd = () => {
    if (!selectedPlace) return;

    const newItem: ScheduleItem = {
      id: `place_${Date.now()}`,
      time_slot: selectedTimeSlot,
      time_period: selectedTimePeriod,
      place_name: selectedPlace.name,
      category: selectedPlace.category,
      category_icon: selectedPlace.category_icon || "place",
      address_hint: selectedPlace.address,
      recommended_dish_or_activity: customNotes || selectedPlace.recommended_dish_or_activity,
      cost_vnd: customCost,
      social_trend: selectedPlace.social_trend || {
        is_viral: false,
        platform: "none",
        badge_label: "Địa điểm gợi ý",
      },
      ui_card: {
        badge_color: selectedPlace.category === "food_specialty" ? "#E2A854" : selectedPlace.category === "cafe" ? "#FF6B35" : "#1B6D24",
        quick_description: selectedPlace.quick_description || selectedPlace.category_label,
      },
      image_url: selectedPlace.photo_url,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
    };

    onSelectAndAdd(targetDayIndex, newItem);
    onClose();
  };

  // Confirm manual place addition
  const handleConfirmManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const getIcon = (cat: string) => {
      if (cat === "food_specialty") return "restaurant";
      if (cat === "cafe") return "local_cafe";
      if (cat === "attraction") return "photo_camera";
      if (cat === "accommodation") return "hotel";
      if (cat === "shopping") return "shopping_bag";
      return "explore";
    };

    const newItem: ScheduleItem = {
      id: `manual_${Date.now()}`,
      time_slot: manualTimeSlot,
      time_period: selectedTimePeriod,
      place_name: manualName.trim(),
      category: manualCategory,
      category_icon: getIcon(manualCategory),
      address_hint: manualAddress.trim() || selectedCity,
      recommended_dish_or_activity: manualNotes.trim() || "Trải nghiệm tự do",
      cost_vnd: manualCost,
      social_trend: {
        is_viral: false,
        platform: "none",
        badge_label: "Địa điểm tự chọn",
      },
      ui_card: {
        badge_color: "#FF6B35",
        quick_description: "Tự tạo trong lịch trình",
      },
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    };

    onSelectAndAdd(targetDayIndex, newItem);
    onClose();
  };

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "Tất cả", icon: "explore" },
    { id: "food", label: "🍜 Quán ăn & Đặc sản", icon: "restaurant" },
    { id: "cafe", label: "☕ Cà phê & Check-in", icon: "local_cafe" },
    { id: "attraction", label: "📸 Điểm tham quan", icon: "photo_camera" },
    { id: "shopping", label: "🛍️ Chợ & Mua sắm", icon: "shopping_bag" },
    { id: "trending", label: "🔥 Trend TikTok/Threads", icon: "local_fire_department" },
  ];

  const popularCities = [
    "Đà Nẵng", "Hội An", "Phú Quốc", "Đà Lạt", "Hà Nội", "TP. Hồ Chí Minh", "Nha Trang", "Sapa", "Huế", "Quy Nhơn", "Ninh Bình"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E5E7EB] overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#EA4335] via-[#FBBC05] to-[#34A853] flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[20px]">pin_drop</span>
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-[#111827] flex items-center gap-1.5">
                <span>Tìm & Thêm Địa Điểm</span>
              </h2>
              <p className="text-[12px] text-[#6B7280]">
                Tìm kiếm và thêm địa điểm yêu thích vào lịch trình
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] flex items-center justify-center transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* View Tabs: Google Maps Search vs Manual Entry */}
        <div className="flex border-b border-[#E5E7EB] px-5 bg-white">
          <button
            onClick={() => { setActiveTab("search"); setSelectedPlace(null); }}
            className={`py-3 px-4 text-[13px] font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "search"
                ? "border-[#1A73E8] text-[#1A73E8]"
                : "border-transparent text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            Tìm kiếm địa điểm
          </button>
          <button
            onClick={() => { setActiveTab("custom"); setSelectedPlace(null); }}
            className={`py-3 px-4 text-[13px] font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "custom"
                ? "border-[#1A73E8] text-[#1A73E8]"
                : "border-transparent text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">edit_location_alt</span>
            Tự nhập thủ công
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "search" && !selectedPlace && (
            <div className="space-y-4">
              {/* Google Maps Search Bar */}
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-[#1A73E8] text-[22px]">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleQueryChange}
                  placeholder={`Tìm quán ăn, cà phê, điểm check-in tại ${selectedCity}...`}
                  className="w-full bg-[#F3F4F6] hover:bg-[#E5E7EB]/70 focus:bg-white text-[#111827] placeholder-[#6B7280] text-[14px] font-medium pl-12 pr-10 py-3.5 rounded-2xl border border-[#E5E7EB] focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); handleSearch("", selectedCity, selectedCategory); }}
                    className="absolute right-3.5 text-[#9CA3AF] hover:text-[#111827] p-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                  </button>
                )}
              </div>

              {/* City Selection Pills */}
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                <span className="text-[12px] font-bold text-[#6B7280] shrink-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  Khu vực:
                </span>
                {popularCities.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCity(c);
                      handleSearch(searchQuery, c, selectedCategory);
                    }}
                    className={`shrink-0 text-[12px] font-bold px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                      selectedCity.toLowerCase().includes(c.toLowerCase())
                        ? "bg-[#1A73E8] text-white shadow-sm"
                        : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleSearch(searchQuery, selectedCity, cat.id);
                    }}
                    className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? "bg-[#111827] text-white shadow-sm"
                        : "bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Search Results List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-[12px] font-bold text-[#6B7280]">
                  <span>Kết quả tìm kiếm ({results.length} địa điểm)</span>
                  {isLoading && (
                    <span className="text-[#1A73E8] flex items-center gap-1">
                      <span className="animate-spin material-symbols-outlined text-[14px]">progress_activity</span>
                      Đang tìm kiếm...
                    </span>
                  )}
                </div>

                {results.length === 0 && !isLoading && (
                  <div className="text-center py-10 bg-[#F9FAFB] rounded-2xl border border-dashed border-[#E5E7EB] p-6">
                    <span className="material-symbols-outlined text-[#9CA3AF] text-[40px] mb-2">
                      travel_explore
                    </span>
                    <h4 className="text-[14px] font-bold text-[#111827] mb-1">
                      Không tìm thấy địa điểm phù hợp
                    </h4>
                    <p className="text-[12px] text-[#6B7280] max-w-sm mx-auto mb-4">
                      Bạn có thể thử tìm từ khóa khác hoặc chuyển sang tab "Tự nhập thủ công" để điền tên địa điểm tùy thích.
                    </p>
                    <button
                      onClick={() => setActiveTab("custom")}
                      className="bg-[#1A73E8] text-white text-[12px] font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-[#1557B0]"
                    >
                      Tự tạo địa điểm ngay
                    </button>
                  </div>
                )}

                {results.map((place) => (
                  <div
                    key={place.id}
                    className="bg-white rounded-2xl border border-[#E5E7EB] p-3.5 hover:border-[#1A73E8] hover:shadow-md transition-all flex flex-col sm:flex-row gap-3.5 group"
                  >
                    {/* Thumbnail image */}
                    <div className="w-full sm:w-28 h-32 sm:h-28 rounded-xl bg-[#F3F4F6] overflow-hidden shrink-0 relative">
                      <img
                        src={place.photo_url}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                        {place.category_label}
                      </span>
                    </div>

                    {/* Place info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-[15px] font-bold text-[#111827] leading-snug">
                            {place.name}
                          </h3>
                          {place.social_trend?.is_viral && (
                            <span className="shrink-0 bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                              {place.social_trend.badge_label}
                            </span>
                          )}
                        </div>

                        {/* Rating & reviews & price tier */}
                        <div className="flex items-center gap-2 text-[12px] mb-1.5 flex-wrap">
                          <div className="flex items-center text-[#F59E0B] font-extrabold gap-0.5">
                            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                              star
                            </span>
                            <span>{place.rating}</span>
                          </div>
                          <span className="text-[#6B7280]">
                            ({place.user_ratings_total.toLocaleString()} đánh giá)
                          </span>
                          <span className="text-[#D1D5DB]">•</span>
                          <span className="font-bold text-[#059669]">
                            {place.price_level_text}
                          </span>
                          {place.open_now && (
                            <>
                              <span className="text-[#D1D5DB]">•</span>
                              <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                                {place.opening_hours_text}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-1 text-[12px] text-[#6B7280] mb-2">
                          <span className="material-symbols-outlined text-[14px] text-[#EF4444] shrink-0 mt-0.5">
                            location_on
                          </span>
                          <span className="line-clamp-1">{place.address}</span>
                        </div>

                        {/* Recommendation Highlight */}
                        {place.recommended_dish_or_activity && (
                          <div className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] rounded-lg px-2.5 py-1 text-[11px] font-medium line-clamp-1 mb-2">
                            ✨ <strong>Gợi ý:</strong> {place.recommended_dish_or_activity}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
                        <a
                          href={place.google_maps_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">map</span>
                          Mở Google Maps
                        </a>

                        <button
                          onClick={() => handlePickPlace(place)}
                          className="bg-[#1A73E8] hover:bg-[#1557B0] text-white text-[12px] font-extrabold px-4 py-1.5 rounded-xl shadow-sm flex items-center gap-1 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[15px]">add_circle</span>
                          Chọn & Tùy Chỉnh
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Configure & Add Place into Itinerary */}
          {activeTab === "search" && selectedPlace && (
            <div className="space-y-5 animate-fade-in">
              {/* Back to search button */}
              <button
                onClick={() => setSelectedPlace(null)}
                className="text-[13px] font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Chọn địa điểm khác
              </button>

              {/* Selected Place Preview Header */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 flex gap-3.5 items-center">
                <img
                  src={selectedPlace.photo_url}
                  alt={selectedPlace.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1A73E8] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {selectedPlace.category_label}
                    </span>
                    <span className="text-[12px] text-[#F59E0B] font-bold flex items-center gap-0.5">
                      ★ {selectedPlace.rating}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-extrabold text-[#0F172A] truncate mt-0.5">
                    {selectedPlace.name}
                  </h3>
                  <p className="text-[12px] text-[#64748B] truncate">
                    {selectedPlace.address}
                  </p>
                </div>
              </div>

              {/* Settings Form */}
              <div className="space-y-4 bg-white border border-[#E5E7EB] rounded-2xl p-4">
                <h4 className="text-[14px] font-extrabold text-[#111827] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#1A73E8] text-[18px]">tune</span>
                  Tùy chỉnh lịch trình cho địa điểm
                </h4>

                {/* Day selector */}
                <div>
                  <label className="block text-[12px] font-bold text-[#4B5563] mb-1.5">
                    Thêm vào ngày nào?
                  </label>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {days.map((d, idx) => (
                      <button
                        key={d.day_number}
                        type="button"
                        onClick={() => setTargetDayIndex(idx)}
                        className={`text-[12px] font-bold px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                          targetDayIndex === idx
                            ? "bg-[#1A73E8] text-white shadow-sm"
                            : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                        }`}
                      >
                        Ngày {d.day_number} ({d.schedule.length} điểm)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slot presets */}
                <div>
                  <label className="block text-[12px] font-bold text-[#4B5563] mb-1.5">
                    Khung giờ dự kiến:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    {[
                      { label: "Sáng (08:00 - 10:30)", time: "08:00 - 10:30", period: "morning" as const },
                      { label: "Trưa (11:30 - 13:00)", time: "11:30 - 13:00", period: "afternoon" as const },
                      { label: "Chiều (14:30 - 17:00)", time: "14:30 - 17:00", period: "afternoon" as const },
                      { label: "Tối (18:30 - 21:00)", time: "18:30 - 21:00", period: "evening" as const },
                    ].map((t) => (
                      <button
                        key={t.time}
                        type="button"
                        onClick={() => {
                          setSelectedTimeSlot(t.time);
                          setSelectedTimePeriod(t.period);
                        }}
                        className={`text-[11px] font-bold p-2 rounded-xl border text-center transition-all ${
                          selectedTimeSlot === t.time
                            ? "border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]"
                            : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    placeholder="Hoặc tự điền khung giờ (ví dụ: 09:15 - 11:45)"
                    className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none font-medium"
                  />
                </div>

                {/* Estimated cost */}
                <div>
                  <label className="block text-[12px] font-bold text-[#4B5563] mb-1.5">
                    Dự toán chi phí cho hoạt động / ăn uống (VND):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={10000}
                      value={customCost}
                      onChange={(e) => setCustomCost(Number(e.target.value) || 0)}
                      className="w-full bg-[#F9FAFB] text-[#111827] text-[14px] font-bold px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none pr-12"
                    />
                    <span className="absolute right-3.5 top-3 text-[12px] font-extrabold text-[#6B7280]">
                      VNĐ
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-1">
                    Ước tính: {customCost.toLocaleString("vi-VN")} đ (có thể chỉnh sửa bất kỳ lúc nào trên timeline)
                  </p>
                </div>

                {/* Custom notes or dishes */}
                <div>
                  <label className="block text-[12px] font-bold text-[#4B5563] mb-1.5">
                    Ghi chú / Món đặc sản muốn thử:
                  </label>
                  <input
                    type="text"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Ví dụ: Gọi phần đặc biệt, check-in góc ban công view hoàng hôn..."
                    className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none"
                  />
                </div>
              </div>

              {/* Final Add Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white font-extrabold text-[15px] py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">add_task</span>
                  ✓ Thêm Vào Lịch Trình Ngày {targetDayIndex + 1}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Manual Custom Place Form */}
          {activeTab === "custom" && (
            <form onSubmit={handleConfirmManualAdd} className="space-y-4">
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] p-3.5 rounded-2xl text-[12px]">
                💡 <strong>Tự tạo địa điểm:</strong> Bạn có thể thêm bất kỳ quán quen, homestay, bãi biển hay địa điểm riêng tư nào chưa có trên bản đồ vào lịch trình.
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#374151] mb-1">
                  Tên địa điểm *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ví dụ: Tiệm Bánh Mì Cây Điệp, Homestay Nhà Của Nắng..."
                  className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#374151] mb-1">
                    Thể loại
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none font-medium"
                  >
                    <option value="food_specialty">🍜 Quán ăn / Ẩm thực</option>
                    <option value="cafe">☕ Cà phê / Thư giãn</option>
                    <option value="attraction">📸 Điểm tham quan / Check-in</option>
                    <option value="accommodation">🏨 Khách sạn / Homestay</option>
                    <option value="shopping">🛍️ Mua sắm & Chợ</option>
                    <option value="nightlife">🎉 Vui chơi & Nightlife</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#374151] mb-1">
                    Thêm vào ngày
                  </label>
                  <select
                    value={targetDayIndex}
                    onChange={(e) => setTargetDayIndex(Number(e.target.value))}
                    className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none font-medium"
                  >
                    {days.map((d, idx) => (
                      <option key={d.day_number} value={idx}>
                        Ngày {d.day_number} ({d.schedule.length} địa điểm)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#374151] mb-1">
                  Địa chỉ / Khu vực
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Văn Linh, Đà Nẵng"
                  className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#374151] mb-1">
                    Khung giờ
                  </label>
                  <input
                    type="text"
                    value={manualTimeSlot}
                    onChange={(e) => setManualTimeSlot(e.target.value)}
                    placeholder="Ví dụ: 15:00 - 17:00"
                    className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#374151] mb-1">
                    Chi phí ước tính (VND)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={manualCost}
                    onChange={(e) => setManualCost(Number(e.target.value) || 0)}
                    className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] font-bold px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#374151] mb-1">
                  Ghi chú hoặc hoạt động trải nghiệm
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ví dụ: Thưởng thức cà phê trứng, ngắm hoàng hôn..."
                  className="w-full bg-[#F9FAFB] text-[#111827] text-[13px] px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#1A73E8] outline-none"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white font-extrabold text-[14px] py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_location</span>
                  ✓ Thêm Địa Điểm Này Vào Lịch Trình
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
