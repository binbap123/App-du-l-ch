import React from "react";
import { Link } from "react-router-dom";

export const Header: React.FC = () => {
  return (
    <header className="flex items-center w-full px-[20px] py-[16px] bg-[#F0F2F5]/90 backdrop-blur-md sticky top-0 z-40 border-b border-[#E5E7EB]">
      <Link to="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-[#FF6B35]">
        <div className="w-10 h-10 rounded-xl sleek-gradient-bg flex items-center justify-center text-white font-extrabold text-[18px] shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
          W
        </div>
        <div>
          <h1 className="text-[22px] leading-none tracking-[-0.02em] font-extrabold text-[#111827]">
            Wander<span className="text-[#FF6B35]">AI</span>
          </h1>
          <p className="text-[11px] font-medium text-[#6B7280] mt-0.5">Lên lịch trình du lịch Việt Nam</p>
        </div>
      </Link>
    </header>
  );
};
