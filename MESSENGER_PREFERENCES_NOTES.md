# FacingFace Messenger Preferences Update

This package is based on the previously merged `facingface-17-May-2026-4th-with-chat.zip` website package and adds a Messenger-style **Preferences** panel for `chat.facingface.com`.

## Added features

| Area | Update |
|---|---|
| Preferences panel | Added a Messenger-style modal opened from the settings button in the Messenger sidebar. |
| Account section | Shows the signed-in user's avatar, name, and profile hint. |
| Active Status | Added an **Active Status: ON/OFF** control. When off, the browser enters passive mode and stops refreshing presence from this Messenger session. |
| Notification sounds | Added persistent notification sound preference using a lightweight browser-generated Messenger-style tone for new messages and incoming calls. |
| Do Not Disturb | Added persistent Do Not Disturb control that mutes Messenger notification sounds while enabled. |
| Dark Mode | Added Off, On, and Automatic Messenger dark-mode controls using the existing FacingFace theme-mode system. |

## Validation

The updated merged package was validated locally with:

```bash
pnpm check
pnpm build
```

Both commands completed successfully. The build still reports the same non-blocking local environment warnings about analytics placeholders and bundle size that were present before this preferences update.

## Deployment note

Upload this full package to the same existing FacingFace GitHub repository and redeploy the same Render service. The same application continues to serve both domains:

| Domain | Result |
|---|---|
| `www.facingface.com` | Normal FacingFace website |
| `chat.facingface.com` | Dedicated Messenger experience with Preferences |
