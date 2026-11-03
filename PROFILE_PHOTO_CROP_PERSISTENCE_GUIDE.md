# Profile Photo Centre-and-Save Repair

## What is corrected

The profile-photo adjustment preview now matches the photo that is saved.

| Action | Correct behavior |
|---|---|
| Choose a new profile photo | Opens the round adjustment preview with the image centred by default. |
| Drag the photo in the round preview | Moves the exact part of the image that will be shown in the final profile photo. |
| Click **Save Photo** | Saves a square profile-photo image using the exact selected position. It displays consistently on the profile, navigation, messages, posts, and other devices. |
| Click **Cancel** | Closes the preview, removes the temporary image, and leaves the current saved profile photo unchanged. |

The profile-photo history remains available. This repair does not delete earlier profile photos.

## Simple test after deployment

Open your profile and choose **Change profile photo**. Select a portrait image, drag it so the face is centred in the round preview, then choose **Save Photo**. After the page updates, confirm the saved photo has the same centred position. Repeat with **Cancel** to confirm your existing profile photo remains unchanged.

## Deployment

1. Download and extract the complete ZIP supplied with this update.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and show **Live**.

No database reset, migration, Render Environment variable, media-disk setting, Gmail setting, or Start Command change is required.
