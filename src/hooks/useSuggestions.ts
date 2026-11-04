import { useCallback, useEffect, useRef, useState } from "react";
import type { DataSource, ScheduleItem } from "../types";
import { fetchJson, ApiError } from "../lib/api";

/**
 * Gợi ý thêm địa điểm cho một ngày trong builder (thay MOCK_TRAY_SUGGESTIONS — Phase 2 nối vào).
 * Truyền `null` để không gọi.
 */
export interface SuggestionParams {
  destination: string;
  dayIndex: number;
  existingPlaces: string[];
}

interface SuggestResponse {
  success: true;
  source: DataSource;
  data: ScheduleItem[];
  message?: string;
}

export interface UseSuggestionsResult {
  suggestions: ScheduleItem[];
  source: DataSource | null;
  /** Thông báo từ server (vd chưa kết nối AI nên chỉ có gợi ý đã xác minh). */
  notice: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSuggestions(params: SuggestionParams | null): UseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<ScheduleItem[]>([]);
  const [source, setSource] = useState<DataSource | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Key ổn định: không gọi lại khi parent tạo mảng mới cùng nội dung.
  const key = params
    ? JSON.stringify([params.destination.trim(), params.dayIndex, [...params.existingPlaces].sort()])
    : null;

  useEffect(() => {
    if (!key) {
      setSuggestions([]);
      setSource(null);
      setNotice(null);
      setError(null);
      setLoading(false);
      return;
    }
    const [destination, dayIndex, existingPlaces] = JSON.parse(key) as [string, number, string[]];
    if (!destination) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    fetchJson<SuggestResponse>("/api/suggest", {
      method: "POST",
      body: { destination, dayIndex, existingPlaces: existingPlaces.slice(0, 30) },
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        setSuggestions(Array.isArray(res.data) ? res.data : []);
        setSource(res.source);
        setNotice(res.message || null);
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof ApiError && err.code === "ABORTED")) return;
        setError(err instanceof ApiError ? err.message : "Không tải được gợi ý");
        setSuggestions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [key, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { suggestions, source, notice, loading, error, refresh };
}
