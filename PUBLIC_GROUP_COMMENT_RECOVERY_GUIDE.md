# Public Group Comment Recovery

## What this release corrects

The Group reaction system is now live, but the existing Public Group comment table could not be provisioned reliably on the older Render database. This update moves Group comments to a dedicated, independent record store, just as the successful Group reaction repair uses its own dedicated store.

| Area | After deployment |
|---|---|
| Comment records | Stored in `public_group_post_comment_records`, created automatically when the service starts. |
| Existing Group posts | Preserved. No post, membership, Page, main Feed item, image, or email configuration is changed. |
| Comment count | Counts are loaded from the durable Group comment records and update after a successful comment. |
| Comment permissions | Only a Group member may add a comment; a member can delete only their own comment. |
| Interaction layout | The reaction summary and Like control use a compact shared row above the Comment, Repost, and Save actions. |

## Deployment

Extract the supplied ZIP, replace the contents of the GitHub repository, commit, and push to `main`. Keep the existing Render Start Command, Environment variables, persistent disk, Gmail configuration, and PostgreSQL service unchanged.

## Safe verification

After Render is **Live**, use a non-sensitive Public Group post and hard-refresh the browser.

| Step | Expected result |
|---|---|
| Click Comment | The comment field opens under the post. |
| Enter a short comment and send | No unavailable-message appears; the text is shown immediately. |
| Refresh the Group page | The comment remains and the comment count is retained. |
| React once | The existing reaction total and profile-photo pile remain visible. |
| Click Repost and Save | The controls still work as before. |

If the new deployment produces an error, keep the newest Render log lines after the deployment time and do not change environment settings.
