# FacingFace Advertisement Enhancement Notes

Prepared by **Manus AI** on 18 May 2026.

## Summary

This package enhances the FacingFace feed advertisement system while preserving the existing PostgreSQL, Drizzle ORM, tRPC, React, Vite, and Render deployment structure. The dedicated Messenger experience for `chat.facingface.com` remains unchanged and continues to be included in this merged build.

The advertisement system now provides a clearer multi-slot workflow in the admin panel. Admins can create **Ad Slot 1, Ad Slot 2, Ad Slot 3**, and continue with **4, 5, or more slots** without a fixed slot limit. The existing behaviour that allows **multiple ads to be active simultaneously for rotation** has been preserved.

## What Changed

| Area | Change | Result |
| --- | --- | --- |
| Feed placement | Feed ads now render after **every 8th post** instead of alternating every other injection with People You May Know. | Ads appear at post 8, 16, 24, 32, and onward. |
| Rotation logic | The feed passes a slot number into the ad lookup. Active ads are selected in slot order and loop when feed placements exceed active ads. | Four, five, or more active ads rotate clearly across the feed. |
| Admin controls | The Advertisements admin tab now shows total slots, active rotation count, impressions, clicks, slot labels, and a slot workflow explanation. | Admins can manage many ads more easily. |
| Duplication | Each ad row has a **Duplicate** action that copies an existing ad into the next slot form. | Faster creation of multi-step ad campaigns. |
| Active state | The label **Active (multiple ads can be active for rotation)** remains in place. | Existing multi-active rotation behaviour is preserved. |
| Database schema | No new column or migration was added. Existing `feedAds` and `adEvents` tables are used. | Render deployment does not require a new database migration for this ad update. |

## Files Updated

| File | Purpose |
| --- | --- |
| `client/src/pages/Admin.tsx` | Enhanced advertisement admin UI with slot summaries, duplicate action, active rotation count, and clearer slot labelling. |
| `client/src/pages/Feed.tsx` | Changed feed insertion so an advertisement is displayed after every 8 posts. |
| `client/src/components/FeedAd.tsx` | Added optional slot-aware ad querying and sponsored slot labelling. |
| `server/db.ts` | Added deterministic active-ad slot rotation while keeping random rotation available when no slot is supplied. |
| `server/routers.ts` | Updated `feedAds.getActive` to accept an optional slot input. |
| `ADS_ENHANCEMENT_NOTES.md` | This deployment note. |

## Validation

| Command | Result |
| --- | --- |
| `pnpm check` | Passed. |
| `pnpm build` | Passed. Vite reported only pre-existing environment/chunk-size warnings. |

## Render Deployment Notes

No new environment variables are required for the advertisement enhancement. The previously added Messenger encryption feature still requires the existing `CHAT_ENCRYPTION_KEY` environment variable to be set on Render.

Because this package does not add a new database column, it should be deployable through the existing GitHub Desktop to Render workflow without extra SQL changes. Upload the merged ZIP contents to the repository, commit, push, and let Render redeploy the service.
