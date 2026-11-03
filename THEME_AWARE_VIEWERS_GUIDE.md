# Theme-Aware Profile Viewers and Focused Media View

## What changed

The Profile viewers summary and the focused photo/video post view now inherit the selected FacingFace theme instead of using fixed pale-blue, white, or black backgrounds.

| Area | Theme-aware behavior |
|---|---|
| Profile viewers | Background, border, count, labels, avatar fallback, and viewer-name text use the active theme colours. |
| Focused photo/video view | The media area behind the photo or video follows the active theme. The close button, zoom controls, photo navigation, image count, caption, tagged-people panel, and discussion panel use matching theme surfaces, borders, and text. |
| Theme switch | Selecting any existing theme updates these areas automatically. No separate setting is needed. |

Photos and videos continue to use their original colours. The adjustment changes only the surrounding application interface so it is consistent with the chosen theme.

## What remains unchanged

Profile viewers remain private to the profile owner. Comments, reactions, tags, zoom, photo navigation, video controls, profile photos, cover photos, posts, and existing theme options remain unchanged.

## Simple test after deployment

Choose each available theme from the existing theme menu. Open your own profile and confirm the Profile viewers card matches the selected theme. Open a published photo or video and confirm that the surrounding media area, buttons, and discussion panel use the same theme rather than a fixed black or white background.

## Deployment

1. Download and extract the complete ZIP supplied with this release.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and display **Live**.

No database migration, Render Environment value, disk setting, Gmail setting, or Start Command change is required.
