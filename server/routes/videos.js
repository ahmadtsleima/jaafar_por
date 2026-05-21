import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "../middleware/auth.js";
import db from "../config/db.js";
import { r2, R2_BUCKET, SIGNED_URL_EXPIRES } from "../config/r2.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const videoUpload = upload.fields([
  { name: "file",  maxCount: 1  },
  { name: "files", maxCount: 30 },
]);

// --- Presigned URL helpers ---------------------------------------------------

async function presign(key) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: SIGNED_URL_EXPIRES });
}

async function enrichUrl(row) {
  if (!row) return row;
  if (row.r2_key) row.url = await presign(row.r2_key);
  return row;
}

async function enrichAll(rows) {
  return Promise.all(rows.map(enrichUrl));
}

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
    return res.json(await enrichAll(rows));
  }

  const row = db.prepare(
    `SELECT id, slot, url, r2_key, duration_seconds, fps, resolution_width, resolution_height, uploaded_at FROM videos WHERE slot = ?${visibilityClause} ORDER BY uploaded_at DESC LIMIT 1`
  ).get(slot);
  return res.json(row ? await enrichUrl(row) : null);
});

// --- Admin -------------------------------------------------------------------

// GET /api/admin/videos?slot=scroll_scrub
router.get("/admin/videos", requireAuth, async (req, res) => {
  const slot = req.query.slot || "scroll_scrub";
  const rows = db.prepare("SELECT * FROM videos WHERE slot = ? ORDER BY uploaded_at DESC").all(slot);
  return res.json(await enrichAll(rows));
});

// POST /api/admin/videos  (multipart: file/files + slot)
router.post("/admin/videos", requireAuth, videoUpload, async (req, res) => {
  const slot = req.body.slot || "scroll_scrub";
  const files = [...(req.files?.files || []), ...(req.files?.file || [])];
  if (files.length === 0) return res.status(400).json({ error: "No file provided" });
  const isMotionSlot = String(slot).startsWith("motion_");

  const videos = await Promise.all(files.map(async (file) => {
    const id    = crypto.randomUUID();
    const ext   = path.extname(file.originalname).toLowerCase() || ".mp4";
    const r2Key = `videos/${id}${ext}`;

    // Upload buffer directly to Cloudflare R2
    await r2.send(new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         r2Key,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }));

    db.prepare(
      "INSERT INTO videos (id, slot, url, r2_key, published, is_staged) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, slot, r2Key, r2Key, isMotionSlot ? 1 : 0, isMotionSlot ? 0 : 1);

    return db.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  }));

  const firstExt = path.extname(files[0].originalname).toLowerCase().slice(1);
  const validations = {
    format:     { pass: ["mp4", "webm"].includes(firstExt), label: "MP4 or WebM format" },
    duration:   { pass: true, label: "Duration (requires ffprobe to verify)" },
    resolution: { pass: true, label: "Resolution (requires ffprobe to verify)" },
  };

  const enrichedVideos = await enrichAll(videos);
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
  return res.json(await enrichUrl(updated));
});

// DELETE /api/admin/videos/:id
router.delete("/admin/videos/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT r2_key FROM videos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Video not found" });

  db.prepare("DELETE FROM videos WHERE id = ?").run(id);

  if (row.r2_key) {
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: row.r2_key }));
    } catch (err) {
      console.error("[R2] delete video error:", err?.message);
    }
  }

  return res.json({ success: true });
});

export default router;