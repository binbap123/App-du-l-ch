import React from "react";
import { TabType } from "../types";

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "explore", label: "Khám phá", icon: "explore" },
  { id: "trending", label: "Xu hướng", icon: "local_fire_department" },
  { id: "ai_assistant", label: "Trợ lý AI", icon: "smart_toy" },
  { id: "itinerary", label: "Lịch trình", icon: "event_note" },
  { id: "settings", label: "Cài đặt", icon: "settings" },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 w-full z-50 flex items-stretch gap-1 px-2 pb-safe h-[76px] bg-white rounded-t-2xl border-t border-[#E5E7EB] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
    >
      {TABS.map((tab) => {
        const isActive =
          activeTab === tab.id ||
          (activeTab === "map" && tab.id === "explore") ||
          (activeTab === "builder" && tab.id === "itinerary");

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className="flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#FF6B35] rounded-xl"
          >
            <span
              className={`material-symbols-outlined text-[22px] rounded-full px-3 transition-colors ${
                isActive ? "bg-[#FFF7ED] text-[#FF6B35]" : "text-[#9CA3AF] group-hover:text-[#111827]"
              }`}
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              aria-hidden="true"
            >
              {tab.icon}
            </span>
            <span
              className={`text-[11px] leading-[14px] font-semibold mt-0.5 max-w-full truncate ${
                isActive ? "text-[#FF6B35]" : "text-[#6B7280]"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
