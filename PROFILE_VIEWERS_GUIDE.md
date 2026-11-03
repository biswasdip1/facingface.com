# Profile Viewers Guide

## What is new

FacingFace now has a private **Profile Viewers** feature. It appears above **Get Verified** in the desktop Home left sidebar and also as a compact card on the owner’s Profile page.

The number shows how many distinct signed-in members viewed the profile during the **last 30 days**. The owner can see up to five recent viewer names and profile images on their own Profile page.

## Privacy rules

| Rule | Behaviour |
| --- | --- |
| Owner-only summary | Only the owner of a profile can request or see its viewer count and recent viewers. |
| No self-view | Opening your own Profile does not create a view record. |
| Daily deduplication | The same visitor is counted at most once for the same Profile in a 24-hour period. |
| Recent retention | Viewer records older than 30 days are removed automatically when new tracking occurs. |
| No public exposure | Visitors cannot see whether they were recorded, and no viewer data appears in another person’s Profile or public API response. |

## Simple verification

Use two normal FacingFace accounts. Sign in as **Account A**, then open **Account B**’s Profile. After returning to Account B’s Home or Profile page, Account B should see the Profile Viewers total increase, with Account A in the recent viewer list. Reloading Account A’s visit several times on the same day should not increase the number again.

No Render environment, database reset, persistent disk, Start Command, or email setting needs to change. The existing safe runtime compatibility check creates the required table and indexes during deployment.
