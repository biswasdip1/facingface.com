# FacingFace — Self-Hosting Deployment Guide

This guide covers deploying FacingFace to your own infrastructure using [Render.com](https://render.com) and pointing the domain `www.facingface.com` to it. The same steps apply to any Node.js-compatible host (Railway, Fly.io, VPS, etc.).

---

## Prerequisites

Before deploying, you need the following services provisioned:

| Service | Purpose | Recommended Provider |
|---|---|---|
| MySQL 8.0+ or TiDB | Primary database | PlanetScale, TiDB Cloud, Railway MySQL, or self-hosted |
| Render persistent disk or S3-compatible storage | Media file uploads (photos, video, audio, docs) | Render persistent disk (included in this blueprint), Render-hosted MinIO, AWS S3, Cloudflare R2 |
| SMTP email | Email verification on registration | Gmail App Password, SendGrid, Mailgun |
| OpenAI-compatible LLM API | Sexual content moderation | OpenAI, Groq, or any OpenAI-compatible endpoint |

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/facingface.git
cd facingface
pnpm install
```

---

## Step 2 — Configure Environment Variables

Create a `.env` file in the project root. Use `docs/env-template.txt` as a reference:

```bash
cp docs/env-template.txt .env
# Edit .env and fill in all values
```

### Required Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string: `mysql://user:pass@host:3306/dbname` |
| `JWT_SECRET` | Random 32-byte hex string for session cookies. Generate with: `openssl rand -hex 32` |
| `SMTP_HOST` | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (587 for STARTTLS, 465 for SSL) |
| `SMTP_SECURE` | `true` for port 465, `false` for port 587 |
| `SMTP_USER` | SMTP username / email address |
| `SMTP_PASS` | SMTP password or App Password |
| `MEDIA_STORAGE_DRIVER` | Set to `disk` for the Render persistent-disk configuration included with this project. Set to `s3` only when deliberately using an S3-compatible object store. |
| `MEDIA_STORAGE_PATH` | For the Render disk mode, set to `/var/data/media`. |
| `MEDIA_PUBLIC_PATH` | For the Render disk mode, set to `/media`. New upload URLs will start with this path. |
| `BUILT_IN_FORGE_API_URL` | Optional API base URL for non-media functions such as configured AI services. It is **not** used for production media storage. |
| `BUILT_IN_FORGE_API_KEY` | Optional key for the non-media Forge API functions. It is **not** used for production media storage. |

### Optional Variables

| Variable | Description |
|---|---|
| `S3_ENDPOINT` | S3-compatible endpoint when `MEDIA_STORAGE_DRIVER=s3`. |
| `S3_BUCKET` | Bucket name when `MEDIA_STORAGE_DRIVER=s3`. |
| `S3_REGION` | Region when `MEDIA_STORAGE_DRIVER=s3` (for example `us-east-1`). |
| `S3_ACCESS_KEY_ID` | S3-compatible access key when `MEDIA_STORAGE_DRIVER=s3`. |
| `S3_SECRET_ACCESS_KEY` | S3-compatible secret when `MEDIA_STORAGE_DRIVER=s3`. |
| `S3_PUBLIC_URL` | Browser-accessible base URL for uploaded objects when `MEDIA_STORAGE_DRIVER=s3`. |
| `S3_FORCE_PATH_STYLE` | Set to `true` for many MinIO deployments; otherwise leave `false`. |
| `VITE_APP_ID` | Manus OAuth app ID (only needed if using Manus login) |
| `OAUTH_SERVER_URL` | Manus OAuth server URL |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth portal URL |
| `OWNER_OPEN_ID` | Owner's Manus open ID |
| `OWNER_NAME` | Owner's display name |

---

## Step 3 — Set Up the Database

### Option A: Fresh database (first deployment)

Run all Drizzle migrations in order to create the schema:

```bash
# Apply all migrations
pnpm drizzle-kit migrate
```

Or apply them manually by running each SQL file in `drizzle/` in numeric order:

```bash
# Example using mysql CLI
mysql -h HOST -u USER -p DATABASE < drizzle/0000_mighty_speed_demon.sql
mysql -h HOST -u USER -p DATABASE < drizzle/0001_mysterious_lila_cheney.sql
# ... continue for all files in order
```

### Option B: Existing database (re-deployment)

Only run migrations that haven't been applied yet. Check `drizzle/meta/_journal.json` for the list of applied migrations.

### Promote the First Admin

After the first user registers, promote them to admin via SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Step 4 — Build the Application

```bash
pnpm run build
```

This compiles the TypeScript server and builds the Vite frontend. Output goes to `dist/`.

---

## Step 5 — Deploy to Render.com

### Using the Blueprint (recommended)

1. Push the repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New → Blueprint**.
3. Connect your GitHub repository.
4. Render will detect `render.yaml` and configure the service automatically.
5. Fill in all `sync: false` environment variables in the Render dashboard.
6. Click **Apply** to deploy.

### Manual Service Setup

1. In Render Dashboard → **New → Web Service**.
2. Connect your GitHub repository.
3. Configure:
   - **Build Command:** `pnpm install && pnpm run build`
   - **Start Command:** `node dist/server/_core/index.js`
   - **Node Version:** 22
4. Add all environment variables from Step 2.
5. Click **Create Web Service**.

---

## Step 6 — Point www.facingface.com to Render

### In Render Dashboard

1. Go to your web service → **Settings → Custom Domains**.
2. Click **Add Custom Domain** and enter `www.facingface.com`.
3. Render will provide a CNAME target (e.g. `facingface.onrender.com`).

### In Your DNS Provider

Add a CNAME record:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | www | facingface.onrender.com | 3600 |

For the apex domain (`facingface.com` without `www`), add an ALIAS/ANAME record (if your DNS provider supports it) or an A record pointing to Render's IP:

| Type | Name | Value |
|---|---|---|
| A | @ | 216.24.57.1 |

> **Note:** DNS propagation can take up to 48 hours, though it typically completes within 1–2 hours.

### SSL/TLS

Render automatically provisions a free TLS certificate via Let's Encrypt once DNS propagates. No manual configuration is needed.

---

## Step 7 — Verify the Deployment

1. Visit `https://www.facingface.com` — you should see the landing page.
2. Register a new account and check that the verification email arrives.
3. Upload a photo post to confirm S3 storage is working.
4. Log in as admin at `/admin` to verify the admin panel.

---

## Updating the Deployment

To deploy a new version:

```bash
git push origin main
```

Render will automatically rebuild and redeploy (if `autoDeploy: true` in `render.yaml`).

If there are new database migrations, apply them before or immediately after deploying:

```bash
pnpm drizzle-kit migrate
```

---

## Scaling Considerations

| Concern | Recommendation |
|---|---|
| Database connections | Use a connection pooler (PlanetScale, PgBouncer) for high traffic |
| Media storage | Serve files via CloudFront or Cloudflare CDN in front of S3 |
| WebRTC signalling | Socket.IO is in-process; for multi-instance deployments, use Redis adapter |
| Background jobs | The cleanup job (auto-delete inactive media) runs in-process; for production, move to a separate worker or cron job |

---

## Troubleshooting

**Email verification not sending**
- Check `SMTP_*` variables are correct.
- For Gmail, ensure you are using an [App Password](https://myaccount.google.com/apppasswords), not your regular password.
- Check server logs: `render logs --service facingface`.

**File uploads failing**
- Verify `AWS_*` variables and that the S3 bucket exists with the correct region.
- Check bucket CORS policy allows `PUT` from your domain.

**Content moderation not working**
- Verify `BUILT_IN_FORGE_API_KEY` is valid and `BUILT_IN_FORGE_API_URL` points to an OpenAI-compatible endpoint.

**Database connection errors**
- Ensure `DATABASE_URL` uses the correct format: `mysql://user:pass@host:port/dbname`.
- For TiDB Cloud, append `?ssl={"rejectUnauthorized":true}` to the connection string.

---

## Architecture Overview

```
Browser
  │
  ├─ Static assets (Vite build) ──── served by Express from dist/client/
  │
  └─ /api/trpc/* ─────────────────── tRPC procedures (Express + tsx)
       │
       ├─ Drizzle ORM ──────────────── MySQL / TiDB
       ├─ S3 storage ───────────────── AWS S3 / compatible
       ├─ Nodemailer ───────────────── SMTP (Gmail)
       ├─ Socket.IO ────────────────── WebRTC signalling (audio/video calls)
       └─ LLM API ──────────────────── Content moderation
```

---

*FacingFace — built with React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL/TiDB*
