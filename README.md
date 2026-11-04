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

## Deploy

Hướng dẫn deploy lên Render (miễn phí) sẽ được bổ sung ở Phase 3 của PLAN.md.
