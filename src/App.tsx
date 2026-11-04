/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { TabType, WanderItineraryData } from "./types";
import { PATHS, tabFromPath, tripEditPath, tripPath } from "./routes";
import { useTrips } from "./hooks/useTrips";
import { readDraftTrip, writeDraftTrip } from "./lib/draftTrip";
import { Header } from "./components/Header";
import { Navbar } from "./components/Navbar";
import { ExploreView } from "./components/ExploreView";
import { AIAssistantView } from "./components/AIAssistantView";
import { ItineraryListView } from "./components/ItineraryListView";
import { ItineraryBuilderView } from "./components/ItineraryBuilderView";
import { TrendingView } from "./components/TrendingView";
import { SettingsView } from "./components/SettingsView";
import { TripDetailPage, TripNotFound } from "./pages/TripDetailPage";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromPath(location.pathname);
  const setActiveTab = (tab: TabType) => navigate(PATHS[tab]);
  const { trips, saveTrip, deleteTrip, isPersistent } = useTrips();
  const [draft, setDraftState] = useState<WanderItineraryData | null>(() => readDraftTrip());
  const draftVersion = useRef(0);
  const [prefillAIDestination, setPrefillAIDestination] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500);
  };

  const notPersistentNote = ". Trình duyệt đang chặn bộ nhớ nên dữ liệu sẽ mất khi tải lại trang.";

  const setDraft = (trip: WanderItineraryData | null) => {
    draftVersion.current += 1;
    setDraftState(trip);
    writeDraftTrip(trip);
  };

  const handleOpenAIPlanForDestination = (destName: string) => {
    setPrefillAIDestination(destName);
    setActiveTab("ai_assistant");
  };

  /** Mở một lịch trình chưa lưu (từ chat hoặc form tạo mới) trong builder. */
  const openDraft = (itineraryData: WanderItineraryData) => {
    setDraft(itineraryData);
    navigate(PATHS.builder);
  };

  const handleSave = (updatedData: WanderItineraryData, fromDraft: boolean) => {
    const saved = saveTrip(updatedData);
    if (fromDraft) setDraft(null);
    navigate(tripPath(saved.id!), { replace: fromDraft });
    showToast(`Đã lưu chuyến đi ${saved.meta.destination}${isPersistent ? "" : notPersistentNote}`);
  };

  const handleDelete = (id: string) => {
    if (deleteTrip(id)) {
      if (location.pathname !== PATHS.itinerary) navigate(PATHS.itinerary, { replace: true });
      showToast("Đã xóa chuyến đi");
    } else {
      showToast("Không tìm thấy chuyến đi để xóa");
    }
  };

  const draftElement = draft ? (
    <ItineraryBuilderView
      key={`draft-${draftVersion.current}`}
      itineraryData={draft}
      onSaveAndExport={(d) => handleSave(d, true)}
      onBack={() => navigate(PATHS.itinerary)}
    />
  ) : (
    <TripNotFound
      title="Không có bản nháp nào đang mở"
      description="Bản nháp chỉ được giữ trong tab này. Hãy mở lại lịch trình từ Trợ lý AI hoặc tạo chuyến đi mới."
      onBack={() => navigate(PATHS.itinerary)}
    />
  );

  return (
    <div className="bg-[#fbf9f5] text-[#1b1c1a] min-h-screen font-sans antialiased selection:bg-[#e2a854] selection:text-[#603e00]">
      {/* Builder có thanh tiêu đề riêng */}
      {activeTab !== "builder" && <Header />}

      <main className="w-full mx-auto">
        <Routes>
          <Route path={PATHS.explore} element={<ExploreView onOpenAIPlan={handleOpenAIPlanForDestination} />} />
          <Route path={PATHS.trending} element={<TrendingView onOpenAIPlan={handleOpenAIPlanForDestination} />} />
          <Route
            path={PATHS.ai_assistant}
            element={
              <AIAssistantView
                onLoadItineraryToBuilder={openDraft}
                prefillDestination={prefillAIDestination}
                onClearPrefill={() => setPrefillAIDestination("")}
              />
            }
          />
          <Route
            path={PATHS.itinerary}
            element={
              <ItineraryListView
                itineraries={trips}
                onOpenTrip={(id) => navigate(tripPath(id))}
                onEditTrip={(id) => navigate(tripEditPath(id))}
                onCreateTrip={openDraft}
                onDeleteItinerary={handleDelete}
              />
            }
          />
          <Route path={PATHS.builder} element={draftElement} />
          <Route
            path="/trips/:id"
            element={
              <TripDetailRoute
                trips={trips}
                onBack={() => navigate(PATHS.itinerary)}
                onEdit={(id) => navigate(tripEditPath(id))}
                onDelete={handleDelete}
              />
            }
          />
          <Route
            path="/trips/:id/edit"
            element={
              <TripEditRoute
                trips={trips}
                onSave={(d) => handleSave(d, false)}
                onBack={(id) => navigate(id ? tripPath(id) : PATHS.itinerary)}
              />
            }
          />
          <Route path={PATHS.settings} element={<SettingsView onDraftCleared={() => setDraft(null)} />} />
          <Route path="*" element={<Navigate to={PATHS.explore} replace />} />
        </Routes>
      </main>

      {toastMsg && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] w-max max-w-[calc(100vw-32px)] text-center bg-[#1b1c1a] text-white text-[13px] font-medium px-4 py-2.5 rounded-2xl shadow-lg border border-white/20"
        >
          {toastMsg}
        </div>
      )}

      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

interface TripRouteProps {
  trips: WanderItineraryData[];
}

function TripDetailRoute({
  trips,
  onBack,
  onEdit,
  onDelete,
}: TripRouteProps & { onBack: () => void; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const { id } = useParams();
  const trip = id ? trips.find((t) => t.id === id) : undefined;
  if (!trip?.id) return <TripNotFound onBack={onBack} />;
  return (
    <TripDetailPage trip={trip} onBack={onBack} onEdit={() => onEdit(trip.id!)} onDelete={() => onDelete(trip.id!)} />
  );
}

function TripEditRoute({
  trips,
  onSave,
  onBack,
}: TripRouteProps & { onSave: (d: WanderItineraryData) => void; onBack: (id?: string) => void }) {
  const { id } = useParams();
  const trip = id ? trips.find((t) => t.id === id) : undefined;
  if (!trip?.id) return <TripNotFound onBack={() => onBack()} />;
  return (
    <ItineraryBuilderView key={trip.id} itineraryData={trip} onSaveAndExport={onSave} onBack={() => onBack(trip.id)} />
  );
}
