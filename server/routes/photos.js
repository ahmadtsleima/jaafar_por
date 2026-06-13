import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import sizeOf from "image-size";
import { requireAuth } from "../middleware/auth.js";
import db from "../config/db.js";
import { deleteUploadFile, mediaUrlFromRow, saveUploadFile } from "../config/uploads.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// --- Local upload URL helpers ------------------------------------------------

const enrichUrl = (row) => mediaUrlFromRow(row);
const enrichAll = (rows) => rows.map(enrichUrl);

// --- Public ------------------------------------------------------------------

// GET /api/photos?category=brands&slot=gallery_featured
router.get("/photos", async (req, res) => {
  const { category, slot } = req.query;
  let sql = "SELECT id, slot, category, title, alt_text, url, r2_key, width, height, sort_order FROM photos WHERE published = 1";
  const params = [];
  if (category) { sql += " AND category = ?"; params.push(category); }
  if (slot)     { sql += " AND slot = ?";     params.push(slot); }
  sql += " ORDER BY sort_order ASC, uploaded_at DESC";
  return res.json(enrichAll(db.prepare(sql).all(...params)));
});

// --- Admin -------------------------------------------------------------------

// GET /api/admin/photos?category=all|brands|filmmaking|commercial|fashion|unpublished
router.get("/admin/photos", requireAuth, async (req, res) => {
  const { category } = req.query;
  let sql = "SELECT * FROM photos";
  const params = [];
  if (category && category !== "all") {
    if (category === "unpublished") {
      sql += " WHERE published = 0";
    } else {
      sql += " WHERE category = ?";
      params.push(category);
    }
  }
  sql += " ORDER BY sort_order ASC, uploaded_at DESC";
  return res.json(enrichAll(db.prepare(sql).all(...params)));
});

// GET /api/admin/stats
router.get("/admin/stats", requireAuth, (req, res) => {
  const total      = db.prepare("SELECT COUNT(*) AS n FROM photos").get().n;
  const published  = db.prepare("SELECT COUNT(*) AS n FROM photos WHERE published = 1").get().n;
  const cats       = db.prepare("SELECT category, COUNT(*) AS n FROM photos WHERE published = 1 GROUP BY category").all();
  const lastUpload = db.prepare("SELECT MAX(uploaded_at) AS last FROM photos").get().last ?? null;
  const catMap     = Object.fromEntries(cats.map((r) => [r.category, r.n]));
  return res.json({
    total, published,
    brands:     catMap.brands     ?? 0,
    filmmaking: catMap.filmmaking ?? 0,
    commercial: catMap.commercial ?? 0,
    fashion:    catMap.fashion    ?? 0,
    events:     catMap.events     ?? 0,
    lastUpload,
  });
});

// POST /api/admin/photos  (multipart: file + fields)
router.post("/admin/photos", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const { slot, category, title, alt_text, sort_order, published } = req.body;
  if (!alt_text) return res.status(400).json({ error: "alt_text is required" });
  if (!slot)     return res.status(400).json({ error: "slot is required" });

  const id  = crypto.randomUUID();
  const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
  const saved = await saveUploadFile("photos", id, ext, ".jpg", req.file.buffer);

  let width = 0, height = 0;
  try {
    const dims = sizeOf(req.file.buffer);
    width  = dims.width  ?? 0;
    height = dims.height ?? 0;
  } catch (_) { /* non-fatal */ }

  db.prepare(
    `INSERT INTO photos (id, slot, category, title, alt_text, url, file_path, r2_key, width, height, sort_order, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, slot, category || null, title || null, alt_text,
    saved.url, saved.filePath, null, width, height,
    parseInt(sort_order) || 0, published !== "false" ? 1 : 0
  );

  const row = db.prepare("SELECT * FROM photos WHERE id = ?").get(id);
  return res.status(201).json(enrichUrl(row));
});

// PATCH /api/admin/photos/reorder  -- must be before /:id
router.patch("/admin/photos/reorder", requireAuth, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items array required" });

  const stmt = db.prepare("UPDATE photos SET sort_order = ? WHERE id = ?");
  db.transaction((rows) => { for (const r of rows) stmt.run(r.sort_order, r.id); })(items);
  return res.json({ success: true });
});

// PATCH /api/admin/photos/:id
router.patch("/admin/photos/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const allowed = ["slot", "category", "title", "alt_text", "sort_order", "published"];
  const sets = [], params = [];

  for (const key of allowed) {
    if (key in req.body) {
      sets.push(`${key} = ?`);
      params.push(key === "published" ? (req.body[key] ? 1 : 0)
                : key === "sort_order" ? parseInt(req.body[key])
                : req.body[key]);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });

  params.push(id);
  const info = db.prepare(`UPDATE photos SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  if (info.changes === 0) return res.status(404).json({ error: "Photo not found" });
  const row = db.prepare("SELECT * FROM photos WHERE id = ?").get(id);
  return res.json(enrichUrl(row));
});

// DELETE /api/admin/photos/:id
router.delete("/admin/photos/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT file_path, r2_key FROM photos WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Photo not found" });

  db.prepare("DELETE FROM photos WHERE id = ?").run(id);

  try {
    await deleteUploadFile(row.file_path || row.r2_key);
  } catch (err) {
    console.error("[uploads] delete photo error:", err?.message);
  }

  return res.json({ success: true, id });
});

export default router;
