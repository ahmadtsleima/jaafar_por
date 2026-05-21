import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import photosRouter from "./routes/photos.js";
import videosRouter from "./routes/videos.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

app.use("/api", authRouter);
app.use("/api", photosRouter);
app.use("/api", videosRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err?.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
