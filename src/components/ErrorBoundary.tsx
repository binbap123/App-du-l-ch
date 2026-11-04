import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Chặn lỗi render để app không bị trắng màn hình. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F0F2F5]">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-6 max-w-sm w-full text-center shadow-sm">
          <span className="material-symbols-outlined text-[44px] text-[#FF6B35]">error</span>
          <h1 className="text-[18px] font-extrabold text-[#111827] mt-2">Có lỗi xảy ra</h1>
          <p className="text-[13px] text-[#6B7280] mt-1">
            Trang gặp sự cố khi hiển thị. Dữ liệu chuyến đi của bạn vẫn được giữ nguyên.
          </p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => this.setState({ error: null })}
              className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-[13px] font-bold text-[#111827]"
            >
              Thử lại
            </button>
            <button
              onClick={() => window.location.assign("/")}
              className="flex-1 py-2.5 rounded-xl sleek-gradient-bg text-white text-[13px] font-bold"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }
}
