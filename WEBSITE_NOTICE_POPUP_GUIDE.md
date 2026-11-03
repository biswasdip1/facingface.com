# Website Notice Pop-up Guide

## Purpose

FacingFace now has a **Website Notice pop-up** for important platform announcements. It is designed for occasional notices such as maintenance, a new feature, a community update, or a safety message. It should not be used for everyday posts or advertising.

| Location | Behaviour |
| --- | --- |
| Before login | A visible notice appears once over the FacingFace login page. |
| After login | The same notice appears once when a signed-in member returns to FacingFace. |
| After closing | The notice stays closed for that version on that browser and account. |
| After a new publish | A new version is shown once again. |

## Admin Controls

Open **Admin → Website Notice**. This tab is available to the **Super Admin** and provides the following controls.

| Control | Use |
| --- | --- |
| Notice title | A clear short heading, up to 180 characters. |
| Notice message | The main announcement text. |
| Upload photo | An optional FacingFace-hosted image, up to 10 MB. |
| Video URL | An optional HTTPS YouTube or Vimeo link, played inside the notice. |
| Preview pop-up | Shows the notice before publishing. |
| Save as hidden | Saves the text and media without displaying it. |
| Publish notice | Makes the notice visible to visitors and members. |
| Hide notice now | Stops the current notice immediately while retaining its content for later editing. |

## Safety and Privacy

Only a Super Admin can publish, hide, or edit the notice. Notice photos must use the existing FacingFace persistent-media system. Video links are restricted to HTTPS YouTube and Vimeo links. The public pop-up exposes only the published title, message, and optional media; it does not include administrator information, member data, or private posts.

## Quick Verification

1. Open **Admin → Website Notice** and enter a title and message.
2. Optionally upload a photo or add a YouTube/Vimeo link.
3. Select **Preview pop-up** and confirm the appearance.
4. Select **Publish notice**.
5. Open FacingFace in a private/incognito browser window and confirm the notice appears before login.
6. Sign in with a test account and confirm it appears once after login.
7. Close it, refresh, and confirm it does not repeat for that notice version.
8. Use **Hide notice now** when the notice is no longer needed.

## Deployment

No Render setting needs changing. Keep the existing Start Command, PostgreSQL database, persistent media disk, Gmail settings, and `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` unchanged. Deploy the complete ZIP through the normal GitHub-to-Render process.
