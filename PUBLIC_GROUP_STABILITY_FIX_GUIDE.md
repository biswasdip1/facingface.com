# Public Group Stability Fix

## What This Repairs

This release fixes the Public Group failure where a post could display **“Post published”** but the Group timeline remained in a loading state or did not show the new post. The cause was a newly introduced Group comment-count dependency: if its optional storage was unavailable in a legacy database, it could prevent the entire Group post query from returning.

The Group timeline now always loads published posts. Comment counts are added when the dedicated comment storage is ready; if it is temporarily unavailable, posts still render and comments show a safe zero count instead of blocking the timeline.

| Issue | Corrected behaviour |
|---|---|
| Published post not visible | Group posts remain visible even when comment-count storage is unavailable. |
| Group comment storage | Creates only the missing `public_group_post_comments` table and index, if needed. |
| URL-like Group address | A legacy Group whose handle begins with `http` redirects to a safe canonical address such as `/g/group-42`. Members, posts, and media remain unchanged. |
| New Group handles | Values beginning with `http` are rejected, preventing a web address from becoming a Group URL. |
| Existing malformed Group link | It remains accepted as a legacy alias and redirects automatically after the first visit. |

## Deployment

Extract the supplied ZIP, replace the contents of the existing GitHub repository, commit the changes, and push to `main`. Keep the current Render Start Command, Environment values, PostgreSQL database, and persistent disk unchanged.

After Render reports **Live**, open the affected Group using its existing old link once. The page will automatically move to its clean `/g/group-<number>` address. Do not delete or recreate the Group.

## Safe Verification

Use an existing member account in the affected Group.

| Step | Expected result |
|---|---|
| Open the existing Group link | It redirects to a clean canonical Group address. |
| Refresh the Group page | Existing posts load; the page does not remain as blank loading cards. |
| Create one short text post | The new post appears in the Group timeline after publishing. |
| Create one colour post | The large colour card appears in the Group. |
| Add one external URL | The URL is clickable; a preview appears when the external website provides preview metadata. |
| Add a reaction and comment | The reaction and comment are saved only within the Group context. |

Existing Group content, members, media, and Page features are retained. This repair does not change the main Feed, Page post system, email reminders, media disk, or account controls.
