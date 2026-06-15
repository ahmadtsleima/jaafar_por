import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import authRouter from "./routes/auth.js";
import contentRouter from "./routes/content.js";
import photosRouter from "./routes/photos.js";
import videosRouter from "./routes/videos.js";
import { UPLOADS_DIR } from "./config/uploads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR, {
  immutable: true,
  maxAge: "30d",
}));

app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

app.use("/api", authRouter);
app.use("/api", contentRouter);
app.use("/api", photosRouter);
app.use("/api", videosRouter);

// Serve the Vite production build
const distDir = path.join(__dirname, "..", "dist");
app.use(express.static(distDir));
// SPA fallback — always return index.html for non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err?.message || "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[server] listening on http://0.0.0.0:${PORT}`);
});
