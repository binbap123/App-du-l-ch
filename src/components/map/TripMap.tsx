import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ScheduleItem, WanderItineraryData } from "../../types";
import { useGeocode, geocodeKey, type GeocodeRequest } from "../../hooks/useGeocode";
import {
  dayColor,
  formatVnd,
  googleMapsSearchUrl,
  placeTextQuery,
  resolveLocalCoords,
  type GeoPoint,
} from "./mapUtils";
import { OSM_ATTRIBUTION, OSM_TILE_URL, escapeHtml } from "./leafletShared";

export interface TripMapProps {
  trip: WanderItineraryData;
  activeDay?: number | "all";
  height?: number | string;
  onSelectItem?: (dayIdx: number, itemId: string) => void;
}

interface PlottedPoint {
  dayIdx: number;
  order: number;
  item: ScheduleItem;
  pos: GeoPoint;
}

const VIETNAM_CENTER: [number, number] = [16.0, 107.5];

function numberIcon(n: number, color: string, estimate: boolean): L.DivIcon {
  const border = estimate ? "2px dashed #1b1c1a" : "2px solid #ffffff";
  const opacity = estimate ? 0.85 : 1;
  return L.divIcon({
    className: "wa-num-marker",
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:${color};opacity:${opacity};border:${border};box-shadow:0 1px 4px rgba(0,0,0,.35);color:#fff;font:800 12px/22px system-ui,sans-serif;text-align:center;box-sizing:border-box">${escapeHtml(String(n))}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
    tooltipAnchor: [14, 0],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export const TripMap: React.FC<TripMapProps> = ({ trip, activeDay = "all", height = 260, onSelectItem }) => {
  const [day, setDay] = useState<number | "all">(activeDay);
  useEffect(() => setDay(activeDay), [activeDay]);

  const destination = trip.meta?.destination || "";
  const days = trip.itinerary || [];

  // 1) toạ độ sẵn có (item → placesData); 2) phần còn lại đem geocode
  const local = useMemo(
    () => days.map((d) => (d.schedule || []).map((it) => resolveLocalCoords(it, destination))),
    [days, destination]
  );
  const geoRequests = useMemo<GeocodeRequest[]>(() => {
    const reqs: GeocodeRequest[] = [];
    days.forEach((d, di) =>
      (d.schedule || []).forEach((it, ii) => {
        if (!local[di]?.[ii] && it.place_name?.trim().length >= 2) reqs.push({ q: it.place_name.trim(), city: destination || undefined });
      })
    );
    return reqs;
  }, [days, local, destination]);
  const { results, pending } = useGeocode(geoRequests);

  const { plotted, unresolved, waiting } = useMemo(() => {
    const plotted: PlottedPoint[] = [];
    let unresolved = 0;
    let waiting = 0;
    days.forEach((d, di) => {
      if (day !== "all" && day !== di) return;
      (d.schedule || []).forEach((item, ii) => {
        let pos = local[di]?.[ii];
        if (!pos) {
          const k = geocodeKey(item.place_name?.trim() || "", destination || undefined);
          if (k in results) {
            pos = results[k] || undefined;
            if (!pos) unresolved++;
          } else if (pending) waiting++;
          else unresolved++;
        }
        if (pos) plotted.push({ dayIdx: di, order: ii + 1, item, pos });
      });
    });
    return { plotted, unresolved, waiting };
  }, [days, day, local, results, pending, destination]);

  const lines = useMemo(() => {
    const byDay = new Map<number, [number, number][]>();
    for (const p of plotted) {
      const arr = byDay.get(p.dayIdx) || [];
      arr.push([p.pos.lat, p.pos.lng]);
      byDay.set(p.dayIdx, arr);
    }
    return [...byDay.entries()].filter(([, pts]) => pts.length > 1);
  }, [plotted]);

  const allPoints = useMemo(() => plotted.map((p) => [p.pos.lat, p.pos.lng] as [number, number]), [plotted]);
  const dayIdxWithItems = days.map((d, i) => ((d.schedule?.length ?? 0) > 0 ? i : -1)).filter((i) => i >= 0);
  const h = typeof height === "number" ? `${height}px` : height;

  const legend = dayIdxWithItems.length > 1 && (
    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1" role="tablist" aria-label="Chọn ngày trên bản đồ">
      {(["all", ...dayIdxWithItems] as const).map((d) => {
        const active = day === d;
        const color = d === "all" ? "#111827" : dayColor(d);
        return (
          <button
            key={String(d)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setDay(d)}
            className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
              active ? "text-white" : "bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F9FAFB]"
            }`}
            style={active ? { background: color, borderColor: color } : undefined}
          >
            {d !== "all" && (
              <span className="w-2.5 h-2.5 rounded-full border border-white/70" style={{ background: dayColor(d) }} />
            )}
            {d === "all" ? "Tất cả" : `Ngày ${days[d]?.day_number || d + 1}`}
          </button>
        );
      })}
    </div>
  );

  const status =
    waiting > 0 ? (
      <p className="text-[11px] text-[#6B7280]">Đang xác định vị trí {waiting} điểm…</p>
    ) : unresolved > 0 ? (
      <p className="text-[11px] text-[#6B7280]">{unresolved} điểm chưa xác định được vị trí</p>
    ) : null;

  if (!plotted.length) {
    return (
      <div className="flex flex-col gap-2">
        {legend}
        <div
          className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] flex flex-col items-center justify-center text-center gap-1 px-4"
          style={{ height: h }}
        >
          <span className="material-symbols-outlined text-[32px] text-[#FF6B35]/50">
            {waiting > 0 ? "travel_explore" : "location_off"}
          </span>
          <p className="text-[13px] font-bold text-[#374151]">
            {waiting > 0 ? "Đang tìm vị trí các địa điểm…" : "Chưa có địa điểm nào hiển thị được trên bản đồ"}
          </p>
          {waiting === 0 && (
            <p className="text-[11px] text-[#6B7280]">Bạn vẫn có thể mở chỉ đường bằng Google Maps.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {legend}
      <div className="relative isolate rounded-xl overflow-hidden border border-[#E5E7EB]" style={{ height: h }}>
        <MapContainer center={VIETNAM_CENTER} zoom={6} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
          <FitBounds points={allPoints} />
          {lines.map(([di, pts]) => (
            <Polyline key={`line-${di}`} positions={pts} pathOptions={{ color: dayColor(di), weight: 4, opacity: 0.8 }} />
          ))}
          {plotted.map((p) => {
            const estimate = p.pos.geo_source === "ai_estimate";
            const color = dayColor(p.dayIdx);
            const query = placeTextQuery(p.item, destination);
            return (
              <Marker
                key={`${p.dayIdx}-${p.item.id}-${p.order}`}
                position={[p.pos.lat, p.pos.lng]}
                icon={numberIcon(p.order, color, estimate)}
                eventHandlers={{ click: () => onSelectItem?.(p.dayIdx, p.item.id) }}
              >
                {estimate && <Tooltip direction="right">Vị trí ước lượng</Tooltip>}
                <Popup>
                  <div style={{ minWidth: 170 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color }}>
                      Ngày {days[p.dayIdx]?.day_number || p.dayIdx + 1} · Điểm {p.order}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, margin: "2px 0" }}>{p.item.place_name}</div>
                    {p.item.time_slot && <div style={{ fontSize: 12 }}>🕒 {p.item.time_slot}</div>}
                    <div style={{ fontSize: 12 }}>💸 {formatVnd(p.item.cost_vnd)}</div>
                    {estimate && <div style={{ fontSize: 11, color: "#6B7280" }}>Vị trí ước lượng (AI)</div>}
                    {p.pos.geo_source === "geocoded" && (
                      <div style={{ fontSize: 11, color: "#6B7280" }}>Vị trí từ OpenStreetMap</div>
                    )}
                    <a
                      href={googleMapsSearchUrl(query)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-block", marginTop: 6, fontWeight: 700, color: "#FF6B35" }}
                    >
                      Mở Google Maps ↗
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      {status}
    </div>
  );
};

export default TripMap;
