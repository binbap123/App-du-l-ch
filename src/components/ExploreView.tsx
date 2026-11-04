import React, { useState } from "react";
import { MOCK_MAP_PLACES } from "../data/mockData";
import { PlaceMarker } from "../types";

interface ExploreViewProps {
  onSelectDestination: (destName: string) => void;
  onOpenAIPlan: (destName: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onSelectDestination,
  onOpenAIPlan,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeMapPlace, setActiveMapPlace] = useState<PlaceMarker>(MOCK_MAP_PLACES[0]);

  const recommendedCards = [
    {
      id: "halong",
      title: "Vịnh Hạ Long",
      location: "Quảng Ninh, Việt Nam",
      tag: "Thiên nhiên",
      rating: 4.9,
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwFXQQyp_cy_d1SrK3rB4umhsqdOgKAjlUJCSgSUHm3VA9reVPoujuwBZ1XfY0bfmWzxh7vXmj9ZIUjcXYEWIeGCRMNgyoy3qUvNi4FT7-hsTRP8WXPfLVlSYJRppWGfag09cp6uf4emZZPduJN6iNc66AHmKb-bkWEIfrYJ4v_m-DpqGzJtsJ07EUPyZxDal27J5dUJuGZb3UD9_RhF5v2MvSlrXDRI3BpUK01f8WTCDEzBd4sD-",
    },
    {
      id: "hue",
      title: "Cố đô Huế",
      location: "Thừa Thiên Huế",
      tag: "Lịch sử",
      rating: 4.8,
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBamVqi82kE91WpwMhDWCKxiFFwKETksdgL7bKhJ2XKj28pGydUB5ccPL-rGDm3DMkbPLYUqGk_LjhV3UJxDghEwwbIsRtqUgyfxYaxf3FymP77oRXFUbyrjH1rGE3-rx8MuMy3m_J-22Ni_QkZ6ToEkcr6EudNLqAH_6KTGOfAXeUwgtCqnO9p_SWjZhdU3FMztLhK8kJYh5XEochW3kOplcjKV377oJvaGAeycn2h9o5XXCVEpKRf",
    },
    {
      id: "dalat",
      title: "Đà Lạt Mộng Mơ",
      location: "Lâm Đồng, Việt Nam",
      tag: "Nghỉ dưỡng",
      rating: 4.9,
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHWz4XfHJFN1sFi6DHrr9WoRDrImQhB990WTXerEss2qvN9KuLoS16GZmr14q5Tel0UFmrwwdNZEQ7qGUgvtz0iqch4AtndiD4uAPMQjkTT2FJxrXkUF0cgltMFxFdQiR1rn207BmpL6s9gRE7yNkytSls3t_bHTRFDWReAYu51Y24PLDuMcFy_E7vHoLKCguI2lbsNObWIo9QTrP1MJsZ8EaXAed1Sc9E0BVY1lqtUZziHbmWrN7J",
    }
  ];

  const popularCards = [
    {
      id: "danang",
      title: "Đà Nẵng",
      tag: "Thành phố",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3oNZCmp4-JPmESKgPuBuLcmKSjTMI8VbryYHZix_WsSuYBmRo9tYfwQGpAaOR2gnrd893pVcVnvTeoL1oocW2g4jv9p5E_ieqyJY4hUf7T7TEdf4OwxEMTDY6HOImRmzCbzYa0-gAki5vcKsIJaP8vE5fA2vvj-n_9Ezt55RAKmZUv0vK4P8oeMK49wEkILsvfb_GNjKg8OeRHJKVuWmF1whKRyMv4YarKDAG317h-tVNrcPLmXui"
    },
    {
      id: "sapa",
      title: "Sapa",
      tag: "Núi đồi",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBv7gJQBQbB-0FKigGPYKinf7MUHMR-Zy3GJO4JG2Tw7k8xhzHGdbvS0622L2ci4Nr5go8bZYrLeXyb7YoYMuYeoZ58nJ6Ky2craeocNzKsxk6C6LzsRujPwjNpErOhjw3wTCtPb5OzDYbA2yj0_WB_AAMB1ItYmn83CxJq04zNokD5AWZEDZx2zyZzWBxQMSL4P9yc2D69BTRkzc05DQYCUOAQkG-x8wfsW0QeqTqVUYZoW-tyWNQh"
    },
    {
      id: "hoian",
      title: "Hội An",
      tag: "Phố cổ",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhVcPCWTtQeFF_dVK1usyPbZsOvPTp8_JOrchAvrWF39mD5hCChgph1LO2T5cBv3_OlJUctlTNuNjFrVrEWEr4zkwqCVsMNhweJ0EIqnljIAux32NjXXOhIrCL6m9WDY_3HzZ4ipc4nf7vTRtXWlKJSJQVqqMdFGj9kM9BeiPQgUM6PuJ5k7SutOZ-oz9b-ACQGRgD19xtQfVPpFcfb43bjs-q3QbI6V8edMmOpNtJC-cwqPghOSvX"
    },
    {
      id: "phuquoc",
      title: "Phú Quốc",
      tag: "Đảo ngọc",
      imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBukuWpWVaV-Fg_ejRu0VIwoSIlJertplNFpWal1mQsPHYQRv6CCfuEtlncY0K80V5k4hH0L_lo69WvOsZ8kgKpoi_LjNtIPL95zdXrRZz5b46y7y85eNq8I_ctC4hyeKrqjXc8mqZIZ0JEE5UR2WWNLZW_q2SzispGVPWWcaMHjzNA0k9HSQ0K6kPa9pqEAPW4UcAdeDBIaBpLXIkHCC2D3Z8sMiKhtxJTA_o6PXu-5SE89bZdRaeV"
    }
  ];

  const filteredMapPlaces = MOCK_MAP_PLACES.filter((p) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "food" && p.category === "food") return true;
    if (selectedCategory === "tiktok" && p.isHotTikTok) return true;
    if (selectedCategory === "attraction" && p.category === "attraction") return true;
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen pb-[100px]">
      {/* Top Controller Bar: View Switcher & Search */}
      <div className="px-[20px] py-2.5 sticky top-[72px] z-30 bg-[#F0F2F5]/90 backdrop-blur-md border-b border-[#E5E7EB] flex flex-col gap-2.5">
        {/* Toggle Mode Pills */}
        <div className="flex items-center justify-between bg-[#E5E7EB] p-1 rounded-xl">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "list"
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">view_agenda</span>
            Danh sách
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === "map"
                ? "bg-[#111827] text-white shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            Bản đồ vệ tinh & Địa điểm
          </button>
        </div>

        {/* Search Field */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[#9CA3AF] text-[20px]">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Bạn muốn đi đâu? (Ví dụ: Đà Nẵng, Phú Quốc, Hà Nội)"
            className="w-full pl-11 pr-10 py-2.5 bg-white border border-[#E5E7EB] rounded-xl focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-colors shadow-sm text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button className="p-1.5 rounded-full hover:bg-[#F3F4F6] text-[#6B7280]">
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <main className="mt-4 flex flex-col gap-[28px]">
          {/* Đề xuất cho bạn (Recommended) */}
          <section>
            <div className="px-[20px] mb-3 flex justify-between items-end">
              <h2 className="text-[18px] font-extrabold text-[#111827]">
                Đề xuất cho bạn
              </h2>
              <button className="text-[12px] font-bold text-[#FF6B35] hover:underline">
                Xem tất cả
              </button>
            </div>

            {/* Horizontal Scroll */}
            <div className="flex overflow-x-auto gap-4 px-[20px] pb-2 hide-scrollbar snap-x snap-mandatory">
              {recommendedCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => onOpenAIPlan(card.title)}
                  className="min-w-[260px] bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden snap-start flex flex-col group cursor-pointer border border-[#E5E7EB] hover:border-[#FF6B35] hover:shadow-[0_8px_24px_rgba(255,107,53,0.12)] transition-all"
                >
                  <div className="h-[160px] relative overflow-hidden">
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <h3 className="text-[17px] font-bold text-[#111827]">
                      {card.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[#6B7280] text-[13px]">
                      <span
                        className="material-symbols-outlined text-[#FF6B35] text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        location_on
                      </span>
                      <span>{card.location}</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#FFF7ED] text-[#FF6B35] py-1 px-2.5 rounded-md border border-[#FFEDD5]">
                        {card.tag}
                      </span>
                      <div className="flex items-center gap-1 text-[#FF9F43]">
                        <span
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        <span className="text-[12px] font-bold text-[#111827]">
                          {card.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Điểm đến phổ biến (Popular Grid) */}
          <section className="px-[20px]">
            <h2 className="text-[18px] font-extrabold text-[#111827] mb-3">
              Điểm đến phổ biến
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {popularCards.map((pop) => (
                <div
                  key={pop.id}
                  onClick={() => onOpenAIPlan(pop.title)}
                  className="bg-white rounded-2xl p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] cursor-pointer group border border-[#E5E7EB] hover:border-[#FF6B35] hover:shadow-[0_8px_24px_rgba(255,107,53,0.1)] transition-all"
                >
                  <div className="h-[120px] rounded-xl overflow-hidden mb-2 relative">
                    <img
                      src={pop.imageUrl}
                      alt={pop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                  </div>
                  <div className="px-1 pb-1">
                    <h4 className="text-[14px] font-bold text-[#111827] truncate">
                      {pop.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[#6B7280] mt-0.5">
                      <span className="material-symbols-outlined text-[#FF6B35] text-[14px]">
                        map
                      </span>
                      <span className="text-[12px] font-medium">{pop.tag}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      ) : (
        /* Map View Mode */
        <div className="relative h-[calc(100vh-210px)] w-full overflow-hidden flex flex-col font-sans">
          {/* Google Maps Embed */}
          <div className="absolute inset-0 z-0">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              // TODO(agent-map): thay iframe + MOCK_MAP_PLACES bằng <TripMap> (Leaflet + OSM). Embed tạm không cần API key.
              src={`https://maps.google.com/maps?q=${encodeURIComponent(activeMapPlace.name + ", Việt Nam")}&z=14&output=embed`}
            />
          </div>

          {/* Top Filter Bar on Map */}
          <div className="relative z-20 pt-3 px-4 flex flex-col gap-2 w-full max-w-md mx-auto pointer-events-none">
            {/* Status Card */}
            <div className="pointer-events-auto self-start glass-panel rounded-full px-3.5 py-1.5 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse"></span>
              <span className="text-[11px] font-extrabold text-[#111827] uppercase tracking-wider">
                QUANH BẠN: 40 ĐỊA ĐIỂM TRONG 5 KM
              </span>
              <button className="ml-1 text-[#FF6B35] hover:text-[#E05320]">
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="pointer-events-auto flex gap-2 overflow-x-auto hide-scrollbar pb-1 pt-1 -mx-4 px-4">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex-shrink-0 text-[12px] font-bold px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  selectedCategory === "all"
                    ? "bg-[#111827] text-white border-[#111827] shadow-sm"
                    : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB]"
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSelectedCategory("food")}
                className={`flex-shrink-0 text-[12px] font-bold px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === "food"
                    ? "bg-[#FF6B35] text-white border-[#FF6B35] shadow-sm"
                    : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">restaurant</span> Ẩm thực
              </button>
              <button
                onClick={() => setSelectedCategory("tiktok")}
                className={`flex-shrink-0 text-[12px] font-bold px-4 py-1.5 rounded-full border transition-colors whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === "tiktok"
                    ? "bg-[#000000] text-white border-[#000000] shadow-sm"
                    : "bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB]"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">videocam</span> Check-in TikTok
              </button>
            </div>
          </div>

          {/* Bottom Card Carousel on Map */}
          <div className="absolute bottom-4 left-0 w-full z-30 px-4">
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
              {filteredMapPlaces.map((place) => {
                const isSelected = place.id === activeMapPlace.id;
                return (
                  <div
                    key={place.id}
                    onClick={() => setActiveMapPlace(place)}
                    className={`snap-center shrink-0 w-[280px] bg-white rounded-2xl shadow-lg border overflow-hidden flex flex-col cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#FF6B35] ring-2 ring-[#FF6B35]/40 scale-[1.02]"
                        : "border-[#E5E7EB] opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div className="flex p-3 gap-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative bg-[#F3F4F6]">
                        <img
                          src={place.imageUrl}
                          alt={place.name}
                          className="w-full h-full object-cover"
                        />
                        {place.isHotTikTok && (
                          <div className="absolute top-1 left-1 bg-black text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 shadow-sm">
                            <span
                              className="material-symbols-outlined text-[10px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              local_fire_department
                            </span>
                            {place.hotBadge || "HOT TikTok"}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between py-0.5 flex-1">
                        <div>
                          <h3 className="text-[14px] font-bold text-[#111827] line-clamp-2 leading-tight">
                            {place.name}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 bg-[#F9FAFB] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                            <span className="material-symbols-outlined text-[13px] text-[#FF6B35]">
                              location_on
                            </span>
                            <span className="text-[11px] text-[#4B5563] font-medium">
                              {place.distance}
                            </span>
                          </div>
                          {place.rating ? (
                            <div className="flex items-center gap-1 text-[#FF9F43]">
                              <span
                                className="material-symbols-outlined text-[13px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                              <span className="text-[11px] font-bold text-[#111827]">
                                {place.rating}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[#6B7280]">
                              <span className="material-symbols-outlined text-[13px]">
                                visibility
                              </span>
                              <span className="text-[11px] font-medium">
                                {place.views}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAIPlan(place.name);
                      }}
                      className="w-full py-2 bg-[#FFF7ED] hover:bg-[#FF6B35] hover:text-white text-[12px] font-bold text-[#FF6B35] border-t border-[#FFEDD5] transition-colors flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      Tạo lịch trình AI cho địa điểm này
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
