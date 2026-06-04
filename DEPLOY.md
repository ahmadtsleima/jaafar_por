Deployment to Cloudflare (Wrangler)

1) Fill `wrangler.toml`
- Set `account_id` to your Cloudflare account ID.
- Replace `your_bucket_name` values with the R2 bucket names for each environment.
- Set `JWT_SECRET` and `FRONTEND_URL` in the appropriate `[env.*].vars` sections.

2) Configure Cloudflare resources
- In the Cloudflare dashboard create an R2 bucket.
- Create a D1 database, and give it a name such as `portfolio_db`.
- In `wrangler.toml`, the Worker binds `R2_BUCKET` and `DB` for R2 and D1 access.

3) Environment secrets / variables
- For Workers, prefer using Wrangler `vars`/`env` or Cloudflare dashboard secrets (`wrangler secret put`) for sensitive values.
- Example: `wrangler secret put JWT_SECRET --env production`
- Also set `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` for login.

Worker notes:
- The Worker exposes an upload endpoint at `/api/admin/photos` and serves files at `/r2/:key`.
- The `R2_BUCKET` binding in `wrangler.toml` must match the binding name used in the Worker (currently `R2_BUCKET`).
- Use `wrangler dev` to test the Worker locally and `wrangler publish --env production` to deploy.

Frontend notes:
- The admin frontend already posts `FormData` to `/api/admin/photos` (via the `api.photos.upload` helper). When you deploy the Worker to the same domain as the frontend, uploads will go to the Worker endpoint and be saved to R2.
- For local development, the existing Node backend will continue to handle `/api` routes unless you run `wrangler dev` and point the frontend to the worker preview URL (set `VITE_API_URL` accordingly).

4) Publish
- Development preview: `npm run deploy:wrangler:dev`
- Production publish: `npm run deploy:wrangler` (or `npm run deploy:wrangler:prod`)

5) Important notes about the backend code
- This repository currently runs a Node server at `server/index.js`.
- Cloudflare Workers run on a different runtime and do not support a full Node/Express server directly.
- To run the backend on Cloudflare you must either:
  - Port server logic to a Worker-compatible handler (fetch/event-based), or
  - Use Cloudflare Pages Functions if the routes are simple, or
  - Deploy the Node server to a different host (e.g., Cloud Run, Fly, Railway) and keep using R2 from there.

6) Consistency across deployments
- Use the `env` sections in `wrangler.toml` to keep dev/production variables aligned.
- Keep bucket names and bindings consistent (the `binding` key in `[[r2_buckets]]` must match code references).
- In your code use the same binding name (`R2_BUCKET`) when accessing R2 from Workers.

If you want, I can:
- Port `server` routes to a Worker-compatible handler skeleton, or
- Add CI scripts for automated `wrangler publish` on push to `main`.
