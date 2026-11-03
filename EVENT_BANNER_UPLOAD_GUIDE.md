# Event Banner Upload Guide

## What Changed

When creating an Event, the host can now select an optional **Event banner** image. The form shows a preview before the Event is created. The banner appears at the top of the Event card for the host and invited accepted friends.

| Area | Behaviour |
| --- | --- |
| Event creation | Select **Upload an Event banner** before creating the Event. |
| Accepted files | Image files only. |
| Size limit | Up to 10 MB, subject to the existing FacingFace photo limit. |
| Preview | The host sees the selected image before creating the Event. |
| Visibility | Private to the Event host and invited accepted friends, the same as the Event. |
| Existing Events | Continue to work normally without a banner. |

## Quick Check

1. Open **Events** and choose **Create event**.
2. Select **Upload an Event banner** and choose an image.
3. Confirm the preview is correct, complete the Event information, select accepted friends, and choose **Create and invite**.
4. Confirm the event card displays the banner.
5. Sign in as an invited friend and confirm the same banner displays with the Event invitation.

## Render Settings

No Render setting changes are required. Keep the current persistent disk media configuration, Start Command, PostgreSQL database, email configuration, and `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` unchanged. On deployment, FacingFace safely adds the single missing Event banner column if needed; it does not reset or migrate existing data globally.
