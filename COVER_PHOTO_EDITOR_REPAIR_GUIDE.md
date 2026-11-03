# Cover Photo Editing Repair

## What is corrected

Changing a cover photo is now separate from viewing a cover photo.

| Action | Correct behavior |
|---|---|
| Click **Change Cover** | Opens the normal file chooser and then the cover repositioning editor. It does not open the black full-screen photo viewer. |
| Select a new cover | Shows a temporary preview only. The new image is not uploaded or made active yet. |
| Drag the preview | Repositions the temporary cover preview. |
| Click **Cancel** | Closes the editor, clears the temporary preview, and keeps the currently saved cover unchanged. The temporary file is not uploaded or saved. |
| Click **Save Cover** | Uploads and applies the selected cover deliberately. |
| Click the existing cover photo normally | Opens the normal full-screen photo viewer only when no cover edit is in progress. |

Existing saved cover-photo history remains available and is not deleted by this correction.

## Deployment

1. Download and extract the complete ZIP supplied with this update.
2. Replace the files in your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and show **Live**.

No database reset, migration, Render Environment variable, media-disk setting, Gmail setting, or Start Command change is required.

## Simple check after deployment

Open your profile and select **Change Cover**. Choose an image and confirm the crop/reposition editor appears without the black photo viewer. Press **Cancel** and confirm your existing cover is unchanged. Then repeat with a test image and select **Save Cover** only when you are ready to apply it.
