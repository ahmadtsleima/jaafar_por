import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import db from "../config/db.js";
import { deleteUploadFile, mediaUrlFromRow, saveUploadFile } from "../config/uploads.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const videoUpload = upload.fields([
  { name: "file",  maxCount: 1  },
  { name: "files", maxCount: 30 },
]);

// --- Local upload URL helpers ------------------------------------------------

const enrichUrl = (row) => mediaUrlFromRow(row);
const enrichAll = (rows) => rows.map(enrichUrl);

// --- Public ------------------------------------------------------------------

// GET /api/videos?slot=scroll_scrub
router.get("/videos", async (req, res) => {
  const slot = req.query.slot || "scroll_scrub";
  const visibilityClause = String(slot).startsWith("motion_") ? "" : " AND published = 1";
  res.set("Cache-Control", "no-store");

  if (req.query.all === "1") {
    const rows = db.prepare(
      `SELECT id, slot, url, r2_key, duration_seconds, fps, resolution_width, resolution_height, uploaded_at FROM videos WHERE slot = ?${visibilityClause} ORDER BY uploaded_at DESC`
    ).all(slot);
    return res.json(enrichAll(rows));
  }

  const row = db.prepare(
    `SELECT id, slot, url, r2_key, duration_seconds, fps, resolution_width, resolution_height, uploaded_at FROM videos WHERE slot = ?${visibilityClause} ORDER BY uploaded_at DESC LIMIT 1`
  ).get(slot);
  return res.json(row ? enrichUrl(row) : null);
});

// --- Admin -------------------------------------------------------------------

// GET /api/admin/videos?slot=scroll_scrub
router.get("/admin/videos", requireAuth, async (req, res) => {
  const slot = req.query.slot || "scroll_scrub";
  const rows = db.prepare("SELECT * FROM videos WHERE slot = ? ORDER BY uploaded_at DESC").all(slot);
  return res.json(enrichAll(rows));
});

// POST /api/admin/videos  (multipart: file/files + slot)
router.post("/admin/videos", requireAuth, videoUpload, async (req, res) => {
  const slot = req.body.slot || "scroll_scrub";
  const files = [...(req.files?.files || []), ...(req.files?.file || [])];
  const isMotionSlot = String(slot).startsWith("motion_");

  if (req.body.vimeo_id) {
    const vimeoId = String(req.body.vimeo_id).match(/^\d+$/)?.[0];
    if (!vimeoId) return res.status(400).json({ error: "Invalid Vimeo ID" });

    const id = crypto.randomUUID();
    const url = `https://player.vimeo.com/video/${vimeoId}`;
    db.prepare(
      "INSERT INTO videos (id, slot, url, r2_key, published, is_staged) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, slot, url, `vimeo:${vimeoId}`, isMotionSlot ? 1 : 0, isMotionSlot ? 0 : 1);

    const video = db.prepare("SELECT * FROM videos WHERE id = ?").get(id);
    return res.status(201).json({ video, videos: [video], validations: null });
  }

  if (files.length === 0) return res.status(400).json({ error: "No file provided" });

  const videos = await Promise.all(files.map(async (file) => {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    const saved = await saveUploadFile("videos", id, ext, ".mp4", file.buffer);

    db.prepare(
      "INSERT INTO videos (id, slot, url, file_path, r2_key, published, is_staged) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, slot, saved.url, saved.filePath, null, isMotionSlot ? 1 : 0, isMotionSlot ? 0 : 1);

    return db.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  }));

  const firstExt = path.extname(files[0].originalname).toLowerCase().slice(1);
  const validations = {
    format:     { pass: ["mp4", "webm", "mov"].includes(firstExt), label: "MP4, WebM, or MOV format" },
    duration:   { pass: true, label: "Duration (requires ffprobe to verify)" },
    resolution: { pass: true, label: "Resolution (requires ffprobe to verify)" },
  };

  const enrichedVideos = enrichAll(videos);
  return res.status(201).json({ video: enrichedVideos[0], videos: enrichedVideos, validations });
});

// PATCH /api/admin/videos/:id/publish  -- swap staged -> live
router.patch("/admin/videos/:id/publish", requireAuth, async (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT slot FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Video not found" });

  db.transaction(() => {
    if (!String(row.slot).startsWith("motion_")) {
      db.prepare("UPDATE videos SET published = 0 WHERE slot = ? AND published = 1").run(row.slot);
    }
    db.prepare("UPDATE videos SET published = 1, is_staged = 0 WHERE id = ?").run(id);
  })();

  const updated = db.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  return res.json(enrichUrl(updated));
});

// DELETE /api/admin/videos/:id
router.delete("/admin/videos/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT file_path, r2_key FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Video not found" });

  db.prepare("DELETE FROM videos WHERE id = ?").run(id);

  try {
    if (!String(row.r2_key || "").startsWith("vimeo:")) {
      await deleteUploadFile(row.file_path || row.r2_key);
    }
  } catch (err) {
    console.error("[uploads] delete video error:", err?.message);
  }

  return res.json({ success: true });
});

export default router;
