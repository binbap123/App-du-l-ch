# WanderAI

Ứng dụng lên lịch trình du lịch Việt Nam bằng AI (React + Vite + Tailwind, Express, Gemini).

## Chạy trên máy

Cần Node.js 20+.

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# điền GEMINI_API_KEY vào .env.local
npm run dev                  # http://localhost:3000
```

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Server dev (Express + Vite middleware) |
| `npm run check` | Typecheck + test + build — chạy trước mỗi lần commit |
| `npm run build` | Build client vào `dist/` và server vào `dist/server.cjs` |
| `npm start` | Chạy bản build |

## Cấu trúc

```
server/
  index.ts        khởi động server (dev: Vite middleware, prod: phục vụ dist/)
  app.ts          tạo Express app, mount routes
  env.ts          nạp .env.local / .env
  lib/            gemini, cache, rate limit, validate, http helpers
  routes/         chat, itinerary, suggest, places, geocode, trending
  schemas/        responseSchema Gemini dùng chung
  prompts/        system prompt
src/
  components/     các màn hình
  lib/api.ts      fetchJson() có timeout, dùng cho mọi lời gọi /api
  routes.tsx      URL của từng màn hình
  types.ts        kiểu dữ liệu dùng chung (hợp đồng FE ↔ BE)
tests/            vitest
```

Kế hoạch phát triển: xem [PLAN.md](PLAN.md).

## Deploy miễn phí lên Render

Repo có sẵn `render.yaml`.

1. Đăng nhập [render.com](https://render.com) bằng GitHub (gói free không cần thẻ).
2. **New → Blueprint**, chọn repo này. Render đọc `render.yaml` và tạo service `wanderai`.
3. Khi được hỏi, điền `GEMINI_API_KEY` (lấy miễn phí ở [AI Studio](https://aistudio.google.com/apikey)). `SERPAPI_API_KEY` có thể bỏ trống.
4. Chờ build xong, mở `https://<tên-service>.onrender.com/api/health` → phải thấy `"status":"ok"` và `"geminiAvailable":true`.

Lưu ý gói free:
- App **ngủ sau 15 phút** không có truy cập; lần mở đầu tiên sau đó mất khoảng 1 phút.
- Ổ đĩa tạm thời: dữ liệu chuyến đi được lưu trên trình duyệt (localStorage), nên server khởi động lại không làm mất trip của người dùng.
- Băng thông free có giới hạn theo tháng; vượt mức khi chưa gắn thẻ thì service bị tạm dừng tới tháng sau (không bị tính tiền).
- Không gắn billing cho project Gemini: hết quota free thì AI trả lịch trình mẫu, không tính tiền.
