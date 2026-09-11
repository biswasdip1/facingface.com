# Wider LinkedIn-style Desktop Layout Guide

## What Changed

FacingFace now uses more of a large desktop screen on the main Feed. The layout follows a clean LinkedIn-style proportion rather than an intentionally narrow X-style reading column.

| Desktop area | Updated layout |
| --- | --- |
| Overall Feed shell | Widens only on large desktop screens, up to 1,520 px. |
| Left sidebar | 250–260 px for navigation and the existing Event/Birthday summaries. |
| Main Feed | 700–720 px, keeping posts comfortable to read while using the screen better. |
| Right sidebar | 320–340 px for the existing News feed. |
| Top navigation | Uses the same wider shell, with a larger search area and better spacing. |

## Responsive Behaviour

The wider layout applies only at desktop size. Existing mobile and tablet behaviour remains unchanged. The right News column stays hidden below the existing extra-large-screen breakpoint, while the Feed remains usable at all smaller widths.

## Verification

1. Open the Home Feed on a wide desktop screen.
2. Confirm that the left navigation, main Feed, and News sidebar use the screen more evenly.
3. Confirm that the top header aligns with the wider Feed content.
4. Reduce the browser width or use a phone/tablet; confirm the normal responsive layout remains intact.
5. Confirm that posting, stories, Feed cards, adverts, reels, People You May Know, Suggested Pages, and the News feed still work as before.

## Deployment

No Render setting changes are required. Keep the current Start Command, PostgreSQL database, persistent media disk, Gmail settings, and `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` unchanged. Deploy the complete ZIP through the normal GitHub-to-Render process.
