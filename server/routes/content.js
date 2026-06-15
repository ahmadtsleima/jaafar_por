import { Router } from "express";
import { SITE_TEXT_DEFAULTS, SITE_TEXT_FIELDS } from "../../shared/siteText.js";
import { requireAuth } from "../middleware/auth.js";
import db from "../config/db.js";

const router = Router();

function readTextMap() {
  const rows = db.prepare("SELECT key, value FROM site_texts").all();
  return { ...SITE_TEXT_DEFAULTS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
}

router.get("/content", (_req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json(readTextMap());
});

router.get("/admin/content", requireAuth, (_req, res) => {
  const values = readTextMap();
  return res.json({
    fields: SITE_TEXT_FIELDS.map((field) => ({
      ...field,
      value: values[field.key] ?? field.value,
    })),
  });
});

router.patch("/admin/content", requireAuth, (req, res) => {
  const values = req.body?.values;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return res.status(400).json({ error: "values object required" });
  }

  const allowed = new Set(SITE_TEXT_FIELDS.map((field) => field.key));
  const upsert = db.prepare(`
    INSERT INTO site_texts (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  db.transaction((entries) => {
    for (const [key, value] of entries) {
      if (!allowed.has(key)) continue;
      upsert.run(key, String(value ?? ""));
    }
  })(Object.entries(values));

  return res.json({ success: true, values: readTextMap() });
});

export default router;
