import React, { useRef, useState } from "react";
import * as tripStore from "../lib/tripStore";
import { clearChat } from "../hooks/useChat";
import { exportFileName } from "../lib/uiFormat";

interface SettingsViewProps {
  /** Gọi sau khi xóa toàn bộ dữ liệu để App bỏ bản nháp đang mở. */
  onDraftCleared?: () => void;
}

type Status = { kind: "ok" | "error"; text: string } | null;

const rowClass =
  "sleek-card rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#E5E7EB] flex items-center gap-4 hover:border-[#FF6B35] transition-all text-left group w-full focus-visible:outline-2 focus-visible:outline-[#FF6B35]";

export const SettingsView: React.FC<SettingsViewProps> = ({ onDraftCleared }) => {
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const json = tripStore.exportTrips();
      const count = tripStore.listTrips().length;
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({ kind: "ok", text: `Đã xuất ${count} chuyến đi ra file ${a.download}.` });
    } catch {
      setStatus({ kind: "error", text: "Không xuất được dữ liệu. Thử lại sau." });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { added, skipped } = tripStore.importTrips(await file.text());
      const skippedText = skipped ? `, bỏ qua ${skipped} chuyến (trùng hoặc không hợp lệ)` : "";
      setStatus({ kind: added ? "ok" : "error", text: `Đã thêm ${added} chuyến đi${skippedText}.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File không đọc được";
      setStatus({ kind: "error", text: `${msg}. Hãy chọn file .json đã xuất từ WanderAI.` });
    }
  };

  const handleClearAll = () => {
    const count = tripStore.listTrips().length;
    if (!confirm(`Xóa ${count} chuyến đi và toàn bộ lịch sử trò chuyện trên trình duyệt này? Không thể hoàn tác.`)) return;
    for (const t of tripStore.listTrips()) if (t.id) tripStore.deleteTrip(t.id);
    tripStore.writeCurrentTripId(null);
    clearChat();
    onDraftCleared?.();
    setStatus({ kind: "ok", text: "Đã xóa toàn bộ chuyến đi và lịch sử trò chuyện." });
  };

  return (
    <div className="flex flex-col min-h-screen pb-[120px] px-[20px] pt-4 max-w-2xl mx-auto w-full">
      <h2 className="text-[24px] font-extrabold text-[#1b1c1a] tracking-tight">Cài đặt</h2>

      <section className="mt-5" aria-labelledby="data-heading">
        <h3 id="data-heading" className="text-[15px] font-extrabold text-[#111827] mb-1">
          Dữ liệu của bạn
        </h3>
        <p className="text-[13px] text-[#6B7280] mb-3">
          Chuyến đi được lưu ngay trên trình duyệt này. Xuất ra file để sao lưu hoặc chuyển sang máy khác.
        </p>

        <div className="flex flex-col gap-3">
          <button onClick={handleExport} className={rowClass}>
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#FF6B35] shrink-0">
              <span className="material-symbols-outlined" aria-hidden="true">download</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-[#111827]">Xuất dữ liệu</span>
              <span className="block text-[13px] text-[#6B7280]">Tải mọi chuyến đi về dạng file JSON</span>
            </div>
          </button>

          <button onClick={() => fileRef.current?.click()} className={rowClass}>
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center text-[#FF6B35] shrink-0">
              <span className="material-symbols-outlined" aria-hidden="true">upload</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-[#111827]">Nhập dữ liệu</span>
              <span className="block text-[13px] text-[#6B7280]">Thêm chuyến đi từ file JSON đã xuất</span>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="import-input"
            onChange={handleImportFile}
          />

          <button
            onClick={handleClearAll}
            className={`${rowClass} hover:bg-[#FEF2F2] hover:border-[#EF4444]`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-[#EF4444] shrink-0">
              <span className="material-symbols-outlined" aria-hidden="true">delete_forever</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-[#B91C1C]">Xóa toàn bộ dữ liệu</span>
              <span className="block text-[13px] text-[#6B7280]">Xóa chuyến đi và lịch sử trò chuyện</span>
            </div>
          </button>
        </div>

        {status && (
          <p
            role="status"
            data-testid="settings-status"
            className={`mt-3 text-[13px] font-medium rounded-xl px-3 py-2 border ${
              status.kind === "ok"
                ? "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]"
                : "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]"
            }`}
          >
            {status.text}
          </p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="about-heading">
        <h3 id="about-heading" className="text-[15px] font-extrabold text-[#111827] mb-2">
          Giới thiệu
        </h3>
        <div className="sleek-card rounded-2xl p-4 border border-[#E5E7EB] text-[13px] leading-relaxed text-[#4B5563] space-y-2">
          <p>
            WanderAI giúp bạn lên lịch trình du lịch trong nước. Gợi ý lịch trình và địa điểm do Google Gemini tạo,
            nên hãy kiểm tra lại giờ mở cửa và giá trước khi đi.
          </p>
          <p>
            WanderAI không cần tài khoản: chuyến đi và cuộc trò chuyện được lưu trên trình duyệt của bạn. Nội dung
            bạn hỏi trợ lý được gửi tới Gemini để tạo câu trả lời.
          </p>
          <p>
            Bản đồ ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF6B35] font-semibold underline"
            >
              OpenStreetMap
            </a>{" "}
            contributors.
          </p>
        </div>
      </section>
    </div>
  );
};
