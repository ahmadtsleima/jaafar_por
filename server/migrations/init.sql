-- Run this against your Supabase / PostgreSQL database once

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Photos ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS photos (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slot                 VARCHAR(60) NOT NULL,
  category             VARCHAR(20) CHECK (category IN ('brands', 'filmmaking', 'commercial', 'fashion', 'events')),
  title                VARCHAR(200),
  alt_text             VARCHAR(500) NOT NULL,
  url                  TEXT        NOT NULL,
  cloudinary_public_id TEXT,
  width                INTEGER,
  height               INTEGER,
  sort_order           INTEGER     DEFAULT 0,
  published            BOOLEAN     DEFAULT true,
  uploaded_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_slot      ON photos (slot);
CREATE INDEX IF NOT EXISTS idx_photos_category  ON photos (category);
CREATE INDEX IF NOT EXISTS idx_photos_published ON photos (published);

-- ─── Videos ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS videos (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slot                 VARCHAR(60) NOT NULL DEFAULT 'scroll_scrub',
  url                  TEXT        NOT NULL,
  cloudinary_public_id TEXT,
  duration_seconds     NUMERIC(8, 3),
  fps                  INTEGER,
  resolution_width     INTEGER,
  resolution_height    INTEGER,
  published            BOOLEAN     DEFAULT false,
  is_staged            BOOLEAN     DEFAULT false,
  uploaded_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_slot      ON videos (slot);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos (published);
