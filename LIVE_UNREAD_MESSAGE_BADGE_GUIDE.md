# Live Unread Message Badge

## What changed

FacingFace now shows a clearer red unread-message number on the top **Messages** icon, similar to Facebook. The number is the total of unread direct messages across the signed-in member’s conversations. It shows `9+` when the count is greater than nine.

The small unread number beside an individual conversation in the full Messages page remains unchanged.

## Live updates

When a new direct message arrives while FacingFace is open, the existing authenticated direct-message refresh event now immediately refreshes the top badge. The badge also refreshes when the browser window regains focus. This removes the previous wait for the standard periodic refresh.

## Privacy

The count is still calculated by FacingFace’s existing protected unread-message endpoint. It contains no message text, sender content, photos, or files. Only the signed-in member can request their own unread total.

## Quick verification

1. Sign into two accounts in separate browsers.
2. Leave Account B on the FacingFace Home page.
3. Send a direct message from Account A to Account B.
4. Confirm that Account B’s top **Messages** icon immediately shows a red number.
5. Open and read the message; confirm the number reduces or disappears after the message is marked as read.

No Render settings, database reset, persistent disk, Start Command, or email settings need changing.
