# Group Chat and Call Finder Update

## What improved

This update makes Group chat feel closer to Messenger while keeping every existing group, group message, member role, pinned message, reaction, mute setting, and call control in place. It also adds a dedicated friend finder to the Calls page.

| Area | New behavior |
|---|---|
| Group chat list | The Groups page now has a compact Messenger-style inbox with group avatars, names, descriptions, selected-chat highlighting, a larger comfortable layout, and a clear empty state. |
| Find a group | Use **Find a group** to search your existing groups by name or description. |
| Unified Messenger | Choose **Open groups in Messenger** on the Groups page, or the chat-bubble control in an open group on desktop. This opens the existing full Messenger page on its Groups tab. A selected group opens directly using a safe link such as `/messages?tab=groups&group=123`. |
| Group controls | Member management, adding members, group logo, notifications, pinned messages, reactions, group voice calls, group video calls, and leave-group controls are unchanged. |
| Calls page | The Friends tab now includes a visible **Find a friend to call** search field. Search an accepted friend by name, open their profile from the result, or start a voice or video call. |
| Call history | The existing History tab remains unchanged, including callback buttons. |

## Simple test after deployment

First, open **Groups**. Confirm the group list, group search, and a selected group chat work. Choose **Open groups in Messenger**, then confirm the Messenger page opens on the Groups tab. Next, open **Calls**, type a friend’s name in **Find a friend to call**, and use the Call or Video button on the correct result.

## Deployment

1. Download and extract the complete ZIP supplied with this update.
2. Replace the contents of your FacingFace GitHub repository with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to deploy automatically and show **Live**.

No database reset, migration, Render Environment variable, media-disk setting, Gmail setting, or Start Command change is required.
