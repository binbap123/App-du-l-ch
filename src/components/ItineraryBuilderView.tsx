import React, { useMemo, useRef, useState } from "react";
import { WanderItineraryData, ScheduleItem, DayItinerary } from "../types";
import { PlaceSearchModal } from "./PlaceSearchModal";
import { useSuggestions } from "../hooks/useSuggestions";
import { formatVnd } from "./map/mapUtils";
import { dayLabel, formatThousands, isValidIsoDate, parseCostInput, sumScheduleCost, insertByTime } from "../lib/uiFormat";

interface ItineraryBuilderViewProps {
  itineraryData: WanderItineraryData;
  onSaveAndExport: (updatedData: WanderItineraryData) => void;
  onBack: () => void;
}

/** Ô chi phí: gõ số thô khi đang sửa, định dạng "65.000" khi rời ô. */
const CostInput: React.FC<{ value: number; onCommit: (v: number) => void; label: string }> = ({ value, onCommit, label }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center bg-white border border-[#E5E7EB] rounded-lg focus-within:border-[#FF6B35] pr-2">
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft ?? formatThousands(value || 0)}
        onFocus={(e) => {
          setDraft(value ? String(value) : "");
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={() => {
          if (draft !== null) onCommit(parseCostInput(draft));
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="bg-transparent font-bold text-[#111827] px-2.5 py-1 w-24 outline-none text-right"
      />
      <span className="text-[#6B7280] font-medium">đ</span>
    </span>
  );
};

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
  const [addedSuggestionIds, setAddedSuggestionIds] = useState<Set<string>>(new Set());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDay: DayItinerary = data.itinerary[activeDayIndex] ||
    data.itinerary[0] || { day_number: 1, day_title: "Ngày 1", schedule: [] };

  const totalTripCost = sumScheduleCost(data.itinerary);
  const totalBudgetMax = data.meta.total_estimated_cost_vnd || 0;
  const remainingBudget = totalBudgetMax - totalTripCost;
  const budgetPercent = totalBudgetMax ? Math.min(100, Math.round((totalTripCost / totalBudgetMax) * 100)) : 0;

  // Danh sách tên chụp lại lúc mở tray, để thêm gợi ý không làm gọi lại API.
  const [trayExisting, setTrayExisting] = useState<string[]>([]);
  const suggestionParams = useMemo(
    () =>
      isTrayOpen
        ? { destination: data.meta.destination, dayIndex: activeDayIndex, existingPlaces: trayExisting }
        : null,
    [isTrayOpen, data.meta.destination, activeDayIndex, trayExisting]
  );
  const { suggestions, notice, loading, error, refresh } = useSuggestions(suggestionParams);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const updateDay = (dayIdx: number, fn: (d: DayItinerary) => DayItinerary) => {
    setData((prev) => {
      const days = [...prev.itinerary];
      if (!days[dayIdx]) return prev;
      days[dayIdx] = fn(days[dayIdx]);
      return { ...prev, itinerary: days };
    });
  };

  const handleDeleteItem = (itemId: string) => {
    updateDay(activeDayIndex, (d) => ({ ...d, schedule: d.schedule.filter((it) => it.id !== itemId) }));
    showToast("Đã xóa địa điểm");
  };

  const handleUpdateItemCost = (itemId: string, cost: number) => {
    updateDay(activeDayIndex, (d) => ({
      ...d,
      schedule: d.schedule.map((it) => (it.id === itemId ? { ...it, cost_vnd: cost } : it)),
    }));
  };

  const handleAddPlaceFromSearch = (targetDayIdx: number, newItem: ScheduleItem) => {
    if (!data.itinerary[targetDayIdx]) return;
    updateDay(targetDayIdx, (d) => ({ ...d, schedule: insertByTime(d.schedule || [], newItem) }));
    setActiveDayIndex(targetDayIdx);
    showToast(`Đã thêm "${newItem.place_name}" vào ngày ${targetDayIdx + 1}`);
  };

  const handleAddSuggestion = (sug: ScheduleItem) => {
    const newItem: ScheduleItem = { ...sug, id: `${sug.id || "sg"}_${Date.now()}` };
    updateDay(activeDayIndex, (d) => ({ ...d, schedule: insertByTime(d.schedule, newItem) }));
    setAddedSuggestionIds((prev) => new Set(prev).add(sug.id));
    showToast(`Đã thêm "${sug.place_name}" vào ngày ${activeDayIndex + 1}`);
  };

  const openTray = () => {
    setTrayExisting(data.itinerary.flatMap((d) => d.schedule.map((it) => it.place_name)));
    setAddedSuggestionIds(new Set());
    setIsTrayOpen(true);
  };

  const handleAddNewDay = () => {
    const newDayNum = data.itinerary.length + 1;
    setData({
      ...data,
      itinerary: [...data.itinerary, { day_number: newDayNum, day_title: `Ngày ${newDayNum}`, schedule: [] }],
    });
    setActiveDayIndex(data.itinerary.length);
    showToast(`Đã thêm ngày ${newDayNum}`);
  };

  const handleStartDate = (value: string) => {
    setData((prev) => {
      const next = { ...prev };
      if (isValidIsoDate(value)) next.start_date = value;
      else delete next.start_date;
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-[200px] text-[#111827]">
      <header className="bg-[#F0F2F5]/90 backdrop-blur-md border-b border-[#E5E7EB] sticky top-0 z-40 flex flex-col pt-safe">
        <div className="flex items-center justify-between gap-2 px-[20px] h-14 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              aria-label="Quay lại"
              className="text-[#4B5563] hover:bg-white h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors border border-[#E5E7EB]"
            >
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            </button>
            <h1 className="text-[17px] font-extrabold text-[#111827] tracking-tight truncate">
              {data.meta.destination}
            </h1>
          </div>
          <button
            onClick={() => onSaveAndExport(data)}
            className="shrink-0 sleek-gradient-bg text-white font-bold text-[13px] px-4 py-2 rounded-xl hover:opacity-95 transition-all shadow-[0_4px_12px_rgba(255,107,53,0.25)]"
          >
            Lưu & Xuất
          </button>
        </div>

        <div className="px-[20px] pb-3 space-y-2">
          <div className="flex justify-between items-center gap-2 text-[13px]">
            <span className="text-[#6B7280]">
              {formatThousands(totalTripCost)}
              {totalBudgetMax ? ` / ${formatThousands(totalBudgetMax)}` : ""} đ
            </span>
            {totalBudgetMax > 0 && (
              <span className={`font-extrabold ${remainingBudget < 0 ? "text-[#B91C1C]" : "text-[#FF6B35]"}`}>
                {remainingBudget < 0
                  ? `Vượt ${formatThousands(-remainingBudget)} đ`
                  : `Còn ${formatThousands(remainingBudget)} đ`}
              </span>
            )}
          </div>
          {totalBudgetMax > 0 && (
            <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className="h-full sleek-gradient-bg rounded-full transition-all duration-300"
                style={{ width: `${budgetPercent}%` }}
              ></div>
            </div>
          )}
          <label className="flex items-center gap-2 text-[13px] text-[#4B5563]">
            <span className="font-medium shrink-0">Ngày bắt đầu</span>
            <input
              type="date"
              data-testid="start-date-input"
              value={data.start_date || ""}
              onChange={(e) => handleStartDate(e.target.value)}
              className="min-w-0 flex-1 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1 font-semibold text-[#111827] focus:border-[#FF6B35] outline-none"
            />
          </label>
        </div>

        <div className="px-[20px] pb-3 flex gap-2.5 overflow-x-auto hide-scrollbar" role="tablist" aria-label="Chọn ngày">
          {data.itinerary.map((day, idx) => (
            <button
              key={`${day.day_number}-${idx}`}
              role="tab"
              aria-selected={activeDayIndex === idx}
              onClick={() => setActiveDayIndex(idx)}
              className={`shrink-0 text-[13px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                activeDayIndex === idx
                  ? "sleek-gradient-bg text-white shadow-sm"
                  : "bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
              }`}
            >
              {dayLabel(data.start_date, idx, day.day_number)}
            </button>
          ))}
          <button
            onClick={handleAddNewDay}
            className="shrink-0 bg-white text-[#4B5563] border border-[#E5E7EB] text-[13px] font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1 hover:bg-[#F9FAFB]"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">add</span> Thêm ngày
          </button>
        </div>
      </header>

      <div className="px-[20px] py-6 max-w-2xl mx-auto" data-testid="builder-timeline">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-[15px] font-extrabold text-[#111827] min-w-0">
            {activeDay.day_title || `Ngày ${activeDayIndex + 1}`}
          </h2>
          <span className="text-[12px] text-[#6B7280] shrink-0">{activeDay.schedule.length} điểm</span>
        </div>

        {activeDay.schedule.length === 0 && (
          <div className="bg-white rounded-[20px] border border-dashed border-[#E5E7EB] p-6 text-center text-[13px] text-[#6B7280]">
            Ngày này chưa có điểm nào. Tìm địa điểm hoặc xem gợi ý từ AI để thêm.
          </div>
        )}

        <div className="relative pl-6">
          {activeDay.schedule.length > 0 && (
            <div className="absolute left-6 top-6 bottom-6 w-0.5 dashed-line -ml-[1px]"></div>
          )}

          {activeDay.schedule.map((item, idx) => (
            <div key={item.id} className="relative mb-6 group">
              <div className="absolute -left-6 top-6 w-3 h-3 sleek-gradient-bg rounded-full -ml-[5px] border-2 border-white z-10 shadow-sm"></div>

              <div className="sleek-card rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] transition-all hover:border-[#FF6B35]">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="bg-[#FFF7ED] text-[#FF6B35] text-[12px] font-extrabold px-3 py-0.5 rounded-full flex items-center gap-1 border border-[#FFEDD5]">
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>
                      <span>{item.time_slot}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.place_name + " " + (item.address_hint || data.meta.destination))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1A73E8] hover:bg-[#E8F0FE] h-7 w-7 flex items-center justify-center rounded-full transition-colors"
                        title="Mở trên Google Maps"
                        aria-label={`Mở ${item.place_name} trên Google Maps`}
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">pin_drop</span>
                      </a>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[#EF4444] hover:bg-[#FEE2E2] h-7 w-7 flex items-center justify-center rounded-full transition-colors"
                        title="Xóa địa điểm"
                        aria-label={`Xóa ${item.place_name}`}
                      >
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {item.image_url && (
                      <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] overflow-hidden shrink-0 relative">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-[#111827] line-clamp-2 mb-0.5">{item.place_name}</h3>
                      {item.address_hint && (
                        <p className="text-[11px] text-[#6B7280] line-clamp-1 mb-1">{item.address_hint}</p>
                      )}
                      {item.recommended_dish_or_activity && (
                        <p className="text-[11px] text-[#92400E] font-medium line-clamp-2">
                          {item.recommended_dish_or_activity}
                        </p>
                      )}
                      {item.geo_source === "ai_estimate" && (
                        <p className="text-[10px] text-[#9CA3AF] mt-0.5">vị trí ước lượng</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#E5E7EB] text-[12px]">
                    <span className="text-[#6B7280] font-medium">Chi phí dự kiến</span>
                    <CostInput
                      value={item.cost_vnd || 0}
                      label={`Chi phí ${item.place_name}`}
                      onCommit={(v) => handleUpdateItemCost(item.id, v)}
                    />
                  </div>
                </div>
              </div>

              {idx < activeDay.schedule.length - 1 && (
                <div className="mt-3 -ml-6 pl-10 flex items-center gap-2 text-[#6B7280]">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(item.place_name + " " + data.meta.destination)}&destination=${encodeURIComponent(activeDay.schedule[idx + 1].place_name + " " + data.meta.destination)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white px-3 py-1 rounded-full border border-[#E5E7EB] flex items-center gap-1.5 text-[12px] font-medium hover:border-[#1A73E8] hover:text-[#1A73E8] cursor-pointer shadow-sm transition-all"
                  >
                    <span className="material-symbols-outlined text-[15px] text-[#1A73E8]" aria-hidden="true">directions_car</span>
                    <span>Chỉ đường tới điểm tiếp theo</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Thanh thao tác, nằm trên Navbar (76px) */}
      <div className="fixed bottom-[76px] left-0 w-full z-30 bg-gradient-to-t from-[#F0F2F5] via-[#F0F2F5] to-transparent pt-4 px-[20px]">
        <div className="max-w-2xl mx-auto flex gap-2.5 pb-3">
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex-1 min-w-0 bg-white border-2 border-[#1A73E8] text-[#1A73E8] font-extrabold text-[14px] py-3 rounded-2xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:bg-[#E8F0FE]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">search</span>
            <span className="truncate">Tìm địa điểm</span>
          </button>
          <button
            onClick={() => (isTrayOpen ? setIsTrayOpen(false) : openTray())}
            className="flex-1 min-w-0 sleek-gradient-bg text-white font-extrabold text-[14px] py-3 rounded-2xl shadow-[0_4px_16px_rgba(255,107,53,0.3)] flex items-center justify-center gap-1.5 active:scale-95 transition-transform hover:opacity-95"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
              auto_awesome
            </span>
            <span className="truncate">Gợi ý từ AI</span>
          </button>
        </div>
      </div>

      <PlaceSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectAndAdd={handleAddPlaceFromSearch}
        destinationCity={data.meta.destination}
        days={data.itinerary}
        activeDayIndex={activeDayIndex}
      />

      {isTrayOpen && (
        <div
          role="dialog"
          aria-label="Gợi ý từ AI"
          data-testid="suggestion-tray"
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] z-[60] border-t border-[#E5E7EB]"
        >
          <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={() => setIsTrayOpen(false)}>
            <div className="w-12 h-1.5 bg-[#E5E7EB] rounded-full"></div>
          </div>
          <div className="px-[20px] pb-6 pt-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-extrabold text-[#111827]">
                Gợi ý cho {dayLabel(data.start_date, activeDayIndex, activeDay.day_number).replace(/^Ngày/, "ngày")}
              </h2>
              <button onClick={() => setIsTrayOpen(false)} className="text-[#6B7280] text-[13px] font-bold px-2 py-1">
                Đóng
              </button>
            </div>

            {notice && !error && <p className="text-[12px] text-[#6B7280] mb-2">{notice}</p>}

            {loading ? (
              <div className="flex gap-3 overflow-hidden pb-3" aria-live="polite">
                <p className="sr-only">Đang tải gợi ý…</p>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="shrink-0 w-48 h-[148px] rounded-2xl bg-[#F3F4F6] animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 text-[13px] text-[#B91C1C]" role="alert">
                <p>{error}</p>
                <button onClick={refresh} className="mt-2 font-bold underline">
                  Thử lại
                </button>
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-[13px] text-[#6B7280] bg-[#F9FAFB] rounded-2xl p-4">
                Chưa có gợi ý nào cho {data.meta.destination}. Hãy dùng Tìm địa điểm để tự thêm.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-3">
                {suggestions.map((sug) => {
                  const added = addedSuggestionIds.has(sug.id);
                  return (
                    <div
                      key={sug.id}
                      data-testid="suggestion-card"
                      className="shrink-0 w-52 bg-white rounded-2xl border border-[#E5E7EB] p-3 flex flex-col gap-1.5 shadow-sm"
                    >
                      <h4 className="text-[13px] font-bold text-[#111827] line-clamp-2 min-h-[36px]">{sug.place_name}</h4>
                      {sug.recommended_dish_or_activity && (
                        <p className="text-[11px] text-[#6B7280] line-clamp-2">{sug.recommended_dish_or_activity}</p>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280] mt-auto">
                        <span>{sug.time_slot}</span>
                        <span className="font-bold text-[#FF6B35]">{formatVnd(sug.cost_vnd)}</span>
                      </div>
                      <button
                        onClick={() => handleAddSuggestion(sug)}
                        disabled={added}
                        className="w-full py-1.5 sleek-gradient-bg text-white rounded-lg text-[12px] font-bold mt-1 shadow-sm disabled:opacity-50"
                      >
                        {added ? "Đã thêm" : "Thêm vào ngày này"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] w-max max-w-[calc(100vw-32px)] text-center bg-[#111827] text-white text-[13px] font-bold px-4 py-2 rounded-2xl shadow-lg border border-white/20"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
