# WanderAI: việc chia cho agent (đợt tiếp theo)

Tài liệu này dùng để giao việc trong Claude Code. Người điều phối (phiên Claude Code chính) đọc hết file này, làm Đợt 0, rồi giao từng task ở Đợt 1 cho agent con theo đúng nội dung bên dưới. Mỗi task đã ghi sẵn file được sửa, file cấm sửa, các bước và tiêu chí "Xong khi".

Trạng thái trước đợt này: Phase 0 đến Phase 3 trong `PLAN.md` đã xong trên nhánh `wanderai-v2`, có 94 test pass, build giả lập Render chạy được. Nhánh `main` mới chỉ có Phase 0.

---

## Cách chạy trong Claude Code

1. Mở Claude Code tại thư mục repo, chuyển sang nhánh `wanderai-v2` (`git fetch && git checkout wanderai-v2 && git pull`).
2. Claude Code tự đọc `CLAUDE.md` (quy ước dự án) và `.claude/agents/wanderai-coder.md` (agent code: model Opus, effort medium).
3. Nói với phiên chính, ví dụ: "Đọc docs/AGENT_TASKS.md. Làm Đợt 0, sau đó chạy song song task A, B, C, D, E, F bằng agent wanderai-coder, mỗi agent một worktree. Gộp từng nhánh khi xong rồi làm Đợt 2."
4. Muốn tiết kiệm usage thì chạy từng task một, hoặc bỏ bớt task. Các task ở Đợt 1 độc lập nhau nên bỏ task nào cũng không ảnh hưởng task khác. Thứ tự ưu tiên nếu phải chọn: G, E, B, A, C, D, F.

Lời giao việc cho mỗi agent nên gồm: nội dung nguyên văn của task trong file này, commit gốc cần kiểm tra (hash `wanderai-v2` sau Đợt 0), và câu "chỉ sửa đúng các file được liệt kê".

---

## Đợt 0: người điều phối làm tuần tự (không chia agent)

### 0.1 Đối chiếu code đã làm riêng trên máy

Nếu đã có thay đổi làm trong một phiên Claude Code khác mà chưa push:
- Lưu chúng vào nhánh riêng: `git switch -c local-work && git add -A && git commit -m "wip: local work"`.
- So với `wanderai-v2`: `git diff --stat wanderai-v2...local-work`, đọc từng file khác biệt.
- Với mỗi thay đổi: nếu `wanderai-v2` đã có tính năng tương đương thì bỏ; nếu là thứ mới thì cherry-pick hoặc chép tay vào `wanderai-v2`. Ưu tiên giữ code của `wanderai-v2` cho các file `src/App.tsx`, `server/**`, `src/hooks/**`, `src/components/map/**`, vì các file này đã được viết lại và có test.
- Chạy `npm run check`. Không làm tiếp nếu chưa pass.

### 0.2 Cài trước các dependency mà Đợt 1 cần

Làm trước để các agent không cùng sửa `package.json` (nếu cùng sửa sẽ conflict khi gộp):

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities leaflet.markercluster
npm install -D @types/leaflet.markercluster @testing-library/react @testing-library/user-event jsdom
npm uninstall motion lucide-react   # hai gói này không còn file nào dùng
npm run check
```

Commit với message `chore: preinstall deps for next agent wave`, push `wanderai-v2`, ghi lại hash commit này làm commit gốc cho mọi agent.

### 0.3 Deploy lên Render (người dùng tự làm, người điều phối hỗ trợ)

- Render, New, Web Service (hoặc Blueprint), repo `binbap123/App-du-l-ch`, **nhánh `wanderai-v2`**.
- Build: `npm ci --include=dev && npm run build`. Start: `npm start`. Health check: `/api/health`. Instance: Free.
- Biến môi trường: `GEMINI_API_KEY` (key bắt đầu bằng `AIza`), `GEMINI_MODEL=gemini-3.7-flash`, tùy chọn `SERPAPI_API_KEY`.
- Kiểm tra trên bản deploy những thứ sandbox không kiểm được: ảnh hiện đúng, nền bản đồ OpenStreetMap tải được, tạo một lịch trình qua chat và thấy đủ marker (geocode Nominatim chạy được). Có lỗi thì sửa trước khi chạy Đợt 1.

---

## Đợt 1: các task chạy song song

Quy tắc chung cho mọi task:
- Bước đầu tiên: `git log -1 --format=%h` phải bằng commit gốc của Đợt 0. Nếu khác và worktree sạch thì `git reset --hard <commit gốc>`. Sau đó `npm install`.
- Không sửa `src/types.ts`, `package.json`, `package-lock.json`. Cần đổi thì ghi vào báo cáo.
- Dùng thư mục scratchpad riêng theo tên task.
- Xong khi `npm run check` pass, có smoke test Playwright cho phần mình làm (viewport 390x844, `npm run build && PORT=<cổng riêng> node dist/server.cjs`), không có `pageerror`, đã commit trong worktree, không push.
- Báo cáo cuối viết tiếng Việt bằng văn thường, không icon: hash commit, file đã đổi, xong/chưa xong so với "Xong khi", rủi ro khi gộp.

### Task A: Kéo thả sắp xếp trong Trình thiết kế

Mục tiêu: người dùng kéo để đổi thứ tự điểm trong một ngày, và kéo một điểm sang ngày khác.

- Được sửa: `src/components/ItineraryBuilderView.tsx`, tạo mới `src/components/builder/*` nếu muốn tách component, `src/lib/uiFormat.ts` (chỉ thêm hàm), `tests/builder.test.ts` (mới).
- Cấm sửa: mọi file khác.
- Skill: `frontend-design`.
- Các bước:
  1. Dùng `@dnd-kit/core` + `@dnd-kit/sortable` (đã cài). Có tay nắm kéo rõ ràng, kéo được bằng cảm ứng trên điện thoại (dùng `TouchSensor` có delay khoảng 150ms để không lẫn với cuộn trang) và bằng bàn phím (`KeyboardSensor`).
  2. Kéo sang ngày khác: kéo thả vào pill ngày ở thanh trên, hoặc có nút "Chuyển sang ngày..." trong menu của thẻ làm phương án dự phòng trên điện thoại.
  3. Sau khi đổi thứ tự, không tự đổi `time_slot`. Hiện một dòng nhỏ "Giờ chưa theo thứ tự" nếu giờ bắt đầu không còn tăng dần, kèm nút "Sắp xếp theo giờ".
  4. Viết hàm thuần `moveItem(days, from, to)` trong `uiFormat.ts` và test nó.
- Xong khi: kéo đổi thứ tự trong ngày và chuyển sang ngày khác đều hoạt động trong Playwright (dùng `page.mouse` hoặc bàn phím); lưu rồi tải lại trang chi tiết thì thứ tự mới vẫn đúng; bản đồ trang chi tiết vẽ đường theo thứ tự mới.

### Task B: Gom cụm marker trên bản đồ Khám phá

Mục tiêu: ở mức zoom toàn quốc, marker không chồng lên nhau.

- Được sửa: `src/components/map/PlacesMap.tsx`, `src/components/map/mapUtils.ts`, `src/index.css` (chỉ thêm style cụm), `tests/map.test.ts` (chỉ thêm test).
- Cấm sửa: `TripMap.tsx` và mọi file ngoài danh sách.
- Các bước:
  1. Dùng `leaflet.markercluster` (đã cài) qua một component nhỏ dùng `useMap()`. Không thêm `react-leaflet-cluster` vì gói này thường lệch phiên bản với react-leaflet 5.
  2. Cụm hiển thị số địa điểm, màu theo màu chủ đạo của app, đủ tương phản. Bấm cụm thì zoom vào.
  3. Giữ nguyên đồng bộ hai chiều giữa marker và carousel card. Khi chọn một card mà marker đang nằm trong cụm, gọi `zoomToShowLayer` để mở cụm.
- Xong khi: ở zoom ban đầu số phần tử `.marker-cluster` lớn hơn 0 và không có hai marker đơn chồng lên nhau quá 50%; bấm card vẫn bay đúng tới marker; bộ lọc vẫn đổi đúng số địa điểm.

### Task C: Trang chi tiết địa điểm

Mục tiêu: mỗi địa điểm đã xác minh có trang riêng `/place/:id`.

- Được sửa: tạo mới `src/pages/PlacePage.tsx`, `src/routes.tsx` (chỉ thêm `placePath`), `src/App.tsx` (chỉ thêm một `<Route>`), `src/components/map/PlacesMap.tsx` **không được sửa** (Task B đang sửa); thay vào đó thêm link "Xem chi tiết" trong carousel card ở `src/components/ExploreView.tsx` (chỉ khối carousel của map mode).
- Cấm sửa: mọi file khác.
- Skill: `frontend-design`, `design:ux-copy`.
- Các bước:
  1. Trang gồm: ảnh, tên, loại, địa chỉ, giờ mở cửa, khoảng giá, món/hoạt động gợi ý, bản đồ nhỏ một marker (tái dùng `TripMap` bằng cách dựng một trip giả một điểm, hoặc dùng trực tiếp `MapContainer`), link mở Google Maps.
  2. Nút "Thêm vào chuyến đi": chọn một trip đã lưu (từ `useTrips`) và một ngày, sau đó chèn điểm bằng `insertByTime` trong `uiFormat.ts`, rồi lưu bằng `saveTrip`. Không có trip nào thì mở bản nháp mới qua `src/lib/draftTrip.ts`.
  3. Nút "Lên lịch trình AI quanh đây": chuyển sang `/chat` kèm câu gợi ý.
  4. Không hiển thị rating hay số đánh giá (dữ liệu viết tay chưa xác minh, đang để 0).
  5. Id không tồn tại thì hiện trạng thái "Không tìm thấy địa điểm".
- Xong khi: từ bản đồ Khám phá mở được trang chi tiết; tải lại `/place/<id>` vẫn đúng; thêm vào một trip rồi mở trip đó thấy điểm mới ở đúng ngày và đúng vị trí theo giờ.

### Task D: Trạng thái tải, rỗng và lỗi thống nhất

Mục tiêu: không còn chỗ nào trắng trơn hoặc chỉ có chữ "đang tải".

- Được sửa: tạo mới `src/components/ui/Skeleton.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/ErrorState.tsx`; sửa `src/components/TrendingView.tsx`, `src/components/ItineraryListView.tsx`, `src/components/AIAssistantView.tsx` (chỉ phần hiển thị đang tải/lỗi), `src/pages/TripDetailPage.tsx` (chỉ phần Suspense fallback của bản đồ).
- Cấm sửa: `ItineraryBuilderView.tsx` (Task A), `ExploreView.tsx` (Task C), mọi file server.
- Skill: `frontend-design`, `design:ux-copy`.
- Các bước:
  1. Skeleton có hiệu ứng nhẹ, tắt hiệu ứng khi người dùng bật `prefers-reduced-motion`.
  2. Trending: skeleton 4 thẻ khi tải; lỗi mạng thì hiện ErrorState có nút "Thử lại".
  3. Danh sách chuyến đi rỗng: EmptyState có hai nút "Hỏi trợ lý AI" và "Tạo chuyến đi".
  4. Chat: tin nhắn lỗi có nút "Gửi lại" (gọi lại `sendChatMessage` với nội dung cũ).
  5. Bản đồ lazy-load: fallback là khung skeleton đúng chiều cao, không nhảy layout.
- Xong khi: chặn `/api/trending-spots` trong Playwright thì thấy ErrorState và nút thử lại hoạt động; xóa hết trip thì thấy EmptyState; chặn `/api/chat` thì thấy nút "Gửi lại".

### Task E: Mở rộng dữ liệu địa điểm đã xác minh

Mục tiêu: hiện chỉ có 21 địa điểm ở 6 thành phố. Thêm khoảng 8 địa điểm cho mỗi thành phố sau: Huế, Nha Trang, Sa Pa, Ninh Bình, Hạ Long, Quy Nhơn, Cần Thơ, và bổ sung cho Hà Nội, TP. Hồ Chí Minh. Đây là nguồn tọa độ "verified" cho bản đồ và gợi ý AI, nên càng nhiều càng ít phải đoán.

- Được sửa: `src/data/placesData.ts`, tạo mới `docs/data-sources.md`, `tests/places-data.test.ts` (mới).
- Cấm sửa: mọi file khác.
- Các bước:
  1. Mỗi địa điểm cần tên chính xác, địa chỉ, thành phố, loại, tọa độ, khoảng giá, món/hoạt động gợi ý. Tọa độ phải lấy từ nguồn kiểm chứng được (OpenStreetMap/Nominatim, Wikipedia hoặc trang chính thức) và ghi nguồn cho từng điểm trong `docs/data-sources.md`. Không chắc thì không thêm.
  2. `rating: 0`, `user_ratings_total: 0`. Không ghi số lượt xem, lượt thích. `badge_label` chỉ mô tả bằng chữ, không emoji.
  3. `photo_url`: chỉ dùng ảnh có giấy phép tự do (Wikimedia Commons) và ghi tác giả, giấy phép trong `docs/data-sources.md`; không có thì để chuỗi rỗng và giao diện hiện placeholder.
  4. Id theo mẫu sẵn có (tiền tố thành phố + tên viết liền không dấu), không trùng.
  5. Test: mọi điểm nằm trong bbox Việt Nam, không trùng id, không có chữ số trong `badge_label`, `rating === 0`, mỗi thành phố mục tiêu có ít nhất 6 điểm.
- Xong khi: test pass; gợi ý ở Trình thiết kế cho các thành phố mới trả đủ 4 điểm "verified" khi không có key Gemini; bản đồ Khám phá hiện các điểm mới.

### Task F: Test cho giao diện

Mục tiêu: hiện 94 test gần như toàn bộ cho server và hàm thuần. Thêm test render cho các luồng chính.

- Được sửa: tạo mới `tests/components/*.test.tsx`, `tests/setup-dom.ts`, `vite.config.ts` (chỉ phần `test`).
- Cấm sửa: mọi file trong `src/` và `server/`. Thấy lỗi thì ghi vào báo cáo, không sửa.
- Skill: `engineering:testing-strategy` (đọc trước khi viết).
- Các bước:
  1. Dùng jsdom và Testing Library (đã cài). Bật jsdom theo từng file bằng chú thích `// @vitest-environment jsdom` để test server vẫn chạy trên môi trường node.
  2. Mock `fetch` và `localStorage`; mock `react-leaflet` bằng component rỗng (jsdom không vẽ được bản đồ).
  3. Viết test cho: danh sách chuyến đi (rỗng, có dữ liệu, xóa); trang chi tiết (id không tồn tại, đổi ngày); Trình thiết kế (đặt ngày bắt đầu, thêm gợi ý chèn đúng giờ, sửa chi phí); Settings (xuất, nhập file trùng); chat (gửi tin, nhãn "Lịch trình mẫu", nút cuộc trò chuyện mới).
- Xong khi: thêm ít nhất 25 test, `npm run check` pass, tổng thời gian chạy test vẫn dưới 30 giây.

### Task G: Bộ đánh giá chất lượng lịch trình AI

Mục tiêu: đo chất lượng output của Gemini bằng số liệu thay vì cảm tính. Đây là phần thể hiện kỹ năng AI/ML rõ nhất trong portfolio.

- Được sửa: tạo mới `scripts/eval/*`, `docs/eval-report.md`, `tests/eval.test.ts`; thêm script `"eval": "tsx scripts/eval/run.ts"` vào `package.json` là ngoại lệ duy nhất được phép (ghi rõ trong báo cáo để người điều phối gộp).
- Cấm sửa: mọi file trong `src/` và `server/`.
- Các bước:
  1. Bộ prompt cố định khoảng 20 câu trong `scripts/eval/prompts.json`: đủ các thành phố, độ dài 1 đến 5 ngày, ngân sách thấp/cao, vài yêu cầu sửa lịch trình, vài câu không liên quan tới lịch trình.
  2. Gọi thẳng các hàm route và hậu xử lý đang có (`postProcessItinerary`, `generateJson` qua route `/api/chat` dựng bằng `createApp()`), không viết lại logic.
  3. Chỉ số cho mỗi câu: JSON hợp lệ, đúng số ngày, mỗi ngày có 3 đến 4 điểm, tỉ lệ điểm có tọa độ verified/ai_estimate/không có, tỉ lệ tọa độ AI nằm đúng thành phố (khoảng cách tới tâm thành phố dưới 40 km), tổng chi phí so với ngân sách, có số liệu bịa trong nhãn hay không, phân loại ý định đúng hay sai, độ trễ.
  4. Tôn trọng quota free: tối đa 25 lời gọi mỗi lần chạy, nghỉ 5 giây giữa các lời gọi, dừng hẳn khi gặp `RATE_LIMITED`. Không có key thì chạy chế độ `--dry` với Gemini giả để kiểm tra pipeline.
  5. Xuất kết quả ra `scripts/eval/results/<ngày>.json` và cập nhật bảng tổng hợp trong `docs/eval-report.md` (giải thích từng chỉ số bằng văn thường).
  6. Test: chạy chế độ `--dry` với client Gemini giả (`__setGeminiClientForTests`) và kiểm tra các hàm tính chỉ số.
- Xong khi: `npm run eval -- --dry` chạy được và test pass. Lần chạy thật với key do người dùng tự chạy trên máy (sandbox không gọi được Gemini).

---

## Đợt 2: sau khi gộp xong Đợt 1 (tuần tự)

### Task H: Rà soát accessibility và thiết kế (một agent, chạy sau cùng vì đụng nhiều file)

- Skill: `design:design-critique` (chụp màn hình mọi trang rồi phê bình trước), sau đó `design:accessibility-review`.
- Được sửa: mọi file trong `src/components`, `src/pages`, `src/index.css`. Không sửa logic, chỉ sửa giao diện, nhãn và thuộc tính truy cập.
- Việc chính: độ tương phản chữ trắng trên gradient cam (đạt WCAG AA 4.5:1 cho chữ thường), vùng bấm tối thiểu 44x44px, `aria-label` cho mọi nút chỉ có icon, thứ tự focus và viền focus nhìn thấy được, `alt` cho ảnh, ô chat có `label`.
- Xong khi: không còn lỗi mức nghiêm trọng trong báo cáo accessibility; chụp lại màn hình trước và sau để so sánh.

### Task I: Tài liệu cho portfolio

- Skill: `engineering:architecture` (viết ADR), `engineering:documentation`.
- Được sửa: `README.md`, tạo mới `docs/adr/*.md`, `docs/screenshots/*` (ảnh chụp từ bản deploy thật).
- Việc chính:
  1. Bốn ADR ngắn: lưu trữ bằng localStorage thay vì database; Leaflet + OSM thay vì Google Maps; chỉ dùng Gemini free và cách giữ chi phí bằng 0 (rate limit, cache, fallback trung thực); thứ tự ưu tiên nguồn tọa độ.
  2. README viết cho người ngoài: app làm gì (kèm link bản deploy và 3 đến 4 ảnh chụp), kiến trúc (sơ đồ đơn giản), cách AI được dùng và giới hạn, kết quả của bộ đánh giá ở Task G, cách chạy và deploy.
- Xong khi: người chưa biết dự án đọc README trong 3 phút hiểu được app làm gì và vì sao các lựa chọn kỹ thuật như vậy.

### Gộp và deploy lần cuối (người điều phối)

1. Gộp lần lượt từng nhánh vào `wanderai-v2`, sau mỗi lần gộp chạy `npm run check`.
2. Chạy `engineering:code-review` trên phần thay đổi so với commit gốc của Đợt 0.
3. Smoke test toàn app, cập nhật `PLAN.md`, push. Render tự deploy lại.
4. Khi bản deploy ổn, mở pull request gộp `wanderai-v2` vào `main`.

---

## Bảng phân chia file (để kiểm tra không giẫm chân nhau)

| File | Task được sửa |
|---|---|
| `src/components/ItineraryBuilderView.tsx` | A |
| `src/components/map/PlacesMap.tsx`, `mapUtils.ts` | B |
| `src/pages/PlacePage.tsx`, `src/routes.tsx`, `src/App.tsx` (thêm route) | C |
| `src/components/ExploreView.tsx` (khối carousel map) | C |
| `src/components/{TrendingView,ItineraryListView,AIAssistantView}.tsx`, `src/pages/TripDetailPage.tsx` | D |
| `src/components/ui/*` | D |
| `src/data/placesData.ts`, `docs/data-sources.md` | E |
| `tests/components/*`, `vite.config.ts` (phần test) | F |
| `scripts/eval/*`, `docs/eval-report.md`, `package.json` (chỉ script `eval`) | G |
| `src/lib/uiFormat.ts` | A (chỉ thêm hàm) |
| `src/index.css` | B (chỉ thêm style cụm) |
| Mọi file giao diện | H (Đợt 2, chạy một mình) |
| `README.md`, `docs/adr/*` | I (Đợt 2) |
