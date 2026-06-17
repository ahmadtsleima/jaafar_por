# Portfolio Performance Report

Date: 2026-06-17

## Scope

This pass focused on the active public portfolio path and the Express/Vite deployment used on the DigitalOcean VPS. Browser trace tooling was not available in this Codex session, so the before/after Core Web Vitals values below are estimates from code and build analysis, not Lighthouse measurements.

## Main Issues Found

1. Motion Design videos were rendered with real `src` values immediately and autoplay enabled, so the browser could begin fetching many large videos on initial page load.
2. Admin code was bundled into the same initial JavaScript path as the public website.
3. Vite hashed assets were served without explicit long-term immutable cache headers by Express.
4. Uploaded photos/videos were cached for only 30 days even though filenames are UUID-based and safe for immutable caching.
5. Public JSON endpoints used `no-store`, forcing repeat network requests for content/photo/video manifests.
6. Gallery preview images still use uploaded image files directly. The current code preserves quality, but true thumbnail variants would further reduce payload.

## Code Changes Made

### Frontend

- Added viewport-aware video loading in `src/App.jsx`.
- Video cards now keep layout and click behavior, but only attach video/iframe sources when the card is near the viewport.
- Changed preview video preload from eager/auto behavior to metadata-only when visible.
- Removed frontend `cache: "no-store"` for public content/media manifest requests.
- Split `src/main.jsx` with `React.lazy()` so `/admin` and public portfolio code are loaded separately.
- Added Vite manual chunks in `vite.config.js` for stable React/vendor caching.

### Server

- `/uploads/*` now sends:
  - `Cache-Control: public, max-age=31536000, immutable`
  - `Accept-Ranges: bytes`
- Vite `/dist/assets/*` now sends:
  - `Cache-Control: public, max-age=31536000, immutable`
- HTML responses stay fresh with:
  - `Cache-Control: no-cache`
- Public JSON endpoints now use short caching:
  - `Cache-Control: public, max-age=30, stale-while-revalidate=300`

## Estimated Impact

| Optimization | Impact | Expected Result |
| --- | --- | --- |
| Lazy video `src` near viewport | High | Much less initial network weight, faster FCP/LCP, lower VPS bandwidth |
| Admin/public code split | Medium | Smaller public initial JS bundle |
| Immutable cache for assets/uploads | High on repeat visits | Returning visitors avoid re-downloading unchanged media/assets |
| Short cache for public JSON | Low/Medium | Fewer API requests during navigation/reloads |
| Vite vendor chunks | Medium on repeat deploys | Better browser cache reuse for React/vendor code |

## Core Web Vitals Status

| Metric | Before | After |
| --- | --- | --- |
| LCP | Not measured | Expected improvement because initial videos no longer compete with hero/media |
| FCP | Not measured | Expected improvement from smaller initial JS and fewer video requests |
| TBT | Not measured | Expected slight improvement from code splitting |
| CLS | Not measured | Existing CSS aspect-ratio boxes already reduce major media layout shift |

To get real values, run Lighthouse or Chrome DevTools on `https://jaafarsleiman.com` after deployment with a cold cache and mobile throttling.

## VPS / Nginx Recommendations

Enable Gzip now. Brotli is better if the Nginx Brotli module is installed.

```nginx
gzip on;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types
  text/plain
  text/css
  text/javascript
  application/javascript
  application/json
  application/xml
  image/svg+xml;
```

Add cache headers at Nginx too, so Cloudflare and browsers see them even when bypassing Node static handling:

```nginx
location /assets/ {
  proxy_pass http://127.0.0.1:3001;
  add_header Cache-Control "public, max-age=31536000, immutable" always;
}

location /uploads/ {
  proxy_pass http://127.0.0.1:3001;
  add_header Cache-Control "public, max-age=31536000, immutable" always;
}
```

For large uploads, keep:

```nginx
client_max_body_size 2G;
proxy_request_buffering off;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

## Cloudflare Recommendation

Keep Cloudflare proxy enabled for the domain. For this portfolio:

- Use Cloudflare CDN cache for `/assets/*` and `/uploads/*`.
- Use Cloudflare Polish/Image Resizing or Cloudflare Images if you want automatic WebP/AVIF derivatives without losing the originals.
- Consider Cloudflare Stream for videos if video traffic grows. It will give adaptive streaming, thumbnails, and better seek/start behavior than raw MP4 files on a 1 vCPU VPS.
- R2 is beneficial for media storage if uploads grow large, but the current request was to host on your server. A balanced setup is: server app + DB on VPS, media originals/derivatives on R2 or Cloudflare Images/Stream.

## Remaining High-Value Work

1. Generate real image thumbnail variants on upload, for example:
   - card preview: WebP/AVIF around 900-1200px wide
   - lightbox/original: keep original file
2. Transcode uploaded videos to web MP4 H.264/AAC with fast-start metadata:

```bash
ffmpeg -i input.mov -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart output.mp4
```

3. Add posters for every video and use poster images for cards.
4. Run Lighthouse after deploy and record actual before/after values.
