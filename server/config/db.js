import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(path.join(__dirname, "..", "db.sqlite"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id          TEXT PRIMARY KEY,
    slot        TEXT NOT NULL,
    category    TEXT CHECK(category IN ('brands','filmmaking','commercial','fashion','events')),
    title       TEXT,
    alt_text    TEXT NOT NULL,
    url         TEXT NOT NULL,
    file_path   TEXT,
    width       INTEGER DEFAULT 0,
    height      INTEGER DEFAULT 0,
    sort_order  INTEGER DEFAULT 0,
    published   INTEGER DEFAULT 1,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS videos (
    id                TEXT PRIMARY KEY,
    slot              TEXT NOT NULL DEFAULT 'scroll_scrub',
    url               TEXT NOT NULL,
    file_path         TEXT,
    duration_seconds  REAL DEFAULT 0,
    fps               REAL DEFAULT 0,
    resolution_width  INTEGER DEFAULT 0,
    resolution_height INTEGER DEFAULT 0,
    published         INTEGER DEFAULT 0,
    is_staged         INTEGER DEFAULT 1,
    uploaded_at       TEXT DEFAULT (datetime('now'))
  );
`);

// Add r2_key column if it doesn't exist yet (idempotent migration)
try { db.exec("ALTER TABLE photos ADD COLUMN r2_key TEXT"); } catch (_) {}
try { db.exec("ALTER TABLE videos ADD COLUMN r2_key TEXT"); } catch (_) {}

const photosSchema = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'photos'")
  .get()?.sql || "";

if (photosSchema.includes("'events'") && !photosSchema.includes("'commercial'")) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    ALTER TABLE photos RENAME TO photos_legacy;

    CREATE TABLE photos (
      id          TEXT PRIMARY KEY,
      slot        TEXT NOT NULL,
      category    TEXT CHECK(category IN ('brands','filmmaking','commercial','fashion','events')),
      title       TEXT,
      alt_text    TEXT NOT NULL,
      url         TEXT NOT NULL,
      file_path   TEXT,
      width       INTEGER DEFAULT 0,
      height      INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0,
      published   INTEGER DEFAULT 1,
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    INSERT INTO photos (
      id, slot, category, title, alt_text, url, file_path, width, height, sort_order, published, uploaded_at
    )
    SELECT
      id, slot, category, title, alt_text, url, file_path, width, height, sort_order, published, uploaded_at
    FROM photos_legacy;

    DROP TABLE photos_legacy;
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

export default db;
