# WanderAI: hướng dẫn cho Claude

Web app lập lịch trình du lịch Việt Nam. Giao diện tiếng Việt. Nhánh làm việc: `wanderai-v2` (không push thẳng lên `main`). Đọc `PLAN.md` để biết trạng thái, `docs/AGENT_TASKS.md` để biết việc tiếp theo.

## Stack

- Frontend: React 19, Vite, Tailwind 4, React Router, Leaflet + OpenStreetMap.
- Backend: Express trong `server/` (`app.ts` tạo app, `index.ts` khởi động, `lib/`, `routes/`, `schemas/`, `prompts/`).
- AI: Gemini qua `@google/genai`. Mọi lời gọi đi qua `generateJson()` trong `server/lib/gemini.ts`. Model đọc từ `GEMINI_MODEL`.
- Kiểu dữ liệu dùng chung: `src/types.ts` (hợp đồng chung, chỉ người điều phối sửa).
- Frontend gọi API bằng `fetchJson()` trong `src/lib/api.ts`. Chuyến đi lưu bằng `src/lib/tripStore.ts` (localStorage).

## Lệnh

- `npm run dev`: chạy dev tại http://localhost:3000
- `npm run check`: typecheck + test + build. Phải pass trước mỗi commit.
- `npm run build && npm start`: chạy bản production.

## Quyết định đã chốt (không tự ý đổi)

- Lưu trữ bằng localStorage, server không giữ dữ liệu người dùng.
- Deploy miễn phí trên Render (`render.yaml`).
- Bản đồ dùng Leaflet + OSM, không dùng API key cho bản đồ.
- AI chỉ dùng Gemini free tier.
- SerpApi chỉ gọi khi người dùng bấm tìm, có cache, autocomplete tắt mặc định.

## Quy tắc

1. Không bịa số liệu: không hiển thị lượt xem, lượt thích, rating hay số review không có nguồn. Nhãn chỉ mô tả bằng chữ.
2. Fallback trung thực: dữ liệu mẫu phải gắn `source: "sample"` và nói rõ với người dùng.
3. API gọi ra ngoài (Gemini, SerpApi, Nominatim) phải có rate limit, timeout, cache. Mục tiêu chi phí bằng 0.
4. Không hardcode API key. Key đi qua biến môi trường (`.env.local`, mẫu trong `.env.example`).
5. Nguồn tọa độ ưu tiên: dữ liệu đã xác minh (`src/data/placesData.ts`), rồi Nominatim, rồi AI ước lượng. Giao diện phải phân biệt tọa độ ước lượng.
6. Truy cập localStorage luôn bọc try/catch.
7. Test không gọi mạng thật: mock `fetch` hoặc dùng `__setGeminiClientForTests`.
8. Commit message tiếng Anh.

## Khi chia agent

- Chốt hợp đồng chung trước, rồi mới chia. Mỗi agent một worktree, chỉ sửa đúng file được giao.
- Agent phải kiểm tra `git log -1` lúc bắt đầu (worktree đôi khi bị tách từ `main`) và reset về commit gốc nếu lệch.
- Dependency mới phải được người điều phối cài trước, agent không sửa `package.json`.
- Mỗi lời giao việc có mục "Xong khi" kiểm chứng được, kèm `npm run check` và smoke test Playwright.
- Dặn agent nạp skill phù hợp: giao diện dùng `frontend-design`, `design:ux-copy`, `design:accessibility-review`; review dùng `engineering:code-review`.

## Báo cáo cho người dùng

Viết tiếng Việt bằng văn thường như người viết, không dùng icon hay emoji. Nói kết quả trước, rồi việc còn tồn đọng và lý do. Nói rõ cái gì chưa kiểm tra được.
