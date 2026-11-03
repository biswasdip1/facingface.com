# FacingFace

A full-featured social media platform built with React 19, Tailwind 4, Express 4, and tRPC 11.

**Live domain:** [www.facingface.com](https://www.facingface.com)

---

## Features

- Email/password registration with email verification
- News feed with photos (up to 3), video, audio, documents, polls, and live streaming
- AI-powered content moderation (LLM-based)
- Like, comment (threaded), emoji reactions, reshare
- Follow/unfollow system with follower/following counts
- Real-time notifications (in-app + email)
- Link preview cards with Open Graph metadata
- 24-hour upload quotas per media type
- Auto-delete inactive media after 2 years (with 7-day warning)
- Sexual content detection with progressive account suspension
- Full-text search across posts and users
- Admin panel: stats, flagged post review, user management, daily limit controls
- Post detail page with full comment thread
- 4 selectable themes: White, Light Blue, Soft Beige, Light Dark

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Wouter |
| Backend | Express 4, tRPC 11, Drizzle ORM |
| Database | MySQL / TiDB |
| Auth | Email/password (bcrypt + JWT sessions) |
| Storage | S3-compatible object storage |
| AI | LLM moderation, image generation |
| Email | SMTP (Gmail App Password) |

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template and fill in values
cp docs/env-template.txt .env

# 3. Run database migrations
pnpm drizzle-kit generate
# Apply the generated SQL to your database

# 4. Start the dev server
pnpm dev
```

The app runs on `http://localhost:3000`.

---

## Self-Hosting on Render.com

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full step-by-step guide.

A `render.yaml` Blueprint file is included for one-click deployment.

---

## Environment Variables

All required environment variables are documented in [docs/env-template.txt](./docs/env-template.txt).

---

## Database Migrations

See [drizzle/README.md](./drizzle/README.md) for migration instructions.

---

## Admin Access

After registering, promote a user to admin via SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

The Admin panel is then accessible at `/admin` in the NavBar.

---

## Domain Setup

Point your DNS for `www.facingface.com` to your Render service:

```
CNAME  www  →  your-service.onrender.com
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full DNS configuration.
