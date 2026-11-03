# Vertical Video / YouTube Shorts Repair

## What is corrected

A vertical YouTube Shorts link now creates one clean video post rather than two separate sections.

| Situation | Correct behavior after this update |
|---|---|
| Paste a YouTube Shorts link while writing a post | The composer shows a small vertical **YouTube Short** preview. It does not show long or unrelated description text from YouTube. |
| Publish a YouTube Shorts link | The wall shows one centred vertical YouTube player only. The duplicate thumbnail and link-preview card below it are removed. |
| Paste an ordinary YouTube video link | The wall shows one normal wide YouTube player only. It also does not show a second generic link card underneath. |
| Paste another website link | The normal website link preview remains unchanged. |

The original link is still saved for sharing and YouTube controls. Existing normal posts, reels, uploaded videos, Page posts, Public Group posts, comments, reactions, privacy, and media files are unchanged.

## Simple check after deployment

1. Create a new wall post with a YouTube Shorts link, for example a link beginning `https://youtube.com/shorts/`.
2. Before publishing, confirm the preview says **YouTube Short** and does not show unnecessary long metadata.
3. Publish the post.
4. Confirm there is one vertical player and no duplicate lower thumbnail/card.
5. Test one normal YouTube `watch?v=` link to confirm it displays as one wide video player.

## Deployment

1. Download and extract the complete ZIP supplied with this update.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and show **Live**.

No database reset, migration, Render Environment variable, media-disk setting, Gmail setting, or Start Command change is required.
