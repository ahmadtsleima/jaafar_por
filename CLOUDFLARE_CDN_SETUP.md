# Cloudflare CDN Setup for jaafarsleiman.com

The site stays hosted on the VPS at `167.172.173.184`. Cloudflare sits in front as the CDN/proxy.

## 1. DNS

In Cloudflare > `jaafarsleiman.com` > DNS:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| A | `jaafarsleiman.com` | `167.172.173.184` | Proxied |
| A | `www` | `167.172.173.184` | Proxied |

The cloud icon must be orange. If `www` is missing, add it.

## 2. SSL/TLS

In Cloudflare > SSL/TLS:

- Set mode to `Full (strict)` if the VPS has a valid origin certificate.
- Use `Full` only temporarily if the origin certificate is not ready yet.
- Turn on `Always Use HTTPS`.

## 3. Cache Rules

Cloudflare docs: Cache Rules require proxied DNS records and can define cache eligibility/TTL for matching requests.

Create these rules in Cloudflare > Caching > Cache Rules.

### Rule 1: Static Build Assets

Name: `Cache static build assets`

Expression:

```txt
(http.host in {"jaafarsleiman.com" "www.jaafarsleiman.com"} and starts_with(http.request.uri.path, "/assets/"))
```

Settings:

- Cache eligibility: `Eligible for cache`
- Edge TTL: `1 year`
- Browser TTL: `Respect origin` or `1 year`

### Rule 2: Uploaded Media

Name: `Cache uploaded portfolio media`

Expression:

```txt
(http.host in {"jaafarsleiman.com" "www.jaafarsleiman.com"} and starts_with(http.request.uri.path, "/uploads/"))
```

Settings:

- Cache eligibility: `Eligible for cache`
- Edge TTL: `1 month` to `1 year`
- Browser TTL: `Respect origin`

Use `1 year` if uploaded file URLs are UUID filenames and never overwritten. This project uses UUID upload filenames, so `1 year` is safe.

### Rule 3: Bypass Admin/API Writes

Name: `Bypass admin and write APIs`

Expression:

```txt
(starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/api/admin") or http.request.method ne "GET")
```

Settings:

- Cache eligibility: `Bypass cache`

Place this rule above broad cache rules if Cloudflare asks for ordering.

## 4. Speed Settings

Cloudflare > Speed > Optimization:

- Brotli: `On`
- Auto Minify: optional. Keep off if CSS/JS issues appear.
- Early Hints: optional, can be enabled after testing.

## 5. Verify CDN

Run these after deploy:

```bash
curl -I https://jaafarsleiman.com/assets/index-BIY74mMF.css
curl -I https://jaafarsleiman.com/uploads/photos/YOUR_FILE_NAME.jpg
```

Look for:

```txt
server: cloudflare
cf-cache-status: HIT
cache-control: public, max-age=31536000, immutable
```

First request may show `MISS`; refresh/run again and it should become `HIT`.

## 6. Purge Cache After Deploy

Usually you do not need to purge `/assets/*` because Vite filenames are hashed.

Purge only when needed:

- Cloudflare > Caching > Configuration > Purge Cache
- Use `Purge Everything` only if the site looks stale.
- Prefer single-file purge for uploaded media if one asset changed.
