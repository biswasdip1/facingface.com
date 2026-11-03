# Mobile Profile Message Repair

## What changed

The **Message** button on another member’s Profile now has a working mobile destination.

| Device | Message button behaviour |
| --- | --- |
| Desktop | Opens the compact floating individual chat window. |
| Mobile browser | Opens the existing full **Messages** page with that direct conversation selected. |

## Why this repair was needed

Floating chat windows are intentionally hidden below the desktop breakpoint to keep mobile screens clear. The Profile button was still sending the desktop-only floating-chat event on mobile, so it appeared to do nothing. It now routes to the already-authorized full conversation page instead.

## Verification

1. On a mobile browser, open another member’s Profile.
2. Select **Message**.
3. Confirm that the full Messages page opens directly to that individual conversation.
4. On desktop, confirm that the same Profile button still opens the floating chat window.

No Render settings, database reset, persistent disk, Start Command, or email configuration needs changing.
