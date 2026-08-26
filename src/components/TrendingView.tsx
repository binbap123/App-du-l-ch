import React, { useState, useEffect } from "react";
import { TrendingSpot } from "../types";

interface TrendingViewProps {
  onOpenAIPlan: (destName: string) => void;
}

const PLATFORM_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  tiktok: { color: "#000000", bg: "#F0F0F0", icon: "videocam", label: "TikTok" },
  threads: { color: "#FFFFFF", bg: "#000000", icon: "tag", label: "Threads" },
  instagram: { color: "#FFFFFF", bg: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)", icon: "photo_camera", label: "Instagram" },
  facebook: { color: "#FFFFFF", bg: "#1877F2", icon: "thumb_up", label: "Facebook" },
};

const CATEGORY_ICON: Record<string, string> = {
  food: "restaurant",
  attraction: "photo_camera",
  cafe: "local_cafe",
  nature: "landscape",
};

const CATEGORY_LABEL: Record<string, string> = {
  food: "Ẩm thực",
  attraction: "Điểm tham quan",
  cafe: "Cafe & Bar",
  nature: "Thiên nhiên",
};

export const TrendingView: React.FC<TrendingViewProps> = ({ onOpenAIPlan }) => {
  const [spots, setSpots] = useState<TrendingSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  const fetchTrending = async () => {
    try {
      const res = await fetch("/api/trending-spots");
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setSpots(result.data);
        if (result.data[0]?.savedAt) {
          setLastUpdated(new Date(result.data[0].savedAt).toLocaleDateString("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
          }));
        }
      }
    } catch (err) {
      console.error("Lỗi tải trending:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/trending-spots/refresh", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setSpots(result.data);
        setLastUpdated(new Date().toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        }));
      }
    } catch (err) {
      console.error("Lỗi refresh trending:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchTrending(); }, []);

  const filtered = selectedPlatform === "all"
    ? spots
    : spots.filter((s) => s.platform === selectedPlatform);

  const platforms = ["all", ...Array.from(new Set(spots.map((s) => s.platform)))];

  return (
    <div className="flex flex-col min-h-screen pb-[100px]">
      {/* Hero Header */}
      <div className="px-[20px] pt-5 pb-4 bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#111827] relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#FF6B35]/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#E2A854]/20 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B35] animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF6B35]">
              Live Trending
            </span>
          </div>
          <h1 className="text-[24px] font-extrabold text-white leading-tight">
            🔥 Đang bùng nổ trên MXH
          </h1>
          <p className="text-[13px] text-white/60 mt-1">
            AI tổng hợp địa điểm hot nhất từ TikTok, Threads, Instagram
          </p>

          {/* Refresh button */}
          <div className="mt-3 flex items-center justify-between">
            {lastUpdated && (
              <span className="text-[11px] text-white/40">
                Cập nhật: {lastUpdated}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-[#FF6B35] text-white px-4 py-2 rounded-full text-[12px] font-bold shadow-[0_4px_12px_rgba(255,107,53,0.4)] hover:bg-[#E05320] transition-all disabled:opacity-60 ml-auto"
            >
              <span className={`material-symbols-outlined text-[15px] ${isRefreshing ? "animate-spin" : ""}`}>
                {isRefreshing ? "autorenew" : "auto_awesome"}
              </span>
              {isRefreshing ? "AI đang cập nhật..." : "AI Làm mới ngay"}
            </button>
          </div>
        </div>
      </div>

      {/* Platform Filter Pills */}
      <div className="sticky top-[72px] z-30 bg-[#F0F2F5]/95 backdrop-blur-md px-[20px] py-2.5 flex gap-2 overflow-x-auto hide-scrollbar border-b border-[#E5E7EB]">
        {platforms.map((p) => {
          const cfg = p === "all" ? null : PLATFORM_CONFIG[p as string];
          const isActive = selectedPlatform === p;
          return (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-bold border transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#111827] text-white border-[#111827] shadow-sm"
                  : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB]"
              }`}
            >
              {cfg && (
                <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
              )}
              {p === "all" ? "Tất cả" : (PLATFORM_CONFIG[p as string]?.label || p)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <main className="px-[20px] pt-4 flex flex-col gap-4">
        {isLoading ? (
          /* Skeleton */
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 flex gap-4 border border-[#E5E7EB] animate-pulse">
              <div className="w-24 h-24 rounded-xl bg-[#F3F4F6] flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <div className="h-4 bg-[#F3F4F6] rounded w-3/4" />
                <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
                <div className="h-3 bg-[#F3F4F6] rounded w-full" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            <span className="material-symbols-outlined text-[48px]">trending_up</span>
            <p className="mt-2 font-medium">Chưa có dữ liệu trending</p>
          </div>
        ) : (
          filtered.map((spot, idx) => {
            const cfg = PLATFORM_CONFIG[spot.platform] || PLATFORM_CONFIG.tiktok;
            const catIcon = CATEGORY_ICON[spot.category] || "place";
            const catLabel = CATEGORY_LABEL[spot.category] || spot.category;
            return (
              <article
                key={spot.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-[#FF6B35] hover:shadow-[0_6px_20px_rgba(255,107,53,0.1)] transition-all group"
              >
                <div className="flex gap-0">
                  {/* Left: Rank + Image */}
                  <div className="relative w-28 flex-shrink-0">
                    {spot.imageUrl ? (
                      <img
                        src={spot.imageUrl}
                        alt={spot.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 min-h-[100px]"
                      />
                    ) : (
                      <div className="w-full min-h-[100px] bg-gradient-to-br from-[#FF6B35]/20 to-[#E2A854]/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[36px] text-[#FF6B35]/50">{catIcon}</span>
                      </div>
                    )}
                    {/* Rank badge */}
                    <div className="absolute top-2 left-2 bg-[#111827]/80 text-white text-[10px] font-extrabold w-6 h-6 rounded-full flex items-center justify-center shadow">
                      #{idx + 1}
                    </div>
                    {/* Platform badge */}
                    <div
                      className="absolute bottom-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow"
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                      }}
                    >
                      <span className="material-symbols-outlined text-[10px]">{cfg.icon}</span>
                      {cfg.label}
                    </div>
                  </div>

                  {/* Right: Info */}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="material-symbols-outlined text-[13px] text-[#FF6B35]">{catIcon}</span>
                        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{catLabel}</span>
                      </div>
                      <h3 className="text-[15px] font-extrabold text-[#111827] leading-tight line-clamp-1">
                        {spot.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[12px] text-[#FF6B35]">location_on</span>
                        <span className="text-[12px] text-[#6B7280]">{spot.city}</span>
                      </div>
                      <p className="text-[12px] text-[#4B5563] mt-1 line-clamp-2 leading-snug">
                        {spot.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="flex items-center gap-1 bg-[#FFF7ED] text-[#FF6B35] text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-[#FFEDD5]">
                        <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
                        {spot.badge_label}
                      </span>
                      <button
                        onClick={() => onOpenAIPlan(spot.city || spot.name)}
                        className="flex items-center gap-1 text-[#FF6B35] font-bold text-[11px] hover:underline"
                      >
                        <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                        Tạo lịch trình
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </main>
    </div>
  );
};
