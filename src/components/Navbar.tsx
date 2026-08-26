import React from "react";
import { TabType } from "../types";

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "explore", label: "Khám phá", icon: "explore" },
    { id: "trending", label: "Trending 🔥", icon: "local_fire_department" },
    { id: "ai_assistant", label: "AI Trợ lý", icon: "smart_toy" },
    { id: "itinerary", label: "Lịch trình", icon: "event_note" },
    { id: "settings", label: "Cài đặt", icon: "settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-safe h-[76px] bg-white rounded-t-2xl border-t border-[#E5E7EB] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      {tabs.map((tab) => {
        const isActive =
          activeTab === tab.id || (activeTab === "map" && tab.id === "explore") || (activeTab === "builder" && tab.id === "itinerary");

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-[#FFF7ED] text-[#FF6B35] rounded-xl px-4 py-1.5 shadow-sm border border-[#FFEDD5]"
                : "text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F9FAFB] rounded-xl p-2"
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className={`text-[12px] leading-[16px] font-semibold mt-0.5 whitespace-nowrap ${isActive ? "text-[#FF6B35]" : "text-[#6B7280]"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
