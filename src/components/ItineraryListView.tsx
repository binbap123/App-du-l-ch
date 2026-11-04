import React, { useState } from "react";
import { WanderItineraryData } from "../types";
import { dayLabel, formatThousands, parseCostInput, tripDateRange } from "../lib/uiFormat";

interface ItineraryListViewProps {
  itineraries: WanderItineraryData[];
  onOpenTrip: (id: string) => void;
  onEditTrip: (id: string) => void;
  /** Mở bản nháp chuyến đi mới (chưa lưu) trong builder. */
  onCreateTrip: (trip: WanderItineraryData) => void;
  onDeleteItinerary: (id: string) => void;
}

const CITY_IMAGES: Record<string, string> = {
  "Đà Nẵng": "https://lh3.googleusercontent.com/aida-public/AB6AXuD5At-6cET9zd0p_Ddr0I-e6V6S5MgGvyMlRsZypvm_b4y4k3yBIP5kr10F7hSJ9rrUYxC2tK8U3PXHYGS3lGjRs2_MUr_j34Y0Jjzc_XAt5Sef-mRQoYxyUYIiXLpLnkC6YG1wWgR65r5YdVFFHCZauL35xC_4DwuJXWB4jIFvYhmbHogp4zziqx4_svOClfY6SBddAi4_mlXFZioqW7fZfcK59BG4gbV2PCRx2EGgjD-m8_dWTgrB",
  "Phú Quốc": "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV",
  "Đà Lạt": "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
  "Sapa": "https://lh3.googleusercontent.com/aida-public/AB6AXuBv7gJQBQbB-0FKigGPYKinf7MUHMR-Zy3GJO4JG2Tw7k8xhzHGdbvS0622L2ci4Nr5go8bZYrLeXyb7YoYMuYeoZ58nJ6Ky2craeocNzKsxk6C6LzsRujPwjNpErOhjw3wTCtPb5OzDYbA2yj0_WB_AAMB1ItYmn83CxJq04zNokD5AWZEDZx2zyZzWBxQMSL4P9yc2D69BTRkzc05DQYCUOAQkG-x8wfsW0QeqTqVUYZoW-tyWNQh",
  "Hội An": "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX"
};

/** Ảnh theo thành phố; không có thì trả null để dùng nền màu thay vì ảnh không liên quan. */
const getCityImage = (city: string): string | null => {
  const matched = Object.keys(CITY_IMAGES).find((k) => city.toLowerCase().includes(k.toLowerCase()));
  return matched ? CITY_IMAGES[matched] : null;
};

export const ItineraryListView: React.FC<ItineraryListViewProps> = ({
  itineraries,
  onOpenTrip,
  onEditTrip,
  onCreateTrip,
  onDeleteItinerary,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDest, setNewDest] = useState("");
  const [newDuration, setNewDuration] = useState("3N2Đ");
  const [newBudget, setNewBudget] = useState("3.000.000");
  const [newStartDate, setNewStartDate] = useState("");

  const handleCreateNewItinerary = () => {
    const dest = newDest.trim();
    if (!dest) return;
    const dayCount = Math.max(1, parseInt(newDuration, 10) || 1);
    const newTrip: WanderItineraryData = {
      ...(newStartDate ? { start_date: newStartDate } : {}),
      meta: {
        destination: dest,
        trip_duration: newDuration,
        total_estimated_cost_vnd: parseCostInput(newBudget),
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: "",
      },
      map_config: { recommended_zoom: 12, search_center_hint: `${dest}, Việt Nam` },
      itinerary: Array.from({ length: dayCount }, (_, i) => ({
        day_number: i + 1,
        day_title: `Ngày ${i + 1}`,
        schedule: [],
      })),
      budget_breakdown: { food_and_drink_vnd: 0, attractions_and_activities_vnd: 0, transport_and_others_vnd: 0 },
      local_insider_tips: [],
    };
    onCreateTrip(newTrip);
    setIsModalOpen(false);
    setNewDest("");
  };

  return (
    <div className="flex flex-col min-h-screen pb-[160px] px-[20px] pt-4 max-w-3xl mx-auto w-full relative">
      <div className="mb-5">
        <h2 className="text-[24px] font-extrabold text-[#1b1c1a] tracking-tight">Lịch trình của bạn</h2>
        <p className="text-[14px] text-[#504537] mt-0.5">
          {itineraries.length ? `${itineraries.length} chuyến đi đã lưu` : "Chưa có chuyến đi nào"}
        </p>
      </div>

      <div className="flex flex-col gap-5 relative">
        {itineraries.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-[#E5E7EB] text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-[#FF6B35]/40" aria-hidden="true">explore</span>
            <h3 className="text-[16px] font-bold text-[#111827]">Chưa có chuyến đi nào</h3>
            <p className="text-[13px] text-[#6B7280] max-w-[280px]">
              Nhờ Trợ lý AI lập lịch trình, hoặc bấm "Tạo chuyến đi" để tự lên từ đầu.
            </p>
          </div>
        ) : (
          itineraries.map((itinerary) => {
            if (!itinerary.id) return null;
            const id = itinerary.id;
            const image = getCityImage(itinerary.meta.destination);
            const dateRange = tripDateRange(itinerary.start_date, itinerary.itinerary.length);
            const placeCount = itinerary.itinerary.reduce((n, d) => n + (d.schedule?.length || 0), 0);
            const firstDay = itinerary.itinerary[0];
            return (
              <article
                key={id}
                data-testid="trip-card"
                className="sleek-card rounded-[24px] overflow-hidden relative border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:border-[#FF6B35] hover:shadow-[0_8px_24px_rgba(255,107,53,0.1)]"
              >
                <button
                  type="button"
                  onClick={() => onOpenTrip(id)}
                  className="block w-full text-left focus-visible:outline-2 focus-visible:outline-[#FF6B35]"
                  aria-label={`Xem chuyến đi ${itinerary.meta.destination}`}
                >
                  <div className="h-36 w-full relative">
                    {image ? (
                      <div
                        className="bg-cover bg-center w-full h-full absolute inset-0"
                        style={{ backgroundImage: `url('${image}')` }}
                      ></div>
                    ) : (
                      <div className="w-full h-full absolute inset-0 sleek-gradient-bg opacity-80"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-[19px] font-extrabold text-white leading-tight">
                        Chuyến đi {itinerary.meta.destination}
                      </h3>
                      <p className="text-[13px] text-white/90 font-medium mt-0.5">
                        {itinerary.meta.trip_duration}
                        {dateRange ? ` (${dateRange})` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 pt-3 pb-1 bg-white text-[13px] text-[#4B5563] flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      {itinerary.itinerary.length} ngày, {placeCount} điểm
                    </span>
                    <span className="font-bold text-[#FF6B35]">
                      Dự kiến {formatThousands(itinerary.meta.total_estimated_cost_vnd || 0)} đ
                    </span>
                  </div>
                </button>

                <div className="px-4 pb-3 pt-2 bg-white flex items-center justify-between gap-2">
                  <span className="text-[12px] text-[#9CA3AF] truncate min-w-0">
                    {firstDay ? dayLabel(itinerary.start_date, 0, firstDay.day_number) : ""}
                    {firstDay?.day_title ? `: ${firstDay.day_title}` : ""}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditTrip(id)}
                      className="flex items-center gap-1 text-[#FF6B35] font-bold text-[13px] px-2.5 py-1.5 rounded-lg hover:bg-[#FFF7ED]"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit_calendar</span>
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xóa chuyến đi ${itinerary.meta.destination}? Không thể hoàn tác.`)) onDeleteItinerary(id);
                      }}
                      className="text-[#9CA3AF] hover:text-[#B91C1C] hover:bg-[#FEF2F2] h-8 w-8 rounded-lg flex items-center justify-center"
                      title="Xóa chuyến đi"
                      aria-label={`Xóa chuyến đi ${itinerary.meta.destination}`}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="fixed bottom-[92px] right-[20px] z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="sleek-gradient-bg text-white h-12 px-5 rounded-full shadow-[0px_8px_24px_rgba(255,107,53,0.35)] flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">add</span>
          <span className="text-[14px] font-extrabold">Tạo chuyến đi</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-labelledby="new-trip-title"
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-[#E5E7EB]"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="new-trip-title" className="text-[18px] font-extrabold text-[#111827]">
                Tạo chuyến đi
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng"
                className="text-[#9CA3AF] hover:text-[#111827] h-8 w-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-[12px] font-extrabold text-[#4B5563] block mb-1">Điểm đến</span>
                <input
                  type="text"
                  placeholder="Ví dụ: Vũng Tàu"
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value)}
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-[14px] outline-none focus:border-[#FF6B35] font-semibold bg-[#F9FAFB]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[12px] font-extrabold text-[#4B5563] block mb-1">Thời gian</span>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full p-3 border border-[#E5E7EB] rounded-xl text-[14px] outline-none focus:border-[#FF6B35] font-semibold bg-[#F9FAFB]"
                  >
                    <option value="1N">Đi trong ngày</option>
                    <option value="2N1Đ">2 ngày 1 đêm</option>
                    <option value="3N2Đ">3 ngày 2 đêm</option>
                    <option value="4N3Đ">4 ngày 3 đêm</option>
                    <option value="5N4Đ">5 ngày 4 đêm</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-extrabold text-[#4B5563] block mb-1">Ngân sách (đ)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value.replace(/[^\d.]/g, ""))}
                    onBlur={() => setNewBudget(formatThousands(parseCostInput(newBudget)))}
                    className="w-full p-3 border border-[#E5E7EB] rounded-xl text-[14px] outline-none focus:border-[#FF6B35] font-semibold bg-[#F9FAFB]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[12px] font-extrabold text-[#4B5563] block mb-1">Ngày bắt đầu (không bắt buộc)</span>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-[14px] outline-none focus:border-[#FF6B35] font-semibold bg-[#F9FAFB]"
                />
              </label>

              <button
                onClick={handleCreateNewItinerary}
                disabled={!newDest.trim()}
                className="w-full py-3.5 sleek-gradient-bg text-white rounded-xl font-bold text-[14px] shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:opacity-95 disabled:opacity-50 transition-opacity mt-2 cursor-pointer"
              >
                Tạo và mở trình thiết kế
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
