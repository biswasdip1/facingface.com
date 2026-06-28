# FacingFace Facebook-Style Feed Update

**Author:** Manus AI  
**Date:** 18 May 2026

## Answer: How Many Days Will a Post Display?

Before this update, the main feed did **not** have a fixed day limit. Posts were selected from the database as long as they were not flagged, then displayed in newest-first order with pagination. In practical terms, this meant a post could remain available indefinitely, but users mostly saw newer posts first.

This update keeps the same important principle: posts do **not** disappear from the feed after a fixed number of days. That is closer to Facebook-style behavior because normal posts are not treated like 24-hour stories. Instead, the feed now decides what to show first by relevance.

## What Changed

| Area | Previous Behavior | New Behavior |
|---|---|---|
| Post lifetime in main feed | No fixed day expiry; newest posts first. | No fixed day expiry; fresh and relevant posts are prioritized. |
| Feed order | Pure chronological order by `createdAt`. | Facebook-style relevance score using recency, friendships, followed pages, likes, comments, video views, and media presence. |
| Older posts | Older posts appeared only after scrolling far enough. | Older posts can appear higher if they are relevant and receiving engagement. |
| Comment counts | Feed response returned an empty comment-count map. | Feed response now returns actual comment counts for ranked posts. |
| Advertisements | Previous advertisement improvements remain included. | Advertisement rotation and every-eighth-post placement remain included. |
| Messenger | Previous Messenger account actions remain included. | Sign-out and FacingFace profile/home links remain included. |

## Important Note About “Exactly Facebook”

Facebook’s exact ranking algorithm is private and changes constantly. This update implements a practical Facebook-style feed for FacingFace: posts do not expire by days, fresh content remains prominent, friend posts receive priority, followed page posts can appear, and posts with more engagement can be resurfaced.

## Files Changed

| File | Purpose |
|---|---|
| `server/routers.ts` | Replaced purely chronological main feed ordering with relevance-based ranking. |
| `server/db.ts` | Added `getCommentCounts()` so the feed can rank and display posts using real comment engagement. |
| `FACEBOOK_STYLE_FEED_NOTES.md` | Documents this update and validation results. |

## Validation Results

| Command | Result |
|---|---|
| `pnpm check` | Passed. TypeScript validation completed successfully. |
| `pnpm build` | Passed. Production client and server build completed successfully. |

The production build still prints the existing analytics environment variable warnings for `%VITE_ANALYTICS_ENDPOINT%` and `%VITE_ANALYTICS_WEBSITE_ID%`. These warnings are configuration notices and do not stop the build.

## Deployment Notes

Upload the included ZIP contents to GitHub or Render as before. The package includes the previous advertisement work, the Messenger account actions, and this new Facebook-style feed ranking update.
