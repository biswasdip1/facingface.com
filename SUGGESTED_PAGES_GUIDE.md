# Suggested Pages Guide

## What is New

FacingFace now has a Facebook-style **Suggested Pages** card in the main Feed. It displays eligible public Pages that the member does not already follow.

| Feed position | Item shown |
| --- | --- |
| After post 4 | Advertisement |
| After post 7 | Video Reels |
| After post 10 | People You May Know |
| After post 14 | Story |
| After post 16 | Suggested Pages |

The same placement pattern repeats as more Feed posts load.

## Suggested Pages Card

The card displays up to five public Pages with their cover image or a clean fallback icon, Page name, follower count, a Follow button, and a link to view all public Pages. Pages are excluded when they are private, suspended, owned by the current member, already followed, or removed from suggestions by a super admin.

## Admin Controls

Open **Admin → Suggested Pages** to see the Pages currently eligible for the suggestion card. Selecting **Remove from suggestions** hides that Page from Suggested Pages immediately and permanently. It does not delete the Page, suspend it, change its posts, or remove it from normal Page search.

## Verification

1. Ensure there are at least sixteen normal Feed posts.
2. Confirm that Suggested Pages is visible after the sixteenth post.
3. Follow a suggested Page and refresh; it should no longer be recommended to that account.
4. As a super admin, remove a Page in **Admin → Suggested Pages**. Confirm that it disappears immediately and is not shown in the Feed card after refresh.

## Deployment

No Render setting needs changing. Keep the current Start Command, PostgreSQL database, persistent media disk, Gmail configuration, and `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` unchanged. Push the complete source to your normal GitHub `main` branch and Render will deploy it automatically.
