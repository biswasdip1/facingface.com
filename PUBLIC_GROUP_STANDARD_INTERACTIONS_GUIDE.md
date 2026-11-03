# Public Group Standard Interactions Repair

## Purpose

This release makes Public Group post interaction behaviour consistent with the normal FacingFace post experience while keeping all activity inside the original Public Group.

| Feature | Behaviour after deployment |
|---|---|
| Reactions | Like, Love, Haha, Wow, Sad, and Angry save in a dedicated Group interaction table that does not depend on the incompatible legacy emoji enum. |
| Reaction totals | One member has one active reaction. Changing it does not raise the total; removing it lowers the total. |
| Recent likers | The post displays up to five recent Group members as profile-photo or initial circles plus a numeric total. |
| Comments | Members can add comments, open the discussion count, and remove only their own comments. |
| Repost | A member can repost a Group post inside the same Public Group. The original post keeps a Repost count; it does not appear in the personal Feed. |
| Save | A member can save a Group post. Saved Group posts appear in the existing Saved page under **Saved from Public Groups**. |
| URLs | New Group URLs remain clickable even if a remote website does not return preview metadata. |

## Deployment

Extract the supplied ZIP, replace your GitHub repository contents, commit, and push to `main`. Keep the current Render Start Command, Environment settings, persistent media disk, Gmail configuration, and database unchanged.

At startup, the application safely creates only the new Group interaction tables and indexes if they are missing. It does not delete or rewrite existing Group posts, comments, members, Pages, or main Feed data.

## Safe verification

After Render is Live, hard-refresh the browser and test with a non-sensitive Group post.

| Step | Expected result |
|---|---|
| React once | The Group reaction saves with no error, the button changes colour, and the total becomes 1. |
| React from a second member | The total becomes 2 and two member profile photos/initials are visible. |
| Change Love to Haha | The count stays the same while the selected reaction changes. |
| Add one comment | The visible comment count increases and the comment remains after refresh. |
| Click Repost | A copy appears in the same Group under your name and the original Repost count increases. |
| Click Save | The button changes to Saved. Open Saved from the top navigation and confirm the Group post is listed under **Saved from Public Groups**. |
| Click the preview or Open link | The posted external URL opens in a new browser tab. |

Do not use production-sensitive content for initial testing. If a test fails, retain the screenshot and newest Render log lines after the deployment time before making another change.
