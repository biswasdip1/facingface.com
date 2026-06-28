# Database Migrations

This directory contains all Drizzle ORM migrations for FacingFace.

## Files

| File | Description |
|---|---|
| `schema.ts` | TypeScript schema — the single source of truth for all tables |
| `relations.ts` | Drizzle relation definitions (used for type inference) |
| `0000_*.sql` … `0014_*.sql` | Sequential migration SQL files |
| `meta/` | Drizzle migration journal (tracks applied migrations) |

---

## Applying Migrations

### Fresh Database (first setup)

Run all migrations in numeric order:

```bash
# Using Drizzle Kit (recommended)
pnpm drizzle-kit migrate

# Or manually with mysql CLI
for f in drizzle/[0-9]*.sql; do
  echo "Applying $f..."
  mysql -h HOST -u USER -p DATABASE < "$f"
done
```

### Existing Database (update)

Check which migrations have already been applied in `meta/_journal.json`, then run only the new ones.

---

## Generating New Migrations

After modifying `drizzle/schema.ts`:

```bash
pnpm drizzle-kit generate
```

This creates a new numbered `.sql` file in this directory. Review it, then apply it:

```bash
pnpm drizzle-kit migrate
```

---

## Schema Overview

### `users`
Core user accounts. Fields include: `id`, `openId`, `name`, `email`, `passwordHash`, `emailVerified`, `verificationToken`, `avatar`, `bio`, `role` (admin/user), `suspendedUntil`, `suspendReason`, `violationCount`, `createdAt`.

### `posts`
All user posts. Supports text, photo (up to 3), video, audio, document, poll, and live stream types. Fields include: `id`, `authorId`, `text`, `mediaUrl`, `mediaType`, `isFlagged`, `flagReason`, `resharedFromId`, `deletionScheduledAt`, `createdAt`.

### `comments`
Post comments with threaded replies via `parentId`. Supports `isFlagged` for moderation.

### `likes`
Polymorphic likes on posts and comments (`targetType`: "post" | "comment").

### `emoji_reactions`
Emoji reactions on posts and comments (❤️ 😂 😮 😢 👍 and custom).

### `follows`
User follow relationships (`followerId` → `followingId`).

### `friend_requests`
Pending friend/connect requests with `status` (pending/accepted/declined).

### `friendships`
Accepted friend pairs (`user1Id`, `user2Id`).

### `notifications`
In-app notifications with `type`, `actorId`, `targetId`, `isRead`.

### `polls` / `poll_options` / `poll_votes`
Poll posts with multiple options and per-user vote tracking.

### `conversations` / `messages`
Direct messaging between two users with file transfer support.

### `post_shares`
Records when a user shares a post (for share count tracking).

---

## Promoting a User to Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Resetting the Database (development only)

```bash
# Drop all tables and re-run migrations
pnpm drizzle-kit drop
pnpm drizzle-kit migrate
```

> **Warning:** This destroys all data. Never run on production.
