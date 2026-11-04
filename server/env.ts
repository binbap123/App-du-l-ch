import dotenv from "dotenv";

// Phải được import ĐẦU TIÊN trong server/index.ts (các module khác đọc env lúc load).
dotenv.config({ path: [".env.local", ".env"], quiet: true });
