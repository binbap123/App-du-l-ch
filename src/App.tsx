/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { TabType, WanderItineraryData } from "./types";
import { PATHS, tabFromPath } from "./routes";
import { DEFAULT_ITINERARY_DANANG } from "./data/mockData";
import { useTrips } from "./hooks/useTrips";
import { Header } from "./components/Header";
import { Navbar } from "./components/Navbar";
import { ExploreView } from "./components/ExploreView";
import { AIAssistantView } from "./components/AIAssistantView";
import { ItineraryListView } from "./components/ItineraryListView";
import { ItineraryBuilderView } from "./components/ItineraryBuilderView";
import { TrendingView } from "./components/TrendingView";
import { SettingsView } from "./components/SettingsView";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromPath(location.pathname);
  const setActiveTab = (tab: TabType) => navigate(PATHS[tab]);
  const { trips: itineraries, currentTrip, setCurrentTripId, saveTrip, deleteTrip, isPersistent } = useTrips();
  // Danh sách rỗng (người dùng xóa hết) → hiển thị lịch trình mẫu chưa lưu.
  const currentItinerary: WanderItineraryData = currentTrip ?? DEFAULT_ITINERARY_DANANG;
  const [prefillAIDestination, setPrefillAIDestination] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const notPersistentNote = " (trình duyệt đang chặn bộ nhớ, dữ liệu sẽ mất khi tải lại trang)";

  const handleOpenAIPlanForDestination = (destName: string) => {
    setPrefillAIDestination(destName);
    setActiveTab("ai_assistant");
  };

  const handleSelectItinerary = (itinerary: WanderItineraryData) => {
    if (itinerary.id) {
      setCurrentTripId(itinerary.id);
    } else {
      setCurrentTripId(saveTrip(itinerary).id ?? null);
    }
    setActiveTab("builder");
  };

  const handleLoadItineraryToBuilder = (itineraryData: WanderItineraryData) => {
    const saved = saveTrip(itineraryData);
    setCurrentTripId(saved.id ?? null);
    setActiveTab("builder");
    showToast(
      `Đã lưu và tải lịch trình ${saved.meta.destination} vào Trình thiết kế!${isPersistent ? "" : notPersistentNote}`
    );
  };

  const handleSaveAndExport = (updatedData: WanderItineraryData) => {
    const saved = saveTrip(updatedData);
    setCurrentTripId(saved.id ?? null);
    setActiveTab("itinerary");
    showToast(`Đã lưu lịch trình chuyến đi ${saved.meta.destination}!${isPersistent ? "" : notPersistentNote}`);
  };

  const handleDeleteItinerary = (id: string) => {
    if (deleteTrip(id)) {
      // currentTrip tự chuyển sang trip đầu tiên còn lại (useTrips).
      if (currentTrip?.id === id) setCurrentTripId(null);
      showToast("Đã xóa lịch trình thành công!");
    } else {
      showToast("Không tìm thấy lịch trình để xóa.");
    }
  };

  const handleExportGoogleMaps = () => {
    const day1Schedule = currentItinerary.itinerary?.[0]?.schedule || [];
    if (day1Schedule.length === 0) {
      showToast("Chưa có địa điểm nào trong lịch trình để xuất sang Google Maps.");
      return;
    }

    const waypoints = day1Schedule.map(
      (item) => `${item.place_name}, ${item.address_hint || currentItinerary.meta.destination}`
    );

    const origin = encodeURIComponent(waypoints[0]);
    const destination = encodeURIComponent(waypoints[waypoints.length - 1]);
    const waypointsParam = waypoints
      .slice(1, -1)
      .map((w) => encodeURIComponent(w))
      .join("|");

    let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypointsParam) {
      mapsUrl += `&waypoints=${waypointsParam}`;
    }

    window.open(mapsUrl, "_blank");
    showToast("Đã mở tuyến đường trên Google Maps!");
  };

  return (
    <div className="bg-[#fbf9f5] text-[#1b1c1a] min-h-screen font-sans antialiased selection:bg-[#e2a854] selection:text-[#603e00]">
      {/* Top Header (Hide when in Builder mode to match native mobile feel) */}
      {activeTab !== "builder" && (
        <Header
          userLetter="N"
          avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuA9ay_RlhndkG5BtlQ1JYkLYD2UMuqfZPmLIQTtbkjkZ16ZyBgeJwgvc_H_-OCufCyLDpwhG3DNSHl-5I_P5Wa5feKvJmuHbEZFNw-QJgdKlQe5XQUuLRkCVbKRwuLo1k6iXrtM8Dz8Szor45RTkScOls4sSv-q1DBx_-TWf5MZnSiqMhIyr-3UciLHeiX8aN9X4r--EWp_Wn_uH12EG2y-5UG-6vDfH-pKk6m9Wk0OW3bpOa_GoJUS"
          onNotificationClick={() => showToast("Bạn có 2 thông báo gợi ý chuyến đi từ WanderAI!")}
        />
      )}

      {/* View Content Renderer */}
      <main className="w-full mx-auto">
        <Routes>
          <Route
            path={PATHS.explore}
            element={
              <ExploreView
                onSelectDestination={(dest) => showToast(`Đã chọn ${dest}`)}
                onOpenAIPlan={handleOpenAIPlanForDestination}
              />
            }
          />
          <Route path={PATHS.trending} element={<TrendingView onOpenAIPlan={handleOpenAIPlanForDestination} />} />
          <Route
            path={PATHS.ai_assistant}
            element={
              <AIAssistantView
                onLoadItineraryToBuilder={handleLoadItineraryToBuilder}
                prefillDestination={prefillAIDestination}
                onClearPrefill={() => setPrefillAIDestination("")}
              />
            }
          />
          <Route
            path={PATHS.itinerary}
            element={
              <ItineraryListView
                itineraries={itineraries}
                currentItinerary={currentItinerary}
                onSelectItinerary={handleSelectItinerary}
                onDeleteItinerary={handleDeleteItinerary}
                onOpenBuilder={() => setActiveTab("builder")}
                onExportGoogleMaps={handleExportGoogleMaps}
              />
            }
          />
          <Route
            path={PATHS.builder}
            element={
              <ItineraryBuilderView
                key={currentItinerary.id || "new"}
                itineraryData={currentItinerary}
                onSaveAndExport={handleSaveAndExport}
                onBack={() => setActiveTab("itinerary")}
              />
            }
          />
          <Route path={PATHS.settings} element={<SettingsView />} />
          <Route path="*" element={<Navigate to={PATHS.explore} replace />} />
        </Routes>
      </main>

      {/* Bottom Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1b1c1a] text-white text-[13px] font-medium px-4 py-2.5 rounded-full shadow-lg border border-white/20 transition-all animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Fixed Bottom Navigation */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
