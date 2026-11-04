import React, { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { PlaceSearchResult } from "../../data/placesData";
import { OSM_ATTRIBUTION, OSM_TILE_URL, escapeHtml } from "./leafletShared";
import { isValidLatLng } from "./mapUtils";

export interface PlacesMapProps {
  places: PlaceSearchResult[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

const CATEGORY_STYLE: Record<string, { color: string; icon: string }> = {
  food_specialty: { color: "#E8590C", icon: "restaurant" },
  cafe: { color: "#8D5524", icon: "local_cafe" },
  attraction: { color: "#1971C2", icon: "photo_camera" },
  shopping: { color: "#C2255C", icon: "shopping_bag" },
  nature: { color: "#2F9E44", icon: "park" },
};
const DEFAULT_STYLE = { color: "#0C8599", icon: "location_on" };

export function categoryStyle(category: string) {
  return CATEGORY_STYLE[category] || DEFAULT_STYLE;
}

function placeIcon(category: string, selected: boolean): L.DivIcon {
  const { color, icon } = categoryStyle(category);
  const size = selected ? 38 : 30;
  const ring = selected ? "0 0 0 4px rgba(255,107,53,.45)," : "";
  return L.divIcon({
    className: "wa-place-marker",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:${ring}0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;box-sizing:border-box"><span class="material-symbols-outlined" style="font-size:${selected ? 20 : 16}px">${escapeHtml(icon)}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [size / 2, 0],
  });
}

function MapSync({ points, selected }: { points: [number, number][]; selected?: [number, number] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  const selKey = selected?.join(",");
  useEffect(() => {
    if (!selected) return;
    map.flyTo(selected, Math.max(map.getZoom(), 14), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, map]);
  return null;
}

export const PlacesMap: React.FC<PlacesMapProps> = ({ places, selectedId, onSelect, className }) => {
  const located = useMemo(() => places.filter((p) => isValidLatLng(p.lat, p.lng)), [places]);
  const points = useMemo(() => located.map((p) => [p.lat as number, p.lng as number] as [number, number]), [located]);
  const sel = located.find((p) => p.id === selectedId);

  return (
    <div className={`relative isolate w-full h-full ${className || ""}`}>
      <MapContainer center={[16.0, 107.5]} zoom={5} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
        <MapSync points={points} selected={sel ? [sel.lat as number, sel.lng as number] : undefined} />
        {located.map((p) => {
          const selected = p.id === selectedId;
          return (
            <Marker
              key={p.id}
              position={[p.lat as number, p.lng as number]}
              icon={placeIcon(p.category, selected)}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{ click: () => onSelect?.(p.id) }}
              title={p.name}
            >
              <Tooltip direction="top" offset={[0, -14]}>
                {p.name}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default PlacesMap;
