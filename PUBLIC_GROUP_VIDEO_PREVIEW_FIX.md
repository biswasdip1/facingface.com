# Public Group Video Preview Repair

## What This Release Fixes

Public Group posts now show a visible preview for YouTube URLs. The repair addresses the case where FacingFace could save the video title and description but YouTube did not supply a usable thumbnail image.

| Post type | Preview behaviour after deployment |
| --- | --- |
| New YouTube URL posted in a Public Group | FacingFace stores a reliable YouTube preview image with the Group post. |
| Existing YouTube URL in a Public Group with no stored image | FacingFace adds a thumbnail fallback while reading the post; no data reset or manual database repair is required. |
| YouTube video whose remote thumbnail is unavailable | The Group post shows a clear red **YouTube video** panel rather than an empty preview area. |
| Non-YouTube links | Existing Open Graph and Twitter-card preview behaviour remains unchanged. |

## How to Verify

After the normal GitHub and Render deployment completes, open a Public Group that has a YouTube link post and refresh the page once. The post should show either the video thumbnail or the red YouTube video preview panel above its title and description.

Then create a new Group post with a standard `youtu.be` or `youtube.com/watch` URL. The published Group post should show the image preview immediately. The ordinary Feed, Pages, Group privacy, comments, reactions, reposts, saves, and the existing Dark Blue theme are unchanged.

## Render Settings

No Render setting changes are needed. Keep the current Start Command, PostgreSQL database, persistent disk, media configuration, Gmail/SMTP values, and other environment variables as they are.
