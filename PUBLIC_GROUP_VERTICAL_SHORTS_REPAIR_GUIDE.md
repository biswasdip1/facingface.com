# Public Group Vertical Shorts Repair

## What is corrected

Public Group posts now recognise a YouTube Shorts link as a vertical video.

| Situation | Correct behavior after this update |
|---|---|
| Post a `youtube.com/shorts/` link in a Public Group | The group post shows one centred vertical YouTube Short player. |
| Vertical Shorts thumbnail | It is no longer stretched or forced into a horizontal preview card. |
| Short metadata | The duplicate link-preview card and unwanted long YouTube metadata below the video are removed. |
| Ordinary YouTube video link in a Public Group | Keeps the existing normal YouTube link-card layout. |
| Other website link in a Public Group | Keeps the existing normal website preview layout. |

Group reactions, comments, reposting, saving, post privacy, moderation, group membership, Pages, personal feed posts, Reels, and uploaded video files are not changed.

## Simple check after deployment

1. Open a Public Group.
2. Post a YouTube Shorts URL beginning `https://youtube.com/shorts/`.
3. Confirm the published result is one vertical player, centred in the group post.
4. Confirm no horizontal thumbnail and no second metadata card appears underneath.
5. Test an ordinary website link and a standard YouTube link to confirm their usual preview layouts remain available.

## Deployment

1. Download and extract the complete ZIP supplied with this update.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and show **Live**.

No database reset, migration, Render Environment variable, media-disk setting, Gmail setting, or Start Command change is required.
