# Floating Individual Chat Guide

## What is new

FacingFace now has Facebook-style floating **individual direct-message** windows on desktop. The full **Messages** page and Group chats are unchanged.

| Item | Behaviour |
| --- | --- |
| Profile Message button | Opens a compact individual chat window after the existing secure conversation is created or found. |
| Chats button | Appears in the lower-right corner on desktop and opens a tray of recent direct conversations. |
| Floating chat | Shows the recent messages, a direct reply field, a simple emoji button, minimise, and close controls. |
| Minimise | Turns a chat into a small name-and-avatar bar at the bottom of the screen. |
| Close | Removes only the local pop-up. It never deletes the conversation or messages. |
| Full Messages page | Remains the place for Group chats, calls, attachments, reactions, voice messages, pins, and advanced message controls. |

## Privacy and delivery

Every pop-up retrieves messages through the existing participant-authorized direct-message procedures. The real-time socket signal carries only a conversation ID—not message text, photos, or files—and causes authorized clients to reload the conversation safely. Existing encrypted direct-message storage, unread counts, mute settings, and push notifications remain unchanged.

## Simple verification

1. Log in as two accepted friends using two separate browser sessions.
2. Open one member’s Profile and select **Message**. A small chat window should open at the lower-right of the first session.
3. Send a short message. The second session’s Chats button should show an unread count and the message should appear immediately when its conversation is opened.
4. Minimise, restore, and close the chat. Confirm the conversation remains in the Chats tray and on the full Messages page.
5. Confirm that Group chats continue to open only from the normal Messages area.

## Deployment

Deploy through the normal GitHub-to-Render process. No Render environment variables, database reset, migration switch, persistent disk settings, email settings, or Start Command changes are required.

## Validation

The production build passed. Focused direct-message-adjacent friend-alert and privacy checks passed before an unrelated legacy video-fixture test stalled during frame extraction.
