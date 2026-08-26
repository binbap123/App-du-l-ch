import React from "react";

interface HeaderProps {
  userLetter?: string;
  avatarUrl?: string;
  onNotificationClick?: () => void;
  showMapToggle?: boolean;
  isMapView?: boolean;
  onToggleMapMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userLetter = "U",
  avatarUrl,
  onNotificationClick,
}) => {
  return (
    <header className="flex justify-between items-center w-full px-[20px] py-[16px] bg-[#F0F2F5]/90 backdrop-blur-md sticky top-0 z-40 border-b border-[#E5E7EB]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl sleek-gradient-bg flex items-center justify-center text-white font-extrabold text-[18px] shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
          W
        </div>
        <div>
          <h1 className="text-[22px] leading-none tracking-[-0.02em] font-extrabold text-[#111827]">
            Wander<span className="text-[#FF6B35]">AI</span>
          </h1>
          <p className="text-[11px] font-medium text-[#6B7280] mt-0.5">Trợ lý du lịch thông minh</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onNotificationClick}
          aria-label="Thông báo"
          className="w-10 h-10 flex items-center justify-center text-[#4B5563] hover:text-[#FF6B35] bg-white border border-[#E5E7EB] hover:bg-[#FFF7ED] hover:border-[#FF9F43]/40 transition-colors rounded-full active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-[#E5E7EB] shadow-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-bold text-[13px] text-[#111827]">{userLetter}</span>
          )}
        </div>
      </div>
    </header>
  );
};
