import React, { useState } from "react";
import { WanderItineraryData, ScheduleItem } from "../types";
import { MOCK_TRAY_SUGGESTIONS } from "../data/mockData";
import { PlaceSearchModal } from "./PlaceSearchModal";

interface ItineraryBuilderViewProps {
  itineraryData: WanderItineraryData;
  onSaveAndExport: (updatedData: WanderItineraryData) => void;
  onBack: () => void;
}

export const ItineraryBuilderView: React.FC<ItineraryBuilderViewProps> = ({
  itineraryData,
  onSaveAndExport,
  onBack,
}) => {
  const [data, setData] = useState<WanderItineraryData>(itineraryData);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeDay = data.itinerary[activeDayIndex] || data.itinerary[0] || {
    day_number: 1,
    day_title: "Ngày 1",
    schedule: []
  };

  // Calculate day total cost
  const totalCostDay = (activeDay.schedule || []).reduce((acc, item) => acc + (item.cost_vnd || 0), 0);
  const totalTripCost = data.itinerary.reduce((acc, day) => {
    return acc + (day.schedule || []).reduce((sAcc, item) => sAcc + (item.cost_vnd || 0), 0);
  }, 0);

  const totalBudgetMax = data.meta.total_estimated_cost_vnd || 3000000;
  const remainingBudget = Math.max(0, totalBudgetMax - totalTripCost);
  const budgetPercent = Math.min(100, Math.round((totalTripCost / totalBudgetMax) * 100));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedSchedule = activeDay.schedule.filter((item) => item.id !== itemId);
    const updatedDays = [...data.itinerary];
    updatedDays[activeDayIndex] = {
      ...activeDay,
      schedule: updatedSchedule,
    };
    setData({ ...data, itinerary: updatedDays });
    showToast("Đã xóa địa điểm khỏi lịch trình");
  };

  const handleUpdateItemCost = (itemId: string, newCostStr: string) => {
    const num = parseInt(newCostStr.replace(/\D/g, ""), 10) || 0;
    const updatedSchedule = activeDay.schedule.map((item) =>
      item.id === itemId ? { ...item, cost_vnd: num } : item
    );
    const updatedDays = [...data.itinerary];
    updatedDays[activeDayIndex] = {
      ...activeDay,
      schedule: updatedSchedule,
    };
    setData({ ...data, itinerary: updatedDays });
  };

  // Callback when user selects a place from Google Maps Search Modal
  const handleAddPlaceFromSearch = (targetDayIdx: number, newItem: ScheduleItem) => {
    const updatedDays = [...data.itinerary];
    if (updatedDays[targetDayIdx]) {
      updatedDays[targetDayIdx] = {
        ...updatedDays[targetDayIdx],
        schedule: [...(updatedDays[targetDayIdx].schedule || []), newItem],
      };
      setData({ ...data, itinerary: updatedDays });
      setActiveDayIndex(targetDayIdx);
      showToast(`Đã thêm "${newItem.place_name}" vào Ngày ${targetDayIdx + 1}!`);
    }
  };

  const handleAddSuggestion = (sug: typeof MOCK_TRAY_SUGGESTIONS[0]) => {
    const numCost = parseInt(sug.cost.replace(/\D/g, ""), 10) || 50000;
    const newItem: ScheduleItem = {
      id: `sug_${Date.now()}`,
      time_slot: "18:00 PM",
      time_period: "evening",
      place_name: sug.title,
      category: "cafe",
      category_icon: "local_cafe",
      address_hint: sug.distance,
      recommended_dish_or_activity: "Thưởng thức đồ uống & Check-in",
      cost_vnd: numCost,
      social_trend: {
        is_viral: true,
        platform: "threads",
        badge_label: sug.badge,
      },
      ui_card: {
        badge_color: "#FF6B35",
        quick_description: sug.badge,
      },
      image_url: sug.imageUrl,
    };

    const updatedDays = [...data.itinerary];
    updatedDays[activeDayIndex] = {
      ...activeDay,
      schedule: [...activeDay.schedule, newItem],
    };
    setData({ ...data, itinerary: updatedDays });
    setIsTrayOpen(false);
    showToast(`Đã thêm "${sug.title}" vào lịch trình AI!`);
  };

  const handleAddNewDay = () => {
    const newDayNum = data.itinerary.length + 1;
    const newDay = {
      day_number: newDayNum,
      day_title: `Ngày ${newDayNum} - Khám phá tiếp nối`,
      schedule: [
        {
          id: `newday_${Date.now()}`,
          time_slot: "09:00 AM",
          time_period: "morning",
          place_name: "Cà phê Sáng Ngắm Biển",
          category: "cafe",
          category_icon: "local_cafe",
          address_hint: "Bờ biển thành phố",
          recommended_dish_or_activity: "Thư giãn khởi đầu ngày mới",
          cost_vnd: 50000,
          social_trend: { is_viral: false, platform: "none", badge_label: "Thư giãn" },
          ui_card: { badge_color: "#FF6B35", quick_description: "Khởi đầu ngày mới" },
        },
      ],
    };

    setData({
      ...data,
      itinerary: [...data.itinerary, newDay],
    });
    setActiveDayIndex(data.itinerary.length);
    showToast(`Đã thêm Ngày ${newDayNum}`);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-36 text-[#111827]">
      {/* Top Header */}
      <header className="bg-[#F0F2F5]/90 backdrop-blur-md border-b border-[#E5E7EB] sticky top-0 z-40 flex flex-col pt-safe">
        <div className="flex items-center justify-between px-[20px] h-14 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-[#4B5563] hover:bg-white h-9 w-9 rounded-full flex items-center justify-center transition-colors border border-[#E5E7EB]"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-[18px] font-extrabold text-[#111827] tracking-tight">
              Tự Thiết Kế Lịch Trình
            </h1>
          </div>
          <button
            onClick={() => onSaveAndExport(data)}
            className="sleek-gradient-bg text-white font-bold text-[13px] px-4 py-2 rounded-xl hover:opacity-95 transition-all shadow-[0_4px_12px_rgba(255,107,53,0.25)]"
          >
            Lưu & Xuất
          </button>
        </div>

        {/* Budget Progress Summary */}
        <div className="px-[20px] pb-3 space-y-2">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[#6B7280]">
              Chi phí: {totalTripCost.toLocaleString("vi-VN")} / {totalBudgetMax.toLocaleString("vi-VN")} đ
            </span>
            <span className="font-extrabold text-[#FF6B35]">
              Còn {remainingBudget.toLocaleString("vi-VN")} đ
            </span>
          </div>
          <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className="h-full sleek-gradient-bg rounded-full transition-all duration-300"
              style={{ width: `${budgetPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center gap-1.5 text-[#6B7280] text-[12px] font-medium">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            <span>
              Tổng thời gian: {activeDay.schedule.length * 2.5} tiếng ({activeDay.schedule.length} địa điểm)
            </span>
          </div>
        </div>

        {/* Date Switcher Pills */}
        <div className="px-[20px] pb-3 flex gap-2.5 overflow-x-auto hide-scrollbar">
          {data.itinerary.map((day, idx) => (
            <button
              key={day.day_number}
              onClick={() => setActiveDayIndex(idx)}
              className={`shrink-0 text-[13px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                activeDayIndex === idx
                  ? "sleek-gradient-bg text-white shadow-sm"
                  : "bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
              }`}
            >
              Ngày {day.day_number} - 0{8 + idx}/08
            </button>
          ))}
          <button
            onClick={handleAddNewDay}
            className="shrink-0 bg-white text-[#4B5563] border border-[#E5E7EB] text-[13px] font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1 hover:bg-[#F9FAFB]"
          >
            <span className="material-symbols-outlined text-[15px]">add</span> Thêm ngày
          </button>
        </div>
      </header>

      {/* Main Timeline Canvas */}
      <main className="px-[20px] py-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-extrabold text-[#111827] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#1A73E8] text-[20px]">map</span>
            {activeDay.day_title || `Ngày ${activeDayIndex + 1}`}
          </h2>
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="text-[12px] font-bold text-[#1A73E8] hover:text-[#1557B0] bg-[#E8F0FE] hover:bg-[#D2E3FC] px-3 py-1.5 rounded-full flex items-center gap-1 transition-all border border-[#D2E3FC]"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            Tìm & Thêm địa điểm
          </button>
        </div>

        <div className="relative pl-6">
          {/* Dashed Timeline Line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 dashed-line -ml-[1px]"></div>

          {activeDay.schedule.map((item, idx) => (
            <div key={item.id} className="relative mb-6 group">
              {/* Connector Dot */}
              <div className="absolute -left-6 top-6 w-3 h-3 sleek-gradient-bg rounded-full -ml-[5px] border-2 border-white z-10 shadow-sm"></div>

              {/* Editable Timeline Card */}
              <div className="sleek-card rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex items-start gap-2.5 transition-all hover:border-[#FF6B35]">
                {/* Drag Handle */}
                <button
                  className="text-[#9CA3AF] hover:text-[#111827] cursor-grab active:cursor-grabbing mt-2"
                  title="Kéo thả sắp xếp"
                >
                  <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                </button>

                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="bg-[#FFF7ED] text-[#FF6B35] text-[12px] font-extrabold px-3 py-0.5 rounded-full flex items-center gap-1 border border-[#FFEDD5]">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{item.time_slot}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.place_name + " " + (item.address_hint || data.meta.destination))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1A73E8] hover:bg-[#E8F0FE] h-7 w-7 flex items-center justify-center rounded-full transition-colors"
                        title="Mở trên Google Maps"
                      >
                        <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                      </a>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[#EF4444] hover:bg-[#FEE2E2] h-7 w-7 flex items-center justify-center rounded-full transition-colors"
                        title="Xóa địa điểm"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {item.image_url && (
                      <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] overflow-hidden shrink-0 relative">
                        <img
                          src={item.image_url}
                          alt={item.place_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-[15px] font-bold text-[#111827] line-clamp-2 mb-0.5">
                        {item.place_name}
                      </h3>
                      {item.address_hint && (
                        <p className="text-[11px] text-[#6B7280] line-clamp-1 mb-1">
                          📍 {item.address_hint}
                        </p>
                      )}
                      {item.recommended_dish_or_activity && (
                        <p className="text-[11px] text-[#D97706] font-medium line-clamp-1">
                          ✨ {item.recommended_dish_or_activity}
                        </p>
                      )}
                      {item.social_trend?.badge_label && (
                        <span className="text-[10px] font-extrabold bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-md border border-[#BBF7D0] inline-flex items-center mt-1">
                          {item.social_trend.badge_label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#E5E7EB] text-[12px]">
                    <span className="text-[#6B7280] font-medium">Dự kiến:</span>
                    <input
                      type="text"
                      value={`${(item.cost_vnd || 0).toLocaleString("vi-VN")} đ`}
                      onChange={(e) => handleUpdateItemCost(item.id, e.target.value)}
                      className="bg-white font-bold text-[#111827] border border-[#E5E7EB] rounded-lg px-2.5 py-1 w-28 focus:border-[#FF6B35] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Route Connector Bar */}
              {idx < activeDay.schedule.length - 1 && (
                <div className="mt-3 -ml-6 pl-10 flex items-center gap-2 text-[#6B7280]">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(item.place_name + " " + data.meta.destination)}&destination=${encodeURIComponent(activeDay.schedule[idx + 1].place_name + " " + data.meta.destination)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white px-3 py-1 rounded-full border border-[#E5E7EB] flex items-center gap-1.5 text-[12px] font-medium hover:border-[#1A73E8] hover:text-[#1A73E8] cursor-pointer shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[15px] text-[#1A73E8]">directions_car</span>
                    <span>Chỉ đường Google Maps • Xem lộ trình</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Sticky Bottom Action Buttons */}
      <div className="fixed bottom-0 w-full z-30 bg-gradient-to-t from-[#F0F2F5] via-[#F0F2F5] to-transparent pb-safe pt-4 px-[20px]">
        <div className="max-w-2xl mx-auto space-y-2.5 pb-4">
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full bg-white border-2 border-[#1A73E8] text-[#1A73E8] font-extrabold text-[14px] py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-[#E8F0FE]"
          >
            <span className="material-symbols-outlined text-[20px] text-[#EA4335]">
              pin_drop
            </span>
            <span>Tìm & Thêm Địa Điểm Tự Chọn</span>
          </button>

          <button
            onClick={() => setIsTrayOpen(!isTrayOpen)}
            className="w-full sleek-gradient-bg text-white font-extrabold text-[14px] py-3.5 rounded-2xl shadow-[0_4px_16px_rgba(255,107,53,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform hover:opacity-95"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            ✨ AI Gợi Ý Thêm Đột Phá
          </button>
        </div>
      </div>

      {/* Google Maps Places Search & Selection Modal */}
      <PlaceSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectAndAdd={handleAddPlaceFromSearch}
        destinationCity={data.meta.destination}
        days={data.itinerary}
        activeDayIndex={activeDayIndex}
      />

      {/* AI Suggestions Drawer Tray */}
      {isTrayOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] z-50 transition-transform duration-300 border-t border-[#E5E7EB]">
          <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setIsTrayOpen(false)}>
            <div className="w-12 h-1.5 bg-[#E5E7EB] rounded-full"></div>
          </div>
          <div className="px-[20px] pb-6 pt-1">
            <h2 className="text-[16px] font-extrabold text-[#111827] mb-3 flex items-center justify-between">
              <span>Địa điểm yêu thích / Đang HOT gần đó</span>
              <button onClick={() => setIsTrayOpen(false)} className="text-[#6B7280] text-[12px] font-bold">Đóng</button>
            </h2>

            {/* Dragable Suggestions Carousel */}
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-3">
              {MOCK_TRAY_SUGGESTIONS.map((sug) => (
                <div
                  key={sug.id}
                  onClick={() => handleAddSuggestion(sug)}
                  className="shrink-0 w-48 bg-white rounded-2xl border border-[#E5E7EB] p-3 flex flex-col gap-1.5 cursor-pointer hover:border-[#FF6B35] shadow-sm transition-all"
                >
                  <div className="w-full h-24 rounded-xl bg-[#F3F4F6] overflow-hidden relative">
                    <img
                      src={sug.imageUrl}
                      alt={sug.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 bg-black text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                      {sug.badge}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-bold text-[#111827] truncate">
                    {sug.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                    <span>📍 {sug.distance}</span>
                    <span className="font-bold text-[#FF6B35]">{sug.cost}</span>
                  </div>
                  <button className="w-full py-1.5 sleek-gradient-bg text-white rounded-lg text-[11px] font-bold mt-1 shadow-sm">
                    + Thêm vào lịch trình
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-white text-[13px] font-bold px-4 py-2 rounded-full shadow-lg border border-white/20 animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
