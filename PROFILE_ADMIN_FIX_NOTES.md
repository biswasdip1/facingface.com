# FacingFace Profile Media and Super Admin Fix Notes

## Summary

The missing profile photos, cover/background photos, and missing **Super Admin** panel were caused by the earlier emergency login readback compatibility patch. To stop the post-login loop on the live PostgreSQL deployment, the backend session user loader was changed to select only a tiny set of required user columns and then hydrate the rest of the user object with safe defaults.

That solved login, but it also meant the authenticated user and profile lookup paths were returning these defaults instead of the real database values:

| Field | Incorrect default after emergency login patch | User-visible effect |
|---|---:|---|
| `avatar` | `null` | Profile photos and member avatars disappeared. |
| `coverPhoto` | `null` | Profile cover/background photos disappeared. |
| `role` | `user` | Admin and Super Admin navigation disappeared. |
| `isVerified` | `false` | Some badge state could be hidden. |

## Fix Applied

The backend user hydration logic in `server/db.ts` now keeps the login-safe approach but restores the real PostgreSQL values for stable base user columns that already exist in the main PostgreSQL schema, including:

| Restored field group | Restored columns |
|---|---|
| Profile media | `avatar`, `coverPhoto`, `coverCropY` |
| Admin access | `role` |
| Profile display | `bio`, `hometown`, `currentLocation`, `currentRole`, `website`, `youtubeChannel`, `phone`, `phoneVerified` |
| Safety and status | `suspendedUntil`, `suspendReason`, `violationCount`, `isVerified`, `lastCallsSeenAt`, `lastSeenAt` |

The `hydrateAuthUser` helper now uses real returned values when present and only falls back to defaults when a value is genuinely absent. This keeps the session stable while restoring profile photos, cover photos, and Super Admin visibility.

## Files Changed

| File | Change |
|---|---|
| `server/db.ts` | Restored real `role`, `avatar`, `coverPhoto`, and related user fields in `getUserByOpenId()` and `getUserById()`. Updated hydration defaults so real database values are preserved. |

## Expected Result After Deployment

After uploading this ZIP through GitHub Desktop and allowing Render.com to redeploy or restart the service, users should see existing profile photos and cover photos again, and a user whose database `role` is `super_admin` should again see the **Super Admin** panel link.

If Super Admin still does not appear after deployment, confirm the affected PostgreSQL row still has `role = 'super_admin'`. The previous bug hid this role in the app response, but it did not intentionally change the database role.
