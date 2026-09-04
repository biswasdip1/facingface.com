# Public Group Reactions & URL Repair

## Purpose

This release repairs two Public Group behaviours while preserving existing Group posts, members, media, Pages, and main Feed reactions.

| Area | Corrected behaviour |
|---|---|
| Group reactions | Public Group posts use a durable one-reaction-per-member record. The result uses the same Like/Love/Haha/Wow/Sad/Angry model as ordinary posts. |
| Counts and avatars | Each Group post shows the reaction-type icons, total number, and up to five recent members as a compact profile-photo stack. |
| Repeat clicks | Selecting the same reaction again removes it. Selecting a different reaction replaces the member’s previous one, so a member cannot inflate a count. |
| Existing database | Startup safely adds the missing `public_group_post` reaction enum value when an older database does not yet have it. |
| URL fallback | A posted URL is saved as a click-through link even when the external website does not supply preview metadata. |
| Page URLs | New Page URL posts also retain their original link when no preview metadata is available. |

## Deployment

Extract the supplied ZIP, replace the existing GitHub repository contents, commit, and push to `main`. Keep the current Render Start Command, Environment values, database, and persistent media disk unchanged.

## Verification

After Render is Live, hard-refresh the browser and use a member account in a Public Group.

| Step | Expected result |
|---|---|
| Select Like on one Group post | The button highlights, the number becomes 1, and your profile image/initial appears in the small stack. |
| Choose Love instead | The total stays 1 and the visible reaction changes to Love. |
| Press Love again | The reaction is removed and the total decreases by 1. |
| React from two member accounts | The total becomes 2 and both recent member profiles are shown. |
| Create a Group post containing a web URL | The preview card opens the external page when clicked. If preview metadata is unavailable, an active fallback link remains available. |
| Create a Page post containing a web URL | The Page retains a clickable link even when the remote site has no preview card. |

Do not test on sensitive content. Group reaction actions remain within the Group; they do not create a duplicate main Feed reaction or expose Group posts in the personal Feed.
