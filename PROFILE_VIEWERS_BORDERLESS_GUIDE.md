# Borderless Profile Viewers Summary

## What changed

The visible outer border around the **Profile viewers** summary has been removed. The card remains beside the profile photo and continues to use the selected FacingFace theme background, text colours, viewer count, recent viewer images, and names.

The small divider above the recent-viewer row remains so the information is easy to read. Profile photo controls, cover controls, profile details, viewer privacy, and all other profile features are unchanged.

## Simple test after deployment

Open your own profile on desktop and on a phone. Confirm that the Profile viewers summary remains beside the photo, has no outer box line, and still displays its count and recent viewers. Switch theme if desired and confirm the borderless panel remains readable.

## Deployment

1. Download and extract the complete ZIP supplied with this release.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and show **Live**.

No database migration, Render Environment value, media-disk setting, Gmail setting, or Start Command change is required.
