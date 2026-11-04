import React, { Suspense, lazy, useState } from "react";
import type { WanderItineraryData } from "../types";
import { buildTripDirectionsUrls } from "../lib/mapsExport";
import { dayColor, formatVnd } from "../components/map/mapUtils";
import { dayLabel, formatThousands, sumScheduleCost, tripDateRange } from "../lib/uiFormat";

// Leaflet chỉ tải khi vào trang chi tiết
const TripMap = lazy(() => import("../components/map/TripMap"));

interface TripDetailPageProps {
  trip: WanderItineraryData;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const BUDGET_ROWS: { key: keyof WanderItineraryData["budget_breakdown"]; label: string }[] = [
  { key: "food_and_drink_vnd", label: "Ăn uống" },
  { key: "attractions_and_activities_vnd", label: "Tham quan và hoạt động" },
  { key: "transport_and_others_vnd", label: "Di chuyển và chi phí khác" },
];

export const TripDetailPage: React.FC<TripDetailPageProps> = ({ trip, onBack, onEdit, onDelete }) => {
  const days = trip.itinerary || [];
  const [dayIdx, setDayIdx] = useState(0);
  const safeIdx = Math.min(dayIdx, Math.max(0, days.length - 1));
  const day = days[safeIdx];
  const dateRange = tripDateRange(trip.start_date, days.length);
  const placesCost = sumScheduleCost(days);
  const links = buildTripDirectionsUrls(trip);
  const budget = trip.budget_breakdown;
  const budgetTotal = budget ? BUDGET_ROWS.reduce((s, r) => s + (Number(budget[r.key]) || 0), 0) : 0;
  const tips = trip.local_insider_tips || [];

  const handleDelete = () => {
    if (confirm(`Xóa chuyến đi ${trip.meta.destination}? Không thể hoàn tác.`)) onDelete();
  };

  return (
    <div className="flex flex-col min-h-screen pb-[120px] px-[20px] pt-3 max-w-3xl mx-auto w-full" data-testid="trip-detail">
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] -ml-1 px-1 py-1 rounded-lg"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        Lịch trình
      </button>

      {/* Tiêu đề */}
      <header className="mt-2">
        <h2 className="text-[24px] leading-tight font-extrabold text-[#1b1c1a] tracking-tight">
          Chuyến đi {trip.meta.destination}
        </h2>
        <p className="text-[13px] text-[#504537] mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">calendar_month</span>
            {trip.meta.trip_duration}
            {dateRange && <span className="text-[#6B7280]">({dateRange})</span>}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">payments</span>
            Dự kiến {formatThousands(trip.meta.total_estimated_cost_vnd || 0)} đ
          </span>
        </p>
        {trip.meta.summary && <p className="text-[14px] text-[#4B5563] mt-3 leading-relaxed">{trip.meta.summary}</p>}

        <div className="flex gap-2.5 mt-4">
          <button
            onClick={onEdit}
            className="flex-1 sleek-gradient-bg text-white font-bold text-[14px] py-2.5 rounded-xl shadow-[0_4px_12px_rgba(255,107,53,0.25)] flex items-center justify-center gap-1.5 hover:opacity-95"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit_calendar</span>
            Chỉnh sửa
          </button>
          <button
            onClick={handleDelete}
            className="px-4 bg-white border border-[#E5E7EB] text-[#B91C1C] font-bold text-[14px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#FEF2F2] hover:border-[#FECACA]"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
            Xóa
          </button>
        </div>
      </header>

      {/* Bản đồ */}
      <section className="mt-6" aria-label="Bản đồ chuyến đi">
        <Suspense
          fallback={
            <div className="h-[280px] rounded-xl map-bg flex items-center justify-center text-[12px] text-[#6B7280]">
              Đang tải bản đồ…
            </div>
          }
        >
          <TripMap trip={trip} height={280} activeDay={days.length > 1 ? safeIdx : "all"} showLegend={false} />
        </Suspense>
      </section>

      {/* Chọn ngày + timeline */}
      <section className="mt-6" aria-labelledby="timeline-heading">
        <h3 id="timeline-heading" className="text-[17px] font-extrabold text-[#111827] mb-3">
          Lịch trình từng ngày
        </h3>
        {days.length > 1 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 -mx-[20px] px-[20px]" role="tablist">
            {days.map((d, i) => (
              <button
                key={`${d.day_number}-${i}`}
                role="tab"
                aria-selected={i === safeIdx}
                onClick={() => setDayIdx(i)}
                className={`shrink-0 text-[13px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  i === safeIdx
                    ? "sleek-gradient-bg text-white shadow-sm"
                    : "bg-white text-[#4B5563] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                }`}
              >
                {dayLabel(trip.start_date, i, d.day_number)}
              </button>
            ))}
          </div>
        )}

        {day ? (
          <div>
            <p className="text-[14px] font-bold text-[#111827] mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dayColor(safeIdx) }} />
              {days.length === 1 && `${dayLabel(trip.start_date, 0, day.day_number)}: `}
              {day.day_title}
            </p>
            {day.schedule.length === 0 ? (
              <p className="text-[13px] text-[#6B7280] bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-4">
                Ngày này chưa có điểm nào. Bấm Chỉnh sửa để thêm.
              </p>
            ) : (
              <ol className="relative border-l-2 border-dashed border-[#E5E7EB] ml-2 flex flex-col gap-4">
                {day.schedule.map((item, i) => (
                  <li key={item.id} className="relative pl-5">
                    <span
                      className="absolute -left-[13px] top-3 w-6 h-6 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center border-2 border-white shadow-sm"
                      style={{ background: dayColor(safeIdx) }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <div className="bg-white rounded-2xl p-3.5 border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[12px] font-extrabold text-[#FF6B35]">{item.time_slot}</span>
                        <span className="text-[12px] font-bold text-[#111827] shrink-0">{formatVnd(item.cost_vnd)}</span>
                      </div>
                      <h4 className="text-[15px] font-bold text-[#111827] mt-0.5">{item.place_name}</h4>
                      {item.address_hint && (
                        <p className="text-[12px] text-[#6B7280] mt-0.5">
                          {item.address_hint}
                          {item.geo_source === "ai_estimate" && (
                            <span className="text-[11px] text-[#9CA3AF]"> · vị trí ước lượng</span>
                          )}
                        </p>
                      )}
                      {!item.address_hint && item.geo_source === "ai_estimate" && (
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">vị trí ước lượng</p>
                      )}
                      {item.recommended_dish_or_activity && (
                        <p className="text-[13px] text-[#92400E] mt-1.5">{item.recommended_dish_or_activity}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-[#6B7280]">Chuyến đi chưa có ngày nào.</p>
        )}
      </section>

      {/* Chỉ đường */}
      {links.length > 0 && (
        <section className="mt-6 flex flex-col gap-2 bg-[#FFF7ED] border border-[#FFEDD5] rounded-2xl p-4">
          <h3 className="text-[14px] font-bold text-[#9A3412] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">directions</span>
            Chỉ đường trên Google Maps
          </h3>
          <div className="flex flex-wrap gap-2">
            {links.map(({ day: n, dayIdx: di, url }) => (
              <a
                key={di}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="day-directions-link"
                className="inline-flex items-center gap-1.5 bg-white text-[#111827] text-[12px] font-bold px-3 py-1.5 rounded-full border border-[#E5E7EB] hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: dayColor(di) }} />
                {dayLabel(trip.start_date, di, n)}
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">open_in_new</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Ngân sách */}
      <section className="mt-6" aria-labelledby="budget-heading">
        <h3 id="budget-heading" className="text-[17px] font-extrabold text-[#111827] mb-3">
          Ngân sách
        </h3>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <table className="w-full text-[13px]">
            <tbody>
              {BUDGET_ROWS.map((r) => (
                <tr key={r.key} className="border-b border-[#F3F4F6]">
                  <th scope="row" className="text-left font-medium text-[#4B5563] px-4 py-2.5">{r.label}</th>
                  <td className="text-right font-bold text-[#111827] px-4 py-2.5 whitespace-nowrap">
                    {formatThousands(Number(budget?.[r.key]) || 0)} đ
                  </td>
                </tr>
              ))}
              <tr className="bg-[#F9FAFB]">
                <th scope="row" className="text-left font-extrabold text-[#111827] px-4 py-2.5">Tổng</th>
                <td className="text-right font-extrabold text-[#FF6B35] px-4 py-2.5 whitespace-nowrap">
                  {formatThousands(budgetTotal)} đ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[12px] text-[#6B7280] mt-2">
          Cộng chi phí từng điểm trong lịch trình: {formatThousands(placesCost)} đ.
        </p>
      </section>

      {/* Mẹo */}
      {tips.length > 0 && (
        <section className="mt-6" aria-labelledby="tips-heading">
          <h3 id="tips-heading" className="text-[17px] font-extrabold text-[#111827] mb-3">
            Mẹo từ người địa phương
          </h3>
          <ul className="flex flex-col gap-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-3 bg-white rounded-2xl border border-[#E5E7EB] p-3.5 text-[13px] text-[#374151]">
                <span className="material-symbols-outlined text-[20px] text-[#FF6B35] w-6 shrink-0" aria-hidden="true">
                  {tip.icon || "lightbulb"}
                </span>
                <span>{tip.content}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

interface TripNotFoundProps {
  onBack: () => void;
  title?: string;
  description?: string;
}

export const TripNotFound: React.FC<TripNotFoundProps> = ({
  onBack,
  title = "Không tìm thấy chuyến đi",
  description = "Chuyến đi này không có trên trình duyệt này. Có thể nó đã bị xóa, hoặc được lưu trên máy khác.",
}) => (
  <div className="min-h-[60vh] flex items-center justify-center px-[20px] pb-[120px] pt-10" data-testid="trip-not-found">
    <div className="bg-white rounded-3xl p-8 border border-dashed border-[#E5E7EB] text-center flex flex-col items-center gap-3 max-w-sm">
      <span className="material-symbols-outlined text-[40px] text-[#FF6B35]/50" aria-hidden="true">location_off</span>
      <h2 className="text-[17px] font-bold text-[#111827]">{title}</h2>
      <p className="text-[13px] text-[#6B7280]">{description}</p>
      <button
        onClick={onBack}
        className="mt-1 sleek-gradient-bg text-white font-bold text-[14px] px-5 py-2.5 rounded-xl hover:opacity-95"
      >
        Về danh sách chuyến đi
      </button>
    </div>
  </div>
);
