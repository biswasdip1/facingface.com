# Facebook-Style Messenger Chats Tray

## What changed

On a desktop or laptop, clicking **Messages** in the main FacingFace navigation now opens a compact **Chats** panel in place, similar to a social-media Messenger inbox. It does not take the member away from the page they were reading.

| Action | Result |
|---|---|
| Click **Messages** in the desktop navigation | Opens or closes the Chats panel at the top-right of the page. |
| Search chats | Finds a person by name in the recent-chat list. |
| Choose **All** or **Unread** | Shows all recent conversations or only conversations with unread messages. |
| Click a person | Opens that individual conversation in a compact floating message box. |
| Use the floating message box | Send messages, use emoji, minimise or close the chat, and start voice/video calls as before. |
| Click **Open full Messenger** | Opens the existing full `/messages` page for the complete inbox and group-chat tools. |

On a phone, the existing mobile-friendly Messages page continues to open from the Messages icon. This avoids a narrow desktop popup on a small screen.

## What remains unchanged

Existing direct messages, unread counts, message search, files, emoji, calls, block/mute controls, read receipts, group messaging, mobile conversation mode, and privacy/security rules are unchanged.

## Simple test after deployment

On a desktop, open the FacingFace home page and click **Messages** in the top menu. Confirm the Chats panel opens. Select a person and confirm a conversation box appears in the bottom-right corner. Send a short message, minimise and restore the box, then close it. On a phone, tap Messages and confirm the normal mobile chat page still works.

## Deployment

1. Download and extract the complete ZIP supplied with this release.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and show **Live**.

No database migration, Render Environment value, media-disk setting, Gmail setting, or Start Command change is required.
