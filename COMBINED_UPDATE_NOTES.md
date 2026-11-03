# FacingFace Combined Update Package

This ZIP contains the updated FacingFace project with the changes requested today:

- Member profile birth day and birth month fields, without birth year.
- Member hobby profile field.
- Larger artistic text-post backgrounds.
- Birthday wishing templates in the post composer.
- Event notice and invitation templates in the post composer.
- Rearranged home/landing feed layout with left menu, center feed, and right news column.
- Admin-managed RSS news feed sources for the home page right column.

## Database migrations included

Apply the new PostgreSQL migrations using your normal deployment process:

- `drizzle/0009_users_birthday_hobby.sql`
- `drizzle/0010_news_feed_sources.sql`
- `drizzle/migrations/0006_users_birthday_hobby.sql`
- `drizzle/migrations/0007_news_feed_sources.sql`
- Optional standalone script for the birthday/hobby update: `migrate-0035-birthday-hobby-postgres.mjs`

## Important packaging note

The ZIP intentionally excludes `node_modules`, `.git`, build output, cache folders, logs, and environment secrets. After uploading/extracting, install dependencies normally with:

```bash
pnpm install
pnpm check
```

Then run your normal build/start/deployment commands.
