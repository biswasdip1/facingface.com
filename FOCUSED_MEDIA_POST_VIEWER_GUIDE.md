# Focused Photo and Video Post Viewer

## What has changed

When a member clicks a photo or video published on the FacingFace wall, the item now opens as a **focused post view** instead of a media-only black screen.

The new view uses a Facebook-style layout. The selected photo or video appears large on the left, while the complete post appears on the right on desktop screens. A compact photo toolbar provides zoom in, zoom out, reset, and tagged-people controls. The right panel keeps the existing post author, privacy label, tagged people, feeling, check-in, written post text, reactions, comments, replies, reshare controls, sharing, and save controls. On a phone, the layout stacks naturally with the media first and the complete discussion below it.

| Existing wall action | New result |
|---|---|
| Click a published photo | Opens `/post/<post-id>?media=<photo-number>` with the selected photo and its full post discussion. This exact link now reliably activates the focused viewer. |
| Click a multi-photo post | Opens the selected photo and provides previous/next navigation. |
| Click a published video | Opens the same focused post view with the video player and full discussion. |
| Click Close | Returns to the normal post page. |
| Click the magnifying-glass **+** or **−** buttons | Enlarges or reduces the selected photo in 25% steps; the circular reset button returns it to normal size. |
| Click the **Tag** icon | Opens the people already tagged on that post, with a direct link to each person’s profile. It displays a clear message when no one has been tagged. |
| Comments | The post detail view now has one complete comment thread and one comment-entry box only. |
| Use reactions, comments, tags, share, reshare, or save | Uses the existing FacingFace controls and storage; no social data is reset or replaced. |

## What remains unchanged

This focused repair changes only **published wall photo and video clicks**. It does not remove the separate profile-photo, cover-photo, or gallery lightboxes. It does not alter existing users, posts, comments, Pages, Groups, media storage, database configuration, Gmail, Render settings, or the start command.

## Deployment

1. Download and extract the complete ZIP supplied with this release.
2. Replace the contents of the FacingFace GitHub repository with the extracted files.
3. Commit and push to the `main` branch.
4. Wait until Render completes its normal automatic deploy and displays **Live**.

No new Render environment value, database migration, disk change, email setting, or startup-command change is required.

## Simple test after deployment

Use a normal photo post and a normal video post. Click the image or the video play area. Confirm that the large media opens together with the author details, tags, reactions, and one complete comment thread with one comment input. For photos, test the **+**, **−**, reset, and **Tag** buttons in the toolbar. Add a test comment, then close the view and confirm the comment remains on the original wall post.
