# FacingFace Login Fix Notes — 21 May 2026

This package contains the latest fixes for the live FacingFace.com login loop where the password login is accepted, the page briefly opens, and then the user is returned to the login screen.

## Confirmed symptom

The latest visible notice confirmed that the email/password check succeeds, but the immediate authenticated-session readback fails:

> Login was accepted, but your session could not be opened.

That means the password itself is not the primary problem. The remaining issue is in the post-login session/user readback path or in database schema drift after deployment.

## What was fixed

The backend session cookie helper was adjusted for HTTPS/proxy deployment so the browser can keep the session cookie on the live domain.

The backend session verifier was also adjusted so an empty optional display name does not invalidate an otherwise valid active session.

The email login endpoint now returns the authenticated user payload immediately after a successful password check and session creation. The frontend seeds the authenticated user cache from that successful login response before checking `auth.me`, so a successful login does not rely only on the next cookie readback request.

The user readback helpers in `server/db.ts` were made more tolerant of PostgreSQL schema drift. They now select only the core columns needed for authentication and hydrate newer optional profile fields with safe defaults. This is important because the project started with MySQL and was later converted to PostgreSQL; older or imported live databases may be missing some newer camelCase profile columns even though password login itself still works.

## MySQL-to-PostgreSQL conversion finding

The current application code and dependencies are PostgreSQL-based, not MySQL-based. However, I found two migration-related risks that could affect deployment after the conversion:

| Area | Finding | Fix included |
|---|---|---|
| Runtime database driver | The app now uses PostgreSQL packages and PostgreSQL Drizzle schema. | No MySQL runtime driver change was needed. |
| Live schema drift | A converted/imported database may not have every newer optional user/profile column. Selecting those columns during `auth.me` can break the post-login session readback. | Auth user lookup now uses only core authentication columns and fills optional fields safely. |
| Migration journal | `0009_users_birthday_hobby.sql` and `0010_news_feed_sources.sql` existed but were not registered in `drizzle/meta/_journal.json`. | The journal now includes both migration entries so deployment migration tooling can see them. |
| Birthday migration | The birthday/hobby migration had checks for `birthDay` but did not reliably add the `birthDay` column. | The migration now explicitly adds `birthDay`, `birthMonth`, and `hobby` with `IF NOT EXISTS`. |

## Files changed in this package

| File | Purpose |
|---|---|
| `server/_core/cookies.ts` | Production-safe session cookie behavior for HTTPS/proxy deployments. |
| `server/_core/sdk.ts` | More tolerant session verification after login. |
| `server/routers.ts` | Email login returns the authenticated user payload after successful password verification. |
| `server/db.ts` | Migration-tolerant core user lookup for auth/session readback and post-login user loading. |
| `client/src/pages/Landing.tsx` | Uses successful login response to seed authenticated state and shows visible diagnostics if readback fails. |
| `drizzle/meta/_journal.json` | Registers the latest PostgreSQL migrations. |
| `drizzle/0009_users_birthday_hobby.sql` | Repairs the missing `birthDay` column addition. |

## Required deployment steps

Upload the full project from the ZIP through GitHub Desktop, redeploy the application, and restart the server process. Make sure the live hosting environment is still using the PostgreSQL `DATABASE_URL`, not an old MySQL connection string.

If your hosting platform does not automatically run migrations, run the PostgreSQL migrations manually after deployment. The repaired journal now includes the newer migration files. If the live database was imported from MySQL and has lowercased or missing columns, the login should still work with the new core auth readback, but migrations should still be applied to restore the full profile/news features.

## If login still fails

If the same notice appears again after this package is deployed and the server is restarted, the next thing to inspect is the live server log for the `auth.me` request immediately after login and the live database table/column names for `activeSessions` and `users`. The frontend should now show an error rather than silently blinking, which will help identify the exact remaining live-hosting mismatch.
