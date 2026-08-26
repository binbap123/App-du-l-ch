import React, { useState } from "react";

export const SettingsView: React.FC = () => {
  const [userName, setUserName] = useState("Nguyễn Trà My");
  const [userEmail, setUserEmail] = useState("my.nguyen@example.com");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    showToast("Đã cập nhật thông tin cá nhân thành công!");
  };

  return (
    <div className="flex flex-col min-h-screen pb-[120px] px-[20px] pt-4 max-w-2xl mx-auto w-full">
      {/* Profile Card Section */}
      <section className="sleek-card rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#FF6B35] shadow-sm">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9ay_RlhndkG5BtlQ1JYkLYD2UMuqfZPmLIQTtbkjkZ16ZyBgeJwgvc_H_-OCufCyLDpwhG3DNSHl-5I_P5Wa5feKvJmuHbEZFNw-QJgdKlQe5XQUuLRkCVbKRwuLo1k6iXrtM8Dz8Szor45RTkScOls4sSv-q1DBx_-TWf5MZnSiqMhIyr-3UciLHeiX8aN9X4r--EWp_Wn_uH12EG2y-5UG-6vDfH-pKk6m9Wk0OW3bpOa_GoJUS"
              alt="Người dùng"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="absolute bottom-0 right-0 w-8 h-8 sleek-gradient-bg text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>
        </div>

        {isEditingProfile ? (
          <div className="w-full space-y-3 text-left">
            <div>
              <label className="text-[12px] font-bold text-[#6B7280]">Họ và tên</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2.5 border border-[#E5E7EB] rounded-xl text-[14px] bg-white font-medium focus:border-[#FF6B35] outline-none"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-[#6B7280]">Email</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-2.5 border border-[#E5E7EB] rounded-xl text-[14px] bg-white font-medium focus:border-[#FF6B35] outline-none"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              className="w-full py-2.5 sleek-gradient-bg text-white rounded-xl font-bold text-[13px] mt-2 shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:opacity-95"
            >
              Lưu thay đổi
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-[20px] font-extrabold text-[#111827]">{userName}</h1>
            <p className="text-[14px] text-[#6B7280] font-medium">{userEmail}</p>
          </div>
        )}
      </section>

      {/* Settings Options List */}
      <section className="flex flex-col gap-3 mt-6">
        <button
          onClick={() => setIsEditingProfile(true)}
          className="sleek-card rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex items-center gap-4 hover:border-[#FF6B35] transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#FF6B35] group-hover:sleek-gradient-bg group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">person</span>
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#111827]">Hồ sơ cá nhân</h2>
            <p className="text-[13px] text-[#6B7280]">Quản lý thông tin cá nhân</p>
          </div>
          <span className="material-symbols-outlined text-[#9CA3AF] group-hover:text-[#FF6B35]">
            chevron_right
          </span>
        </button>

        <div className="sleek-card rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#FF6B35]">
            <span className="material-symbols-outlined">notifications_active</span>
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#111827]">Thông báo</h2>
            <p className="text-[13px] text-[#6B7280]">Tuỳ chỉnh thông báo chuyến đi</p>
          </div>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={() => {
              setNotificationsEnabled(!notificationsEnabled);
              showToast(
                !notificationsEnabled
                  ? "Đã bật thông báo chuyến đi"
                  : "Đã tắt thông báo chuyến đi"
              );
            }}
            className="w-5 h-5 accent-[#FF6B35] rounded cursor-pointer"
          />
        </div>

        <button
          onClick={() => showToast("Phương thức thanh toán đã được bảo mật")}
          className="sleek-card rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex items-center gap-4 hover:border-[#FF6B35] transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#FF6B35] group-hover:sleek-gradient-bg group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#111827]">Tài khoản đã lưu</h2>
            <p className="text-[13px] text-[#6B7280]">Quản lý phương thức thanh toán</p>
          </div>
          <span className="material-symbols-outlined text-[#9CA3AF] group-hover:text-[#FF6B35]">
            chevron_right
          </span>
        </button>

        <button
          onClick={() => showToast("Trung tâm hỗ trợ WanderAI 24/7 sẵn sàng lắng nghe")}
          className="sleek-card rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex items-center gap-4 hover:border-[#FF6B35] transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#FF6B35] group-hover:sleek-gradient-bg group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">help</span>
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#111827]">Trợ giúp & Phản hồi</h2>
            <p className="text-[13px] text-[#6B7280]">Câu hỏi thường gặp và hỗ trợ</p>
          </div>
          <span className="material-symbols-outlined text-[#9CA3AF] group-hover:text-[#FF6B35]">
            chevron_right
          </span>
        </button>

        <button
          onClick={() => showToast("Đã đăng xuất khỏi tài khoản WanderAI")}
          className="sleek-card rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex items-center gap-4 hover:bg-[#FEE2E2] hover:border-[#EF4444] transition-all text-left group mt-2"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-[#EF4444] group-hover:bg-[#EF4444] group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">logout</span>
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-[#EF4444]">Đăng xuất</h2>
          </div>
        </button>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-white text-[13px] font-bold px-4 py-2 rounded-full shadow-lg border border-white/20">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
