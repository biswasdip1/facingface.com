# Profile Viewers Beside the Profile Photo

## What changed

The **Profile viewers** summary for the profile owner is now placed beside the profile photo, immediately below the cover area. It no longer appears as a separate panel further down the profile.

| Screen size | Layout |
|---|---|
| Desktop | The profile photo overlaps the cover as before. The Profile viewers card sits neatly beside it, aligned with the bottom of the cover. |
| Mobile | The profile photo remains on the left and the compact Profile viewers card sits beside it below the cover. The Edit Profile button and profile details remain below both. |

The moved card still shows the last-30-days privacy reminder, total count, recent viewer avatars, viewer names, and links to those viewers’ profiles. It remains visible only to the owner of the profile.

## What remains unchanged

Cover-photo changes, profile-photo changes, profile history, profile statistics, profile editing, posts, followers, and all profile privacy rules remain unchanged. There is no database or environment setting change.

## Simple test after deployment

Open your own profile on desktop and on a phone. Confirm that **Profile viewers** is beside the profile photo under the cover. Open another member’s profile and confirm the Profile viewers card is not shown.

## Deployment

1. Download and extract the complete ZIP provided with this release.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to complete its automatic deployment and show **Live**.
