import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

const DB_INIT_SQL = [
  `CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    slot TEXT NOT NULL,
    category TEXT,
    title TEXT,
    alt_text TEXT NOT NULL,
    url TEXT NOT NULL,
    r2_key TEXT,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    published INTEGER DEFAULT 1,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    slot TEXT NOT NULL DEFAULT 'scroll_scrub',
    url TEXT NOT NULL,
    r2_key TEXT,
    duration_seconds REAL DEFAULT 0,
    fps REAL DEFAULT 0,
    resolution_width INTEGER DEFAULT 0,
    resolution_height INTEGER DEFAULT 0,
    published INTEGER DEFAULT 0,
    is_staged INTEGER DEFAULT 1,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
];

let dbInitialized = false;

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS, ...headers },
  });
}

function textResponse(body, status = 200) {
  return new Response(body, { status, headers: CORS_HEADERS });
}

function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function initDatabase(db) {
  if (dbInitialized) return;
  for (const sql of DB_INIT_SQL) {
    await db.prepare(sql).run();
  }
  dbInitialized = true;
}

function getContentType(pathname) {
  const ext = pathname.split(".").pop().toLowerCase();
  return {
    html: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    ico: "image/x-icon",
    webmanifest: "application/manifest+json",
    map: "application/json",
    txt: "text/plain; charset=utf-8",
  }[ext] || "application/octet-stream";
}

async function serveStaticAsset(request, env, ctx) {
  const url = new URL(request.url);
  let pathname = url.pathname;
  const accept = request.headers.get("Accept") || "";
  const isHtmlRequest = accept.includes("text/html");

  if (!pathname.includes(".") && isHtmlRequest) {
    pathname = "/index.html";
  } else if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const assetKey = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  const asset = await env.__STATIC_CONTENT.get(assetKey, { type: "stream" });
  if (!asset) {
    if (isHtmlRequest) {
      const fallback = await env.__STATIC_CONTENT.get("index.html", { type: "stream" });
      if (fallback) {
        const headers = new Headers(CORS_HEADERS);
        headers.set("content-type", getContentType("/index.html"));
        return new Response(fallback, { status: 200, headers });
      }
    }
    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  }

  const headers = new Headers(CORS_HEADERS);
  headers.set("content-type", getContentType(pathname));
  return new Response(asset, { status: 200, headers });
}

function getToken(request) {
  const auth = request.headers.get("Authorization") || request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

function requireAuth(request, env) {
  const token = getToken(request);
  if (!token) return false;
  const secret = env.JWT_SECRET;
  if (!secret) return false;
  try {
    const payload = jwt.verify(token, secret);
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

function buildR2Url(key) {
  return key ? `/r2/${encodeURIComponent(key)}` : null;
}

function enrichRow(row) {
  if (!row) return row;
  return {
    ...row,
    url: row.r2_key ? buildR2Url(row.r2_key) : row.url,
  };
}

function buildPhotoRow(row) {
  if (!row) return row;
  return enrichRow(row);
}

function buildVideoRow(row) {
  if (!row) return row;
  return enrichRow(row);
}

async function queryPhotos(db, { category, slot, publishedOnly = true }) {
  let sql = `SELECT id, slot, category, title, alt_text, url, r2_key, width, height, sort_order, uploaded_at
    FROM photos WHERE 1 = 1`;
  const params = [];
  if (publishedOnly) {
    sql += ` AND published = 1`;
  }
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (slot) {
    sql += ` AND slot = ?`;
    params.push(slot);
  }
  sql += ` ORDER BY sort_order ASC, uploaded_at DESC`;
  const { results } = await db.prepare(sql).bind(...params).all();
  return results.map(buildPhotoRow);
}

async function queryVideos(db, { slot, all = false }) {
  const visibilityClause = slot && !String(slot).startsWith("motion_") ? " AND published = 1" : "";
  if (all) {
    const { results } = await db.prepare(
      `SELECT id, slot, url, r2_key, duration_seconds, fps, resolution_width, resolution_height, uploaded_at
       FROM videos WHERE slot = ?${visibilityClause} ORDER BY uploaded_at DESC`
    ).bind(slot).all();
    return results.map(buildVideoRow);
  }
  const { results } = await db.prepare(
    `SELECT id, slot, url, r2_key, duration_seconds, fps, resolution_width, resolution_height, uploaded_at
     FROM videos WHERE slot = ?${visibilityClause} ORDER BY uploaded_at DESC LIMIT 1`
  ).bind(slot).all();
  return results.map(buildVideoRow);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (method === "OPTIONS") return handleOptions();

    await initDatabase(env.DB);

    if (method === "GET" && pathname === "/api/health") {
      return jsonResponse({ status: "ok", ts: Date.now() });
    }

    if (method === "POST" && pathname === "/api/admin/login") {
      try {
        const payload = await request.json();
        const password = payload?.password;
        if (!password || typeof password !== "string") {
          return jsonResponse({ error: "Password required" }, 400);
        }

        const plainPassword = env.ADMIN_PASSWORD;
        const hash = env.ADMIN_PASSWORD_HASH;
        if (!plainPassword && !hash) {
          return jsonResponse({ error: "Server misconfigured — set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH" }, 500);
        }

        let valid = false;
        if (plainPassword) {
          valid = password === plainPassword;
        } else {
          valid = await bcrypt.compare(password, hash);
        }

        if (!valid) {
          return jsonResponse({ error: "Incorrect password" }, 401);
        }

        if (!env.JWT_SECRET) {
          return jsonResponse({ error: "Server misconfigured — set JWT_SECRET" }, 500);
        }

        const token = jwt.sign({ role: "admin" }, env.JWT_SECRET, { expiresIn: "7d" });
        return jsonResponse({ token });
      } catch (err) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    if (pathname === "/api/photos" && method === "GET") {
      const category = url.searchParams.get("category") || null;
      const slot = url.searchParams.get("slot") || null;
      return jsonResponse(await queryPhotos(env.DB, { category, slot, publishedOnly: true }));
    }

    if (pathname === "/api/admin/photos" && method === "GET") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const category = url.searchParams.get("category") || null;
      let sql = `SELECT id, slot, category, title, alt_text, url, r2_key, width, height, sort_order, published, uploaded_at FROM photos WHERE 1 = 1`;
      const params = [];
      if (category && category !== "all") {
        if (category === "unpublished") {
          sql += ` AND published = 0`;
        } else {
          sql += ` AND category = ?`;
          params.push(category);
        }
      }
      sql += ` ORDER BY sort_order ASC, uploaded_at DESC`;
      const { results } = await env.DB.prepare(sql).bind(...params).all();
      return jsonResponse(results.map(buildPhotoRow));
    }

    if (pathname === "/api/admin/stats" && method === "GET") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM photos`).first();
      const published = await env.DB.prepare(`SELECT COUNT(*) AS n FROM photos WHERE published = 1`).first();
      const cats = await env.DB.prepare(`SELECT category, COUNT(*) AS n FROM photos WHERE published = 1 GROUP BY category`).all();
      const last = await env.DB.prepare(`SELECT MAX(uploaded_at) AS last FROM photos`).first();
      const catMap = Object.fromEntries((cats.results || []).map((r) => [r.category, r.n]));
      return jsonResponse({
        total: total?.n || 0,
        published: published?.n || 0,
        brands: catMap.brands || 0,
        filmmaking: catMap.filmmaking || 0,
        commercial: catMap.commercial || 0,
        fashion: catMap.fashion || 0,
        events: catMap.events || 0,
        lastUpload: last?.last || null,
      });
    }

    if (pathname === "/api/admin/photos" && method === "POST") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const form = await request.formData();
      const file = form.get("file");
      if (!file) return jsonResponse({ error: "No file provided" }, 400);

      const slot = form.get("slot");
      const category = form.get("category");
      const title = form.get("title");
      const alt_text = form.get("alt_text");
      const sort_order = parseInt(form.get("sort_order")) || 0;
      const published = form.get("published") !== "false";

      if (!alt_text) return jsonResponse({ error: "alt_text is required" }, 400);
      if (!slot) return jsonResponse({ error: "slot is required" }, 400);

      const id = crypto.randomUUID();
      const ext = file.name?.split(".").pop() || "jpg";
      const r2Key = `photos/${id}.${ext}`;

      await env.R2_BUCKET.put(r2Key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      });

      await env.DB.prepare(
        `INSERT INTO photos (id, slot, category, title, alt_text, url, r2_key, width, height, sort_order, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(id, slot, category || null, title || null, alt_text, r2Key, r2Key, 0, 0, sort_order, published ? 1 : 0)
        .run();

      const row = await env.DB.prepare(`SELECT * FROM photos WHERE id = ?`).bind(id).first();
      return jsonResponse(buildPhotoRow(row), 201);
    }

    if (pathname === "/api/admin/photos/reorder" && method === "PATCH") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await request.json();
      const items = Array.isArray(body?.items) ? body.items : null;
      if (!items || items.length === 0) return jsonResponse({ error: "items array required" }, 400);
      const stmt = env.DB.prepare("UPDATE photos SET sort_order = ? WHERE id = ?");
      for (const item of items) {
        await stmt.bind(item.sort_order, item.id).run();
      }
      return jsonResponse({ success: true });
    }

    if (pathname.startsWith("/api/admin/photos/") && method === "PATCH") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const id = pathname.replace("/api/admin/photos/", "");
      const body = await request.json();
      const allowed = ["slot", "category", "title", "alt_text", "sort_order", "published"];
      const sets = [];
      const params = [];
      for (const key of allowed) {
        if (key in body) {
          const value = key === "published" ? (body[key] ? 1 : 0) : key === "sort_order" ? parseInt(body[key]) : body[key];
          sets.push(`${key} = ?`);
          params.push(value);
        }
      }
      if (sets.length === 0) return jsonResponse({ error: "No fields to update" }, 400);
      params.push(id);
      const result = await env.DB.prepare(`UPDATE photos SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
      if (!result.success) return jsonResponse({ error: "Photo not found" }, 404);
      const row = await env.DB.prepare(`SELECT * FROM photos WHERE id = ?`).bind(id).first();
      return jsonResponse(buildPhotoRow(row));
    }

    if (pathname.startsWith("/api/admin/photos/") && method === "DELETE") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const id = pathname.replace("/api/admin/photos/", "");
      const photo = await env.DB.prepare(`SELECT r2_key FROM photos WHERE id = ?`).bind(id).first();
      if (!photo) return jsonResponse({ error: "Photo not found" }, 404);
      await env.DB.prepare(`DELETE FROM photos WHERE id = ?`).bind(id).run();
      if (photo.r2_key) {
        await env.R2_BUCKET.delete(photo.r2_key);
      }
      return jsonResponse({ success: true, id });
    }

    if (pathname === "/api/videos" && method === "GET") {
      const slot = url.searchParams.get("slot") || "scroll_scrub";
      const all = url.searchParams.get("all") === "1";
      const rows = await queryVideos(env.DB, { slot, all });
      return jsonResponse(all ? rows : rows[0] || null);
    }

    if (pathname === "/api/admin/videos" && method === "GET") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const slot = url.searchParams.get("slot") || "scroll_scrub";
      const { results } = await env.DB.prepare(`SELECT * FROM videos WHERE slot = ? ORDER BY uploaded_at DESC`).bind(slot).all();
      return jsonResponse(results.map(buildVideoRow));
    }

    if (pathname === "/api/admin/videos" && method === "POST") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const form = await request.formData();
      const slot = form.get("slot") || "scroll_scrub";
      const files = [...form.getAll("files"), form.get("file")].filter(Boolean);
      if (files.length === 0) return jsonResponse({ error: "No file provided" }, 400);
      const isMotionSlot = String(slot).startsWith("motion_");
      const inserted = [];
      for (const file of files) {
        const id = crypto.randomUUID();
        const ext = file.name?.split(".").pop() || "mp4";
        const r2Key = `videos/${id}.${ext}`;
        await env.R2_BUCKET.put(r2Key, file.stream(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" },
        });
        await env.DB.prepare(
          `INSERT INTO videos (id, slot, url, r2_key, published, is_staged)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(id, slot, r2Key, r2Key, isMotionSlot ? 1 : 0, isMotionSlot ? 0 : 1)
          .run();
        const row = await env.DB.prepare(`SELECT * FROM videos WHERE id = ?`).bind(id).first();
        inserted.push(buildVideoRow(row));
      }
      return jsonResponse({ video: inserted[0], videos: inserted, validations: { format: true, duration: true, resolution: true } }, 201);
    }

    if (pathname.startsWith("/api/admin/videos/") && method === "PATCH" && pathname.endsWith("/publish")) {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const id = pathname.replace("/api/admin/videos/", "").replace("/publish", "").replace(/\/+$/, "");
      const row = await env.DB.prepare(`SELECT slot FROM videos WHERE id = ?`).bind(id).first();
      if (!row) return jsonResponse({ error: "Video not found" }, 404);
      if (!String(row.slot).startsWith("motion_")) {
        await env.DB.prepare(`UPDATE videos SET published = 0 WHERE slot = ? AND published = 1`).bind(row.slot).run();
      }
      await env.DB.prepare(`UPDATE videos SET published = 1, is_staged = 0 WHERE id = ?`).bind(id).run();
      const updated = await env.DB.prepare(`SELECT * FROM videos WHERE id = ?`).bind(id).first();
      return jsonResponse(buildVideoRow(updated));
    }

    if (pathname.startsWith("/api/admin/videos/") && method === "DELETE") {
      if (!requireAuth(request, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const id = pathname.replace("/api/admin/videos/", "");
      const row = await env.DB.prepare(`SELECT r2_key FROM videos WHERE id = ?`).bind(id).first();
      if (!row) return jsonResponse({ error: "Video not found" }, 404);
      await env.DB.prepare(`DELETE FROM videos WHERE id = ?`).bind(id).run();
      if (row.r2_key) {
        await env.R2_BUCKET.delete(row.r2_key);
      }
      return jsonResponse({ success: true });
    }

    // Allow direct PUT to /r2/:key for client uploads (requires auth in production)
    if (method === "PUT" && pathname.startsWith("/r2/")) {
      const key = decodeURIComponent(pathname.replace("/r2/", ""));
      try {
        // Stream request body directly into R2. Be careful: ensure you require auth if exposing this publicly.
        await env.R2_BUCKET.put(key, request.body, {
          httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" },
        });

        const headers = { "content-type": "application/json", Allow: "PUT, GET, OPTIONS", ...CORS_HEADERS };
        return new Response(JSON.stringify({ key, url: buildR2Url(key) }), { status: 201, headers });
      } catch (err) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    if (method === "GET" && pathname.startsWith("/r2/")) {
      const key = decodeURIComponent(pathname.replace("/r2/", ""));
      const object = await env.R2_BUCKET.get(key);
      if (!object) return new Response("Not found", { status: 404, headers: CORS_HEADERS });
      const headers = new Headers(CORS_HEADERS);
      if (object.httpMetadata?.contentType) headers.set("content-type", object.httpMetadata.contentType);
      if (object.size) headers.set("content-length", String(object.size));
      return new Response(object.body, { status: 200, headers });
    }

    if (method === "GET" && !pathname.startsWith("/api/")) {
      return await serveStaticAsset(request, env, ctx);
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
