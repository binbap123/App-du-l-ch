import React, { Suspense, lazy, useState } from "react";
import { WanderItineraryData } from "../types";
import { buildTripDirectionsUrls } from "../lib/mapsExport";
import { dayColor } from "./map/mapUtils";

// Leaflet chỉ tải khi mở rộng một card
const TripMap = lazy(() => import("./map/TripMap"));

interface ItineraryListViewProps {
  itineraries: WanderItineraryData[];
  currentItinerary: WanderItineraryData;
  onSelectItinerary: (itinerary: WanderItineraryData) => void;
  onDeleteItinerary: (id: string) => void;
  onOpenBuilder: () => void;
  /** @deprecated Không còn dùng (export theo từng trip qua mapsExport). Giữ để App.tsx không lỗi — Phase 3 dọn. */
  onExportGoogleMaps?: () => void;
}

const CITY_IMAGES: Record<string, string> = {
  "Đà Nẵng": "https://lh3.googleusercontent.com/aida-public/AB6AXuD5At-6cET9zd0p_Ddr0I-e6V6S5MgGvyMlRsZypvm_b4y4k3yBIP5kr10F7hSJ9rrUYxC2tK8U3PXHYGS3lGjRs2_MUr_j34Y0Jjzc_XAt5Sef-mRQoYxyUYIiXLpLnkC6YG1wWgR65r5YdVFFHCZauL35xC_4DwuJXWB4jIFvYhmbHogp4zziqx4_svOClfY6SBddAi4_mlXFZioqW7fZfcK59BG4gbV2PCRx2EGgjD-m8_dWTgrB",
  "Phú Quốc": "https://lh3.googleusercontent.com/aida-public/AB6AXuD5At-6cET9zd0p_Ddr0I-e6V6S5MgGvyMlRsZypvm_b4y4k3yBIP5kr10F7hSJ9rrUYxC2tK8U3PXHYGS3lGjRs2_MUr_j34Y0Jjzc_XAt5Sef-mRQoYxyUYIiXLpLnkC6YG1wWgR65r5YdVFFHCZauL35xC_4DwuJXWB4jIFvYhmbHogp4zziqx4_svOClfY6SBddAi4_mlXFZioqW7fZfcK59BG4gbV2PCRx2EGgjD-m8_dWTgrB",
  "Đà Lạt": "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
  "Nha Trang": "https://lh3.googleusercontent.com/aida-public/AB6AXuCQaeLXcuxT8j0GQ-8ehr1wvon3ary3s-08q3238jTI_mjWLZ4xJqRcyx-FDcO_PId8Cy05ZyPzULXmsFiyoJd5quv6YJPAgl7Q0l3KK9_5Gro1sXZ6KzEYwyfaMjLWmUzFyxm2EBAErAoTWxJWbJVCbNOh-iSXbNYquOHWPfUNCCUUybNuLVtKuW-BbGUWoNokOowCY2mOuMailuPADz0C7Qzz3LKe0yssD0WOQxhBcS8A9rndZGIj",
  "Hà Nội": "https://lh3.googleusercontent.com/aida-public/AB6AXuCQaeLXcuxT8j0GQ-8ehr1wvon3ary3s-08q3238jTI_mjWLZ4xJqRcyx-FDcO_PId8Cy05ZyPzULXmsFiyoJd5quv6YJPAgl7Q0l3KK9_5Gro1sXZ6KzEYwyfaMjLWmUzFyxm2EBAErAoTWxJWbJVCbNOh-iSXbNYquOHWPfUNCCUUybNuLVtKuW-BbGUWoNokOowCY2mOuMailuPADz0C7Qzz3LKe0yssD0WOQxhBcS8A9rndZGIj",
  "Sapa": "https://lh3.googleusercontent.com/aida-public/AB6AXuBv7gJQBQbB-0FKigGPYKinf7MUHMR-Zy3GJO4JG2Tw7k8xhzHGdbvS0622L2ci4Nr5go8bZYrLeXyb7YoYMuYeoZ58nJ6Ky2craeocNzKsxk6C6LzsRujPwjNpErOhjw3wTCtPb5OzDYbA2yj0_WB_AAMB1ItYmn83CxJq04zNokD5AWZEDZx2zyZzWBxQMSL4P9yc2D69BTRkzc05DQYCUOAQkG-x8wfsW0QeqTqVUYZoW-tyWNQh",
  "Hội An": "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX"
};

const getCityImage = (city: string) => {
  const matched = Object.keys(CITY_IMAGES).find(k => city.toLowerCase().includes(k.toLowerCase()));
  return matched ? CITY_IMAGES[matched] : "https://lh3.googleusercontent.com/aida-public/AB6AXuAnGvf81ZhNlfwPPzCV8drZpVXLH602V8NJPzEwRzopQc0MLcqYwh9OslkyW8Jmo499fO_fN4H6hbiMkoicHg5kPbmWh0FGCaTTYlFveoPsSyIfHoDyZTniHCUCixVPddt1SK3caFkGh3RZJgogGvXQkQgzj7fdoYohU30BcLCy3UuhWHDPbJ2jlzUYgPEs2IFAYAqnG2F-YM3w8JvmUpd4VOkHC7ct-3xvooa8R7i1iW3LRHRRm";
};

export const ItineraryListView: React.FC<ItineraryListViewProps> = ({
  itineraries,
  currentItinerary,
  onSelectItinerary,
  onDeleteItinerary,
  onOpenBuilder,
}) => {
  const [expandedItineraryId, setExpandedItineraryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDest, setNewDest] = useState("");
  const [newDuration, setNewDuration] = useState("3N2Đ");
  const [newBudget, setNewBudget] = useState("3.000.000 đ");

  const handleCreateNewItinerary = () => {
    if (!newDest.trim()) return;
    const numBudget = parseInt(newBudget.replace(/\D/g, ""), 10) || 2000000;
    const newTrip: WanderItineraryData = {
      id: `trip_${Date.now()}`,
      meta: {
        destination: newDest,
        trip_duration: newDuration,
        total_estimated_cost_vnd: numBudget,
        currency_symbol: "đ",
        theme_color: "#FF6B35",
        summary: `Chuyến đi tự lên lịch tới ${newDest} kéo dài ${newDuration}. Hãy chỉnh sửa các địa điểm để hoàn tất timeline.`
      },
      map_config: {
        recommended_zoom: 12,
        search_center_hint: `${newDest}, Việt Nam`
      },
      itinerary: [
        {
          day_number: 1,
          day_title: "Ngày 1 - Check-in điểm đầu tiên",
          schedule: [
            {
              id: `init_${Date.now()}`,
              time_slot: "09:00 - 10:30",
              time_period: "morning",
              place_name: `Điểm check-in tại ${newDest}`,
              category: "attraction",
              category_icon: "photo_camera",
              address_hint: `Thành phố ${newDest}`,
              recommended_dish_or_activity: "Chụp ảnh phong cảnh và hóng gió nhẹ",
              cost_vnd: 0,
              social_trend: { is_viral: false, platform: "none", badge_label: "Khám phá" },
              ui_card: { badge_color: "#1B6D24", quick_description: "Check-in ban đầu" }
            }
          ]
        }
      ],
      budget_breakdown: {
        food_and_drink_vnd: 0,
        attractions_and_activities_vnd: 0,
        transport_and_others_vnd: 0
      },
      local_insider_tips: [
        { type: "transport", icon: "directions_bus", content: "Hãy thuê xe tự lái để chủ động hành trình của bạn." }
      ]
    };

    onSelectItinerary(newTrip);
    setIsModalOpen(false);
    setNewDest("");
  };

  const toggleExpand = (id: string) => {
    setExpandedItineraryId(expandedItineraryId === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-screen pb-[120px] px-[20px] pt-4 max-w-3xl mx-auto w-full relative">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-5">
        <div>
          <h2 className="text-[24px] font-extrabold text-[#1b1c1a] tracking-tight">
            Lịch trình của bạn
          </h2>
          <p className="text-[14px] text-[#504537] mt-0.5">
            Bạn có {itineraries.length} chuyến đi trong danh sách
          </p>
        </div>
      </div>

      {/* Trip Cards Stack */}
      <div className="flex flex-col gap-6 relative">
        {itineraries.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-dashed border-[#E5E7EB] text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-[#FF6B35]/40">explore</span>
            <h3 className="text-[16px] font-bold text-[#111827]">Chưa có lịch trình nào được lưu</h3>
            <p className="text-[13px] text-[#6B7280] max-w-[280px]">
              Bạn có thể trò chuyện với WanderAI ở tab <b>Trợ lý AI</b> để tự động tạo lịch trình hoặc bấm nút bên dưới để tự viết.
            </p>
          </div>
        ) : (
          itineraries.map((itinerary) => {
            const id = itinerary.id || "temp";
            const isExpanded = expandedItineraryId === id;
            return (
              <article
                key={id}
                className="sleek-card rounded-[24px] overflow-hidden relative border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:border-[#FF6B35] hover:shadow-[0_8px_24px_rgba(255,107,53,0.1)]"
              >
                <div className="h-44 w-full relative">
                  <div
                    className="bg-cover bg-center w-full h-full absolute inset-0 rounded-t-[24px]"
                    style={{
                      backgroundImage: `url('${getCityImage(itinerary.meta.destination)}')`,
                    }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Delete button (Top Right overlay) */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {currentItinerary.id === id && (
                      <span className="bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-[#BBF7D0]">
                        Đang chọn
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Bạn có chắc chắn muốn xóa lịch trình ${itinerary.meta.destination}?`)) {
                          onDeleteItinerary(id);
                        }
                      }}
                      className="bg-black/50 hover:bg-red-600 text-white h-8 w-8 rounded-full flex items-center justify-center transition-colors border border-white/20"
                      title="Xóa lịch trình"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4" onClick={() => toggleExpand(id)}>
                    <h3 className="text-[20px] font-extrabold text-white">
                      Chuyến đi {itinerary.meta.destination}
                    </h3>
                    <p className="text-[13px] text-white/90 font-medium flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                      Thời gian: {itinerary.meta.trip_duration}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold bg-[#FFF7ED] text-[#FF6B35] px-2.5 py-1 rounded-md border border-[#FFEDD5]">
                        Chi phí: {itinerary.meta.total_estimated_cost_vnd.toLocaleString("vi-VN")} đ
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectItinerary(itinerary)}
                        className="flex items-center gap-1 text-[#FF6B35] font-extrabold text-[13px] hover:underline"
                      >
                        <span>Mở Trình thiết kế</span>
                        <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                      </button>
                    </div>
                  </div>

                  {/* Details Toggle Button */}
                  <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                    <div
                      className="flex justify-between items-center cursor-pointer mb-2"
                      onClick={() => toggleExpand(id)}
                    >
                      <h4 className="text-[13px] font-bold text-[#111827]">
                        Xem nhanh lịch trình ({itinerary.itinerary.length} ngày)
                      </h4>
                      <span className="material-symbols-outlined text-[18px] text-[#6B7280]">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="flex flex-col gap-3 mt-2">
                        <p className="text-[13px] text-[#4B5563] italic">
                          {itinerary.meta.summary}
                        </p>

                        {/* List highlights */}
                        <div className="flex flex-col gap-1.5 bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB]">
                          {itinerary.itinerary.slice(0, 3).map((day) => (
                            <div key={day.day_number} className="text-[12px]">
                              <span className="font-bold text-[#111827]">Ngày {day.day_number}:</span>{" "}
                              <span className="text-[#6B7280]">{day.day_title}</span>
                              <div className="pl-3 mt-0.5 flex flex-wrap gap-1.5">
                                {day.schedule.slice(0, 2).map((item) => (
                                  <span key={item.id} className="inline-flex items-center bg-white text-[11px] px-2 py-0.5 rounded-full border border-[#E5E7EB] text-[#4B5563]">
                                    📍 {item.place_name}
                                  </span>
                                ))}
                                {day.schedule.length > 2 && (
                                  <span className="text-[10px] text-[#9CA3AF] self-center">+{day.schedule.length - 2} điểm</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Bản đồ tuyến (chỉ mount khi card mở) */}
                        <Suspense
                          fallback={
                            <div className="h-[220px] rounded-xl map-bg flex items-center justify-center text-[12px] text-[#6B7280]">
                              Đang tải bản đồ…
                            </div>
                          }
                        >
                          <TripMap trip={itinerary} height={220} />
                        </Suspense>

                        {(() => {
                          const links = buildTripDirectionsUrls(itinerary);
                          if (!links.length) return null;
                          return (
                            <div className="flex flex-col gap-2 bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-3">
                              <p className="text-[12px] font-bold text-[#9A3412] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">directions</span>
                                Chỉ đường Google Maps theo ngày
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {links.map(({ day, dayIdx, url }) => (
                                  <a
                                    key={dayIdx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="day-directions-link"
                                    className="inline-flex items-center gap-1.5 bg-white text-[#111827] text-[12px] font-bold px-3 py-1.5 rounded-full border border-[#E5E7EB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: dayColor(dayIdx) }} />
                                    Ngày {day}
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Floating Action Button (FAB) for Manual Creation */}
      <div className="fixed bottom-[92px] right-[20px] z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          className="sleek-gradient-bg text-white h-14 px-5 rounded-full shadow-[0px_8px_24px_rgba(255,107,53,0.35)] flex items-center justify-center gap-2 hover:scale-105 transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">add</span>
          <span className="text-[14px] font-extrabold">Tạo chuyến đi mới</span>
        </button>
      </div>

      {/* Add New Trip Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-[#E5E7EB] animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[18px] font-extrabold text-[#111827] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#FF6B35]">add_location_alt</span>
                Tạo Chuyến Đi Mới
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#111827] h-8 w-8 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-extrabold text-[#4B5563] block mb-1">Điểm đến</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Vũng Tàu, Nha Trang, Đà Lạt..."
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value)}
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-[14px] outline-none focus:border-[#FF6B35] font-semibold bg-[#F9FAFB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-extrabold text-[#4B5563] block mb-1">Thời gian</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full p-3 border border-[#E5E7EB] rounded-xl text-[14px] outline-none focus:border-[#FF6B35] font-semibold bg-[#F9FAFB]"
                  >
                    <option value="1N">Đi trong ngày</option>
                    <option value="2N1Đ">2 Ngày 1 Đêm</option>
                    <option value="3N2Đ">3 Ngày 2 Đêm</option>
                    <option value="4N3Đ">4 Ngày 3 Đêm</option>
                    <option value="5N4Đ">5 Ngày 4 Đêm</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-extrabold text-[#4B5563] block mb-1">Ngân sách dự kiến</label>
                  <input
                    type="text"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full p-3 border border-[#E5E7EB] rounded-xl text-[14px] outline-none focus:border-[#FF6B35] font-semibold bg-[#F9FAFB]"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateNewItinerary}
                disabled={!newDest.trim()}
                className="w-full py-3.5 sleek-gradient-bg text-white rounded-xl font-bold text-[14px] shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:opacity-95 disabled:opacity-50 transition-opacity mt-2 cursor-pointer"
              >
                Tạo và Mở Lịch Trình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
