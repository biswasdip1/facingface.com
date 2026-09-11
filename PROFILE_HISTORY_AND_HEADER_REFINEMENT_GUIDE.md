# FacingFace Profile, Photo History, and Header Refinement

## What has changed

The Profile page now has a wider, cleaner and more professional desktop presentation. The cover area is taller, the main profile photo is larger, the profile title is clearer, and the cover image no longer moves while the page is scrolled. This keeps the crop position stable.

The desktop top navigation now has slightly larger logo text, search text, navigation labels, and icons on large screens. Mobile and tablet navigation behaviour remains unchanged.

| Area | New behaviour |
| --- | --- |
| Cover photo | The selected framing is saved with each cover image and restored when that image is selected again. |
| Profile and cover history | Every new image uploaded from the main Profile header is retained in the saved history. Existing current profile and cover images are preserved in the history after deployment. |
| Switching images | Open **Profile & Cover History**, hover or tap a saved image, then use the star button to make it active again. |
| Deleting the active image | FacingFace automatically switches to the newest remaining saved image instead of leaving the profile blank. |
| Retention | There is no small five-image limit. Members can retain more than five saved profile and cover choices until they delete individual images. |
| Passkeys | **Security & Passkeys** remains available to the account owner but is now a compact expandable section. |

## Simple verification

First, open your own profile and choose **Change cover**. Drag the cover image to the preferred position, save it, then open **Profile & Cover History**. Select a previous cover image and confirm that its own saved crop position returns.

Next, change the profile photo once or twice. Open **Profile & Cover History** and use the star button on an earlier photo. The Profile header should immediately switch back to that image. The same process works for cover photos.

Finally, click the compact **Security & Passkeys** row. The passkey controls should expand only when you choose to use them.

## Deployment

Deploy this release through the usual GitHub-to-Render process. Do not change the Render Start Command, database, persistent disk, media configuration, SMTP settings, or existing environment variables. The production server applies the small, idempotent history compatibility update automatically at startup; global migrations remain disabled as before.

## Validation notes

The production bundle passed. The focused storage regression checks passed. The repository-wide TypeScript check still reports pre-existing diagnostics in unrelated navigation and Feed source areas; no new diagnostic was reported from the Profile, photo-history, cover crop, or header refinements.

## Test note

A broader legacy social-media test file reached an unrelated video-frame fixture issue and was stopped after the focused storage tests passed. This does not affect the deployed Profile or media-history code path.
