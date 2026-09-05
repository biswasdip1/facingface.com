# Live Friend Post Flash Guide

## What is New

FacingFace now shows an in-app flash alert when an **accepted friend** publishes a normal wall post while you are using the website. The alert shows the friend’s name and profile image, remains visible for up to eight seconds, and opens the post when selected.

| Situation | Result |
| --- | --- |
| An accepted friend posts while you are signed in to FacingFace | A blue flash alert appears with a **View** button. |
| You select the alert | FacingFace opens the new post. |
| The friend publishes a Private post | Only their accepted friends can receive the alert or open the post. |
| The poster publishes their own post | They do not receive their own alert. |
| You are not using FacingFace or the browser is closed | No alert appears. This release is the agreed live in-app notification option. |

## Privacy and Security

The server calculates recipients from accepted friendship records only. Pending requests, followers, strangers, and blocked access paths do not receive the event. The real-time message contains **no post text, photos, videos, links, or other post content**. Selecting the alert opens the normal post page, which enforces the existing Public/Private audience rule again.

Socket connections now identify the signed-in member from the existing FacingFace session cookie rather than relying on a browser-supplied user ID. This also preserves delivery when a member has more than one FacingFace page open.

## Two-Account Check

1. Sign in to two accepted-friend accounts in separate browser sessions or devices.
2. Leave the receiving account on any signed-in FacingFace page.
3. Publish a normal Public post from the other account. A blue flash alert should appear immediately on the receiving account.
4. Select **View** and confirm that the post opens.
5. Repeat with a Private post. The accepted friend should receive and open it; a non-friend should receive nothing and cannot open the post by URL.

## Deployment

No Render settings need changing. Keep the existing Start Command, PostgreSQL database, persistent media disk, Gmail settings, and `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` unchanged. Upload the complete source to GitHub and push to your normal `main` branch; Render will deploy in the usual way.
