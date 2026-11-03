# FacingFace Reaction Counts and Reel Likes Repair

## Purpose

This cumulative update repairs the post and Reel reaction paths without changing any Render settings, email settings, media storage, Pages, Groups, or account controls. It ensures that visible counts are calculated from the durable member-reaction records rather than an out-of-date display value.

## What Changed

| Area | Updated behavior |
|---|---|
| Post reaction totals | Each member contributes one effective reaction to a post. Fifteen different members produce a visible total of `15`. |
| Existing legacy Likes | Historic Like records remain visible and count correctly after a refresh. A typed reaction takes precedence when the same member has both a legacy Like and a newer reaction record. |
| Liker avatars | Up to five recent reacting members are displayed as a compact avatar stack beside the reaction icons and total. A member initial is used if no profile picture exists. |
| Duplicate safeguards | Startup quietly removes only accidental duplicate reaction rows for the same member/content pair, retaining the newest row, and adds one-per-member indexes to prevent future duplicates. |
| Reel Likes | The Reel Like total is derived from the authoritative `reel_likes` records and synchronised to the historic display field. It updates immediately, survives refresh, and is protected from rapid double taps. |

## Deployment

Extract the supplied ZIP, replace the files in the existing GitHub repository, commit, and push to `main`. Render deploys automatically. Do not change the Render Start Command, Environment, database, or disk.

## Safe Verification

Use two normal member accounts and one non-sensitive test post.

1. Account A selects Like. Confirm the post displays `1` and Account A's image or initial.
2. Account B selects Love. Confirm the post displays `2`, shows the reaction icons, and displays both members in the avatar stack.
3. Refresh the browser. Confirm the total remains `2`.
4. Change Account A from Like to Haha. Confirm the total remains `2`, not `3`.
5. Remove Account A's reaction. Confirm the total becomes `1`.
6. For a test Reel, select Like, refresh the Reels page, and confirm the numeric count remains accurate. Select Like again to remove it and confirm the count falls by one.

If a test fails, do not repeat-click. Note the post or Reel URL and the newest Render log line so the exact affected path can be investigated.
