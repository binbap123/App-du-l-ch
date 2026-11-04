import "./env.js";
import path from "path";
import express from "express";
import { createApp } from "./app.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
// Chạy bản build (dist/server.cjs) luôn là production — tránh phải set NODE_ENV (khó trên Windows).
const IS_PROD = process.env.NODE_ENV === "production" || (process.argv[1] || "").endsWith("server.cjs");

async function start() {
  const app = createApp();

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false, maxAge: "1h" }));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WanderAI server running at http://0.0.0.0:${PORT}`);
  });
}

start();
