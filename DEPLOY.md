Deployment to your VPS

Target:
- Domain: `jaafarsleiman.com`
- Server IP: `167.172.173.184`
- App port: `3001` behind Nginx
- Upload storage: local server folder at `server/uploads`
- Database: local SQLite file at `server/db.sqlite`

What changed:
- Admin photo/video file uploads now save to your server, not Cloudflare R2.
- Uploaded files are served from `/uploads/...`.
- Existing rows that contain old keys like `photos/file.jpg` or `videos/file.mp4` will resolve to `/uploads/photos/file.jpg` and `/uploads/videos/file.mp4`.
- If you have old R2 files, copy them into `server/uploads` using the same folder names.

1) Point DNS to the server

In your DNS provider, create/update:

```text
A     @      167.172.173.184
A     www    167.172.173.184
```

Wait for DNS to propagate before issuing SSL.

2) Prepare the server

SSH into the VPS:

```bash
ssh root@167.172.173.184
```

Install Node.js 22, Nginx, Git, and PM2:

```bash
apt update
apt install -y git nginx curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
```

3) Upload or clone the project

Put the project at:

```bash
/var/www/jaafar_por
```

Example:

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_REPO_URL jaafar_por
cd /var/www/jaafar_por
```

If you are uploading files manually, copy the full project folder there.

4) Create production environment variables

Create `/var/www/jaafar_por/server/.env`:

```bash
cd /var/www/jaafar_por/server
nano .env
```

Use this:

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://jaafarsleiman.com
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_PASSWORD=replace_with_your_admin_password
```

Do not add any R2 variables. They are no longer needed.

5) Install dependencies and build

```bash
cd /var/www/jaafar_por
npm ci
npm run build

cd /var/www/jaafar_por/server
npm ci --omit=dev
mkdir -p uploads/photos uploads/videos
```

6) Move existing R2 files, if needed

If your current database has media keys like `photos/...` and `videos/...`, copy the old R2 objects into:

```text
/var/www/jaafar_por/server/uploads/photos
/var/www/jaafar_por/server/uploads/videos
```

Keep the same names. For example:

```text
R2 object: photos/abc.jpg
Server file: /var/www/jaafar_por/server/uploads/photos/abc.jpg
Public URL: https://jaafarsleiman.com/uploads/photos/abc.jpg
```

Also copy your existing SQLite database, if you have one:

```text
/var/www/jaafar_por/server/db.sqlite
```

7) Start the app with PM2

```bash
cd /var/www/jaafar_por
pm2 start server/index.js --name jaafar-portfolio --update-env
pm2 save
pm2 startup
```

Check it:

```bash
curl http://127.0.0.1:3001/api/health
```

8) Configure Nginx

Create `/etc/nginx/sites-available/jaafarsleiman.com`:

```nginx
server {
    listen 80;
    server_name jaafarsleiman.com www.jaafarsleiman.com;

    client_max_body_size 600M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/jaafarsleiman.com /etc/nginx/sites-enabled/jaafarsleiman.com
nginx -t
systemctl reload nginx
```

9) Add SSL

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d jaafarsleiman.com -d www.jaafarsleiman.com
```

10) Verify

Open:

```text
https://jaafarsleiman.com/api/health
https://jaafarsleiman.com/admin
```

Upload one test photo/video in the admin panel, then confirm the file appears inside:

```text
/var/www/jaafar_por/server/uploads
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs jaafar-portfolio
pm2 restart jaafar-portfolio --update-env
```
