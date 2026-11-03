# Header Account Controls

This release updates the **desktop** FacingFace header so the main account controls are visible together at the far right.

| Control | Behaviour |
|---|---|
| Admin | Visible only for administrators and super-administrators. Opens the existing Admin panel. |
| Settings | Opens the existing account/settings menu. |
| Sign Out | A visible red desktop button that uses the existing secure logout flow. |

The mobile header retains its existing compact account menu and sign-out option, so mobile navigation is not crowded by a new permanent button.

## Deployment

1. Download and extract the accompanying ZIP.
2. Replace the contents of the GitHub repository with the extracted files. Do not add another enclosing folder.
3. Commit and push to `main`.
4. Wait for Render to show **Live**.
5. Hard refresh the website with `Ctrl + Shift + R`.

No Render settings, environment variables, database changes, disk changes, or start-command changes are required.

## Check

On a desktop browser, verify that **Admin**, the **Settings** gear, and **Sign Out** appear together at the far right. Open Settings to confirm the existing account menu still opens. Do not click Sign Out until you are ready to end the test session.
