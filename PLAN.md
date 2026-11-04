# WanderAI — Kế hoạch hoàn thiện v2

> Viết ngày 04/11/2026, dựa trên commit `d91a573` (repo `binbap123/App-du-l-ch`).
> Cách làm: Phase 0 do Opus high làm tuần tự → Phase 1 và 2 chia sub agent (Opus medium) chạy song song, mỗi agent một worktree → Phase 3 Opus high gộp code, review và deploy.
> AI: **chỉ dùng Gemini free tier**, không dùng provider khác.

---

## 0. Quyết định đã chốt (04/11/2026)

**Đã chốt: D1 = localStorage, D2 = Render free, D3 = Leaflet + OSM, D4 = giữ SerpApi có giới hạn.**

| # | Quyết định | Phương án đã chọn | Phương án khác |
|---|---|---|---|
| D1 | Lưu chuyến đi ở đâu | **localStorage trên trình duyệt**: miễn phí, mỗi người chỉ thấy trip của mình, không cần đăng nhập, server không giữ state | Supabase free (Postgres + đăng nhập): đồng bộ nhiều máy, nhưng phức tạp hơn và project free bị tạm dừng nếu lâu không dùng. Có thể làm sau |
| D2 | Host miễn phí | **Render free web service** (ngủ sau ~15 phút không dùng, mở lại mất ~30–60s). Kiểm tra điều khoản lúc deploy | Cloud Run: bắt buộc gắn tài khoản billing có thẻ, trái với mục tiêu "không gắn billing" |
| D3 | Bản đồ | **Leaflet + OpenStreetMap**: không cần key, không cần billing. Nút "Mở Google Maps" vẫn giữ | Google Maps JS API: cần billing |
| D4 | SerpApi (tìm địa điểm Google Maps) | **Giữ nhưng không bắt buộc**: chỉ gọi khi bấm Enter, có cache 24h, tắt autocomplete mặc định. Không có key thì dùng DB nội bộ và Nominatim | Bỏ hẳn SerpApi |

---

## 1. Hiện trạng: những gì mình tìm thấy

### Nghiêm trọng
1. **Lộ API key Google Maps** trong `ExploreView.tsx` dòng 243 (`AIzaSy…`, hardcode trong repo public). Cần xóa và vô hiệu hoá key trong Google Cloud Console nếu đó là key của bạn.
2. **Các fix vòng 1 không có trong repo**: không có `ErrorBoundary`, không có timeout/AbortController, không có sanitize input. Có thể bản vá trong zip chưa được commit lên GitHub, nên Phase 0 làm lại.
3. **Dữ liệu dùng chung và dễ mất**: `db.json` trên server lưu chung cho mọi người (ai cũng xem và xóa được trip của người khác). Trên Cloud Run/Render, ổ đĩa là tạm thời nên khởi động lại là mất hết.
4. **Dễ cạn quota hoặc tốn tiền**:
   - `PlaceSearchModal` gọi `/api/places/search` (SerpApi) ở **mỗi lần gõ phím**, không có debounce. Quota free của SerpApi rất nhỏ.
   - Không có rate limit. Endpoint `/api/trending-spots/refresh` public nên ai cũng gọi Gemini được.
   - Body limit 10MB.
5. **Bug export Google Maps**: chỉ xuất Ngày 1. Nút trong danh sách dùng `setTimeout(200)` với closure cũ nên có thể **xuất nhầm chuyến đang chọn trước đó**.

### Chức năng giả hoặc chưa chạy
- **Explore**: ô tìm kiếm không làm gì; các nút "Xem tất cả", `tune`, `refresh` không có tác dụng; filter luôn `return true`; map mode là iframe kèm `MOCK_MAP_PLACES` có khoảng cách giả; dòng "40 địa điểm trong 5km" là giả.
- **Builder**: ngày hiển thị cứng `08/08, 09/08…`; nút kéo thả không chạy; "AI Gợi Ý" lấy từ `MOCK_TRAY_SUGGESTIONS`; tổng thời gian tính bằng `số điểm × 2.5h`; ô nhập chi phí bị nhảy con trỏ; `useState(itineraryData)` không cập nhật khi đổi trip.
- **AI chat**: có gửi history nhưng mất khi chuyển tab. History bắt đầu bằng tin nhắn của AI, có thể gây lỗi role ở Gemini. AI không thấy JSON lịch trình cũ nên không sửa tiếp được ("đổi ngày 2 sang biển"). Lỗi bất kỳ cũng trả về lịch trình mẫu, kể cả với câu hỏi không liên quan.
- **Trending**: Gemini **bịa số lượt xem** ("45M views") rồi hiển thị như số liệu thật.
- **Settings/Header**: tên, email, avatar, thông báo, thanh toán, đăng xuất đều là giả.
- **Code**: schema Gemini bị lặp 2 lần (~180 dòng); không có router; model hardcode `gemini-3.7-flash`; lịch trình AI không có `lat/lng` nên không vẽ được bản đồ.

### Đang ổn
- Build và `tsc` sạch. Giao diện đã có phong cách nhất quán. Fallback khi thiếu key Gemini hoạt động. Có `placesData.ts` gồm 21 địa điểm có tọa độ thật.

---

## 2. Hợp đồng chung (Phase 0 chốt, Phase 1–2 không được tự ý đổi)

### 2.1 Cấu trúc thư mục đích
```
server/
  index.ts                 # app, middleware, mount routes, vite/static
  lib/gemini.ts            # client, GEMINI_MODEL, timeout, generateJson<T>()
  lib/cache.ts             # LRU in-memory TTL
  lib/rateLimit.ts         # express-rate-limit presets
  lib/validate.ts          # zod schemas cho request body
  schemas/itinerary.ts     # MỘT responseSchema Gemini dùng chung
  routes/chat.ts           # Agent AI
  routes/itinerary.ts      # Agent AI (generate)
  routes/suggest.ts        # Agent AI (gợi ý thêm điểm cho builder)
  routes/places.ts         # Agent Data
  routes/geocode.ts        # Agent Data
  routes/trending.ts       # Agent Data
src/
  lib/api.ts               # fetchJson() có timeout + lỗi chuẩn
  lib/tripStore.ts         # Agent Data: CRUD localStorage
  lib/mapsExport.ts        # Agent Map
  hooks/useTrips.ts        # Agent Data
  hooks/useChat.ts         # Agent AI
  components/map/*         # Agent Map
  pages/*                  # Phase 2
  routes.tsx               # Phase 0 tạo khung, Phase 2 điền
```

### 2.2 Kiểu dữ liệu (`src/types.ts`)
- Giữ `WanderItineraryData`; thêm `created_at?`, `updated_at?` (ISO), `start_date?` (YYYY-MM-DD). `id` vẫn optional trong type (lịch trình AI chưa lưu chưa có id) nhưng `tripStore` **luôn** gán id khi lưu.
- `ScheduleItem`: giữ nguyên, thêm `geo_source?: "verified" | "geocoded" | "ai_estimate"` đi kèm `lat/lng`.
- Kiểu lỗi API chuẩn: `{ success: false, error: { code: string, message: string } }`.
- Response AI có thêm `source: "gemini" | "cache" | "sample"` để UI hiện nhãn "Lịch trình mẫu" khi fallback.

### 2.3 API
| Method | Path | Rate limit | Ghi chú |
|---|---|---|---|
| POST | `/api/generate-itinerary` | 5/phút/IP | cache 24h theo (điểm đến, số ngày, ngân sách, sở thích) |
| POST | `/api/chat` | 10/phút/IP | body: `{ message, history: last 10 turns, currentItinerary? }` |
| POST | `/api/suggest` | 10/phút/IP | `{ destination, dayIndex, existingPlaces[] }` → 4 gợi ý |
| POST | `/api/places/search` | 20/phút/IP | SerpApi chỉ khi có key, cache 24h |
| GET | `/api/geocode?q=&city=` | 30/phút/IP | Nominatim, ≤1 req/s, cache vĩnh viễn trong RAM, giới hạn bbox Việt Nam |
| GET | `/api/trending-spots` | 30/phút/IP | `refresh` chỉ chạy tối đa 1 lần/6h, không public trigger |
| — | `/api/itineraries*` | — | **Xóa** nếu chọn D1 = localStorage |

---

## 3. Các phase

### Phase 0: Nền móng (Opus high, làm tuần tự)
1. Tách `server.ts` theo cấu trúc 2.1, gộp schema Gemini làm một, đọc model từ `GEMINI_MODEL` (mặc định `gemini-3.7-flash`).
2. `lib/gemini.ts`: timeout 30s; lỗi 429 thì trả `source: "sample"` kèm thông báo rõ ràng, không giả vờ là AI.
3. Thêm `zod`, `express-rate-limit`; body limit 100kb; validate độ dài input (≤ 500 ký tự).
4. Cache LRU.
5. FE: `ErrorBoundary`, `lib/api.ts`, khung React Router (giữ các trang cũ làm route), xóa key Maps hardcode.
6. Thêm `vitest` cùng vài test mẫu; script `npm run check` = lint + test + build.
7. Cập nhật `.env.example` và README.

**Trạng thái: đã xong (04/11/2026).**

**Xong khi:** `npm run check` pass, app chạy như cũ (không đổi tính năng), mọi file trong 2.1 đã tồn tại kèm stub và comment `TODO(agent-x)`.

### Phase 1: 3 agent song song (Opus medium, mỗi agent một worktree)

**Trạng thái: đã xong và đã gộp (04/11/2026), 186 test pass.** Việc còn lại chuyển sang Phase 2: thêm tọa độ cho lịch trình mẫu (`sampleItineraries.ts`, `DEFAULT_ITINERARY_DANANG`), nối `useSuggestions` vào builder, gộp 2 bản `matchVerifiedPlace` (geocode.ts và itinerary.ts), clustering marker ở Explore.

**Agent Data & Backend.** Chỉ sửa: `server/routes/{places,geocode,trending}.ts`, `src/lib/tripStore.ts`, `src/hooks/useTrips.ts`, `App.tsx` (phần state trip)
- `tripStore` dùng localStorage có version key (`wanderai.trips.v1`), xử lý try/catch, migrate dữ liệu cũ; thêm export/import JSON.
- `/api/geocode` dùng Nominatim (header User-Agent riêng của app, 1 req/s, cache); ưu tiên khớp `placesData.ts` trước.
- Places search: chỉ gọi SerpApi khi submit, có cache; autocomplete tắt trừ khi có `SERPAPI_AUTOCOMPLETE=true`.
- Trending: bỏ số view bịa, đổi nhãn thành "AI gợi ý • cập nhật <ngày>"; refresh bị giới hạn thời gian.
- **Xong khi:** reload trang vẫn còn trip; 2 trình duyệt khác nhau không thấy trip của nhau; gõ 10 ký tự trong modal chỉ tạo ≤ 1 request SerpApi; có test cho tripStore và cache.

**Agent AI.** Chỉ sửa: `server/routes/{chat,itinerary,suggest}.ts`, `server/prompts/*`, `src/hooks/useChat.ts`, `AIAssistantView.tsx`
- Chat lưu trong localStorage (theo trip hoặc theo phiên), gửi 10 lượt gần nhất, bỏ lời chào khỏi history.
- Gửi kèm `currentItinerary` để người dùng sửa được ("thay buổi tối ngày 2 bằng chợ đêm").
- Phân loại ý định trước khi trả lịch trình mẫu; câu hỏi thường gặp lỗi thì báo lỗi thật.
- Prompt yêu cầu lat/lng ước lượng (`geo_source: "ai_estimate"`) cho từng điểm.
- `/api/suggest` thay `MOCK_TRAY_SUGGESTIONS`.
- **Xong khi:** hỏi 3 lượt liên tiếp mà AI nhớ ngữ cảnh; chuyển tab rồi quay lại vẫn còn chat; sửa lịch trình qua chat ra bản mới đúng schema; test dùng Gemini mock pass.

**Agent Map.** Chỉ sửa: `src/components/map/*`, `src/lib/mapsExport.ts`, phần map trong `ExploreView.tsx`
- Thêm `leaflet` và `react-leaflet`. Component `TripMap` hiện marker đánh số và tô màu theo ngày, có polyline, tự `fitBounds`, popup gồm tên + giờ + nút "Mở Google Maps".
- Điểm thiếu tọa độ thì gọi `/api/geocode`; điểm `ai_estimate` hiện viền đứt nét để người dùng biết là ước lượng.
- `mapsExport`: mỗi ngày một link chỉ đường (Google giới hạn ~9 waypoint), sửa bug closure.
- Explore map mode dùng `TripMap` với `placesData`, bỏ iframe và mock.
- **Xong khi:** trip 3 ngày hiện đủ 3 màu và 3 tuyến; export ra 3 link đúng; không còn dùng API key nào cho bản đồ.

### Phase 2: UI (Opus medium, 2 agent song song, chạy sau khi gộp Phase 1)

**Agent UI-Trips.** `pages/TripsPage`, `pages/TripDetailPage` (bản đồ, timeline, ngân sách, tips), `pages/TripEditPage` (builder)
- Builder: chọn ngày bắt đầu để có ngày thật; kéo thả bằng `@dnd-kit`; sửa input chi phí; đồng bộ khi đổi trip; tray dùng `/api/suggest`.
- Bỏ ảnh fallback giả, dùng ảnh theo thành phố hoặc placeholder.

**Agent UI-Explore.** `pages/ExplorePage`, `pages/TrendingPage`, `pages/PlacePage` (chi tiết địa điểm từ `placesData`), `SettingsPage`, `Header`
- Ô tìm kiếm có tác dụng (gợi ý điểm đến và mở trang AI hoặc trang địa điểm); xóa hoặc làm thật mọi nút đang giả.
- Settings: bỏ hồ sơ/thanh toán giả; giữ xuất/nhập dữ liệu, xóa dữ liệu, giới thiệu.
- Loading skeleton, favicon, OG image.

**Xong khi (chung):** mọi nút đều có tác dụng hoặc đã bị xóa; mỗi trang có URL riêng, reload đúng trang; `npm run check` pass; giao diện mobile 390px không bị tràn ngang.

### Phase 3: Gộp, review, deploy (Opus high)
1. Merge các worktree, giải quyết conflict, review chéo từng agent theo tiêu chí "Xong khi".
2. Smoke test bằng Playwright: tạo trip qua AI → sửa → reload → xem map → export. Chụp screenshot mobile và desktop.
3. Deploy theo D2, set env, kiểm tra `/api/health`. Ghi hướng dẫn deploy vào README.

---

## 4. Rủi ro và lưu ý
- **Gemini free**: khoảng 1.500 request/ngày, 15 request/phút (cần xem số thật trong AI Studio). Prompt và câu trả lời có thể được Google dùng để cải thiện model, nên không gửi dữ liệu cá nhân.
- **Tọa độ do AI ước lượng có thể lệch**: luôn ưu tiên DB đã xác minh, sau đó Nominatim, cuối cùng mới đến AI. UI phải hiện rõ nguồn tọa độ.
- **Nominatim**: tối đa 1 req/s, bắt buộc có cache, không gọi trực tiếp từ trình duyệt.
- **Agent medium** dự kiến xong khoảng 70–85% mỗi module. Phase 3 dành thời gian cho phần còn lại.
- **Push GitHub**: hiện session chưa có quyền push vào repo (Claude GitHub App chưa cài). Cài app thì sẽ mở PR; nếu không, mình gửi bản zip hoặc patch.
