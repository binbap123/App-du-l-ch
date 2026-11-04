import React, { useState, useRef, useEffect } from "react";
import { WanderItineraryData } from "../types";
import { useChat } from "../hooks/useChat";

/** Hiển thị **đậm** đơn giản trong câu trả lời AI (không dùng innerHTML). */
function renderInlineBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

interface AIAssistantViewProps {
  onLoadItineraryToBuilder: (data: WanderItineraryData) => void;
  prefillDestination?: string;
  onClearPrefill?: () => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  onLoadItineraryToBuilder,
  prefillDestination,
  onClearPrefill,
}) => {
  // Chat lưu trong store + localStorage (src/hooks/useChat.ts) → chuyển tab vẫn còn.
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const handledPrefillRef = useRef<string | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (prefillDestination && prefillDestination !== handledPrefillRef.current) {
      handledPrefillRef.current = prefillDestination;
      const prompt = `Lên kế hoạch đi ${prefillDestination} 3N2Đ săn đặc sản và check-in TikTok`;
      handleSendMessage(prompt);
      onClearPrefill?.();
    }
  }, [prefillDestination, onClearPrefill]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;
    if (!textToSend) setInputText("");
    void sendMessage(query);
  };

  const hasConversation = messages.some((m) => m.sender === "user");

  return (
    <div className="flex flex-col h-[calc(100vh-76px)] overflow-hidden pb-[96px]">
      {/* Scrollable Chat Area */}
      <main className="flex-1 overflow-y-auto px-[20px] pt-3 flex flex-col gap-4">
        {/* Welcome Header */}
        <div className="flex flex-col items-center justify-center pt-4 pb-2 text-center">
          <div className="w-16 h-16 rounded-2xl sleek-gradient-bg flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(255,107,53,0.3)] text-white">
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
          </div>
          <h2 className="text-[24px] leading-[32px] font-extrabold mb-1.5 sleek-gradient-text">
            Xin chào! Tôi là WanderAI.
          </h2>
          <p className="text-[14px] leading-[20px] text-[#6B7280] max-w-[300px]">
            Hôm nay bạn muốn bắt đầu hành trình nào? Hãy để tôi giúp bạn lên kế hoạch hoàn hảo.
          </p>
          {hasConversation && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Bắt đầu cuộc trò chuyện mới? Tin nhắn hiện tại sẽ bị xoá.")) clearChat();
              }}
              className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-[#6B7280] hover:text-[#FF6B35] bg-white border border-[#E5E7EB] rounded-full px-3 py-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add_comment</span>
              Cuộc trò chuyện mới
            </button>
          )}
        </div>

        {/* Chat History Messages */}
        <div className="flex flex-col gap-3 mt-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[92%] ${
                msg.sender === "user" ? "self-end flex-row-reverse" : "self-start"
              }`}
            >
              {msg.sender === "ai" && (
                <div className="w-8 h-8 rounded-xl sleek-gradient-bg text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    smart_toy
                  </span>
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl shadow-sm text-[14px] leading-[20px] ${
                  msg.sender === "user"
                    ? "sleek-gradient-bg text-white font-semibold rounded-tr-none shadow-[0_4px_12px_rgba(255,107,53,0.2)]"
                    : "bg-white border border-[#E5E7EB] text-[#111827] rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-line">{msg.sender === "ai" ? renderInlineBold(msg.text) : msg.text}</p>

                {/* Rich Itinerary Result Card */}
                {msg.itineraryData && (
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex flex-col gap-2">
                    <div className="bg-[#FFF7ED] p-3.5 rounded-xl border border-[#FFEDD5]">
                      {msg.source === "sample" && (
                        <span
                          className="inline-flex items-center gap-1 mb-1.5 text-[11px] font-extrabold bg-[#F3F4F6] text-[#4B5563] px-2 py-0.5 rounded-full border border-[#E5E7EB]"
                          title="AI chưa khả dụng nên đây là lịch trình mẫu có sẵn, không phải do AI tạo riêng cho bạn"
                        >
                          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">info</span>
                          <span>Lịch trình mẫu</span>
                        </span>
                      )}
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-[#111827]">
                          {msg.itineraryData.meta.destination} - {msg.itineraryData.meta.trip_duration}
                        </span>
                        <span className="text-[11px] font-extrabold bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                          Dự kiến: {msg.itineraryData.meta.total_estimated_cost_vnd.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                      <p className="text-[12px] text-[#4B5563] mb-2">
                        {msg.itineraryData.meta.summary}
                      </p>

                      {/* Day 1 sample highlights */}
                      {msg.itineraryData.itinerary?.[0]?.schedule?.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-[12px] py-1 border-b border-[#FFEDD5]/60 last:border-none">
                          <span className="font-semibold text-[#111827]">📍 {item.place_name}</span>
                          <span className="text-[#FF6B35] font-bold">{item.cost_vnd > 0 ? `${item.cost_vnd.toLocaleString('vi-VN')} đ` : 'Miễn phí'}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onLoadItineraryToBuilder(msg.itineraryData!)}
                      className="w-full py-2.5 sleek-gradient-bg text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:opacity-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                      Mở trong Trình thiết kế lịch trình
                    </button>
                  </div>
                )}

                <span className="text-[10px] opacity-60 block text-right mt-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 self-start items-center text-[#FF6B35] text-[13px]">
              <div className="w-8 h-8 rounded-xl sleek-gradient-bg text-white flex items-center justify-center shrink-0 animate-spin">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              </div>
              <span className="font-bold animate-pulse">
                WanderAI đang phân tích địa điểm & lên lịch trình...
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Sticky Chat Input */}
      <div className="fixed bottom-[76px] left-0 w-full px-[20px] py-2.5 bg-gradient-to-t from-[#F0F2F5] via-[#F0F2F5] to-transparent z-30">
        <div className="flex items-center gap-2 bg-white rounded-full p-1.5 border border-[#E5E7EB] focus-within:border-[#FF6B35] focus-within:ring-1 focus-within:ring-[#FF6B35] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <button className="p-2 text-[#6B7280] hover:text-[#FF6B35] transition-colors">
            <span className="material-symbols-outlined text-[22px]">add_circle</span>
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Nhập câu hỏi hoặc điểm đến của bạn..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] px-1 outline-none font-medium"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            className="sleek-gradient-bg text-white p-2.5 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
