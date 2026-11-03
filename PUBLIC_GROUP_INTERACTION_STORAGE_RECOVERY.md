# Public Group Interaction Storage Recovery

## What this update fixes

This recovery addresses the live message **“Group reactions are temporarily unavailable.”** The visible Group interaction controls were present, but their first storage implementation could conflict with an incomplete legacy database structure. This release uses a dedicated, independent Public Group interaction store.

| Public Group feature | Storage after this update |
|---|---|
| Like, Love, Haha, Wow, Sad, Angry | `public_group_post_reaction_records` |
| One reaction per member per Group post | Unique Group-post/member record |
| Recent liker profile circles and totals | Calculated from the durable Group reaction records |
| Save / unsave | `public_group_post_saved_records` |
| Repost | Creates a new post only inside the original Public Group and increments the original repost total |
| Comments | Remain in the existing scoped Public Group comment store |

The application creates these two new small tables and their indexes automatically on first startup if they are not already present. It does not run the old global migration history and does not alter existing users, posts, Pages, memberships, images, email settings, or normal Feed reactions.

## Deployment

Extract the supplied ZIP, replace the contents of the GitHub repository, commit, and push to `main`. Keep the existing Render Start Command, Environment variables, persistent media disk, and PostgreSQL database unchanged.

## Verify after Render is Live

Hard-refresh the Group page and test in this order using a non-sensitive Group post.

| Test | Expected result |
|---|---|
| Click Like | No unavailable/error toast; Like is selected and the total becomes 1. |
| Select Love | The selected reaction changes; the total stays 1. |
| Refresh | The selected reaction and total remain visible. |
| React from a second Group member | The total becomes 2 and recent liker photos/initials appear. |
| Add a comment | It persists and the count updates. |
| Click Repost | A copy appears inside the same Group under the current member. |
| Click Save | The button changes to Saved and the item appears in Saved under **Saved from Public Groups**. |

If the new deployment still shows an error, retain a screenshot of the newest Render log entries after deployment rather than making further environment changes.
