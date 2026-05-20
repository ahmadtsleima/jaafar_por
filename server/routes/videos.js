import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import db from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const videoUpload = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 30 },
]);

// â”€â”€â”€ Public â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/videos?slot=scroll_scrub
router.get("/videos", (req, res) => {
  const slot = req.query.slot || "scroll_scrub";
  const visibilityClause = String(slot).startsWith("motion_") ? "" : " AND published = 1";
  res.set("Cache-Control", "no-store");

  if (req.query.all === "1") {
    const rows = db.prepare(
      `SELECT id, slot, url, duration_seconds, fps, resolution_width, resolution_height, uploaded_at FROM videos WHERE slot = ?${visibilityClause} ORDER BY uploaded_at DESC`
    ).all(slot);
    return res.json(rows);
  }

  const row = db.prepare(
    `SELECT id, slot, url, duration_seconds, fps, resolution_width, resolution_height, uploaded_at FROM videos WHERE slot = ?${visibilityClause} ORDER BY uploaded_at DESC LIMIT 1`
  ).get(slot);
  return res.json(row ?? null);
});

// â”€â”€â”€ Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/admin/videos?slot=scroll_scrub
router.get("/admin/videos", requireAuth, (req, res) => {
  const slot = req.query.slot || "scroll_scrub";
  return res.json(db.prepare("SELECT * FROM videos WHERE slot = ? ORDER BY uploaded_at DESC").all(slot));
});

// POST /api/admin/videos  (multipart: file/files + slot)
router.post("/admin/videos", requireAuth, videoUpload, (req, res) => {
  const slot = req.body.slot || "scroll_scrub";
  const files = [...(req.files?.files || []), ...(req.files?.file || [])];
  if (files.length === 0) return res.status(400).json({ error: "No file provided" });
  const isMotionSlot = String(slot).startsWith("motion_");

  const videos = files.map((file) => {
    const id  = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    const filename = `${id}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, file.buffer);

    db.prepare(
      "INSERT INTO videos (id, slot, url, file_path, published, is_staged) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, slot, `/uploads/${filename}`, filePath, isMotionSlot ? 1 : 0, isMotionSlot ? 0 : 1);

    return db.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  });

  const firstExt = path.extname(files[0].originalname).toLowerCase().slice(1);
  const validations = {
    format:     { pass: ["mp4", "webm"].includes(firstExt), label: "MP4 or WebM format" },
    duration:   { pass: true, label: "Duration (requires ffprobe to verify)" },
    resolution: { pass: true, label: "Resolution (requires ffprobe to verify)" },
  };

  return res.status(201).json({ video: videos[0], videos, validations });
});

// PATCH /api/admin/videos/:id/publish  â€” swap staged â†’ live
router.patch("/admin/videos/:id/publish", requireAuth, (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT slot FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Video not found" });

  db.transaction(() => {
    if (!String(row.slot).startsWith("motion_")) {
      db.prepare("UPDATE videos SET published = 0 WHERE slot = ? AND published = 1").run(row.slot);
    }
    db.prepare("UPDATE videos SET published = 1, is_staged = 0 WHERE id = ?").run(id);
  })();

  return res.json(db.prepare("SELECT * FROM videos WHERE id = ?").get(id));
});

// DELETE /api/admin/videos/:id
router.delete("/admin/videos/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT file_path FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Video not found" });

  db.prepare("DELETE FROM videos WHERE id = ?").run(id);
  if (row.file_path) fs.unlink(row.file_path, () => {});
  return res.json({ success: true });
});

export default router;
