# FacingFace Page & Public Group Standard Posts

## Purpose

This release standardises **new Page and Public Group posts** against the established main Feed experience while retaining existing data and preventing Page or Group content from appearing in the ordinary personal Feed.

## What Is Included

| Area | New behaviour |
|---|---|
| Page posts | The Page timeline now uses the standard post card for rich text, large colour posts, photos, video, audio, documents, active URLs, URL preview cards, reactions, and comments. |
| Public Group posts | Public Groups now support large colour posts, photos, video, audio, documents, clickable URL previews, emoji reactions, and member-only comment threads. |
| URL previews | New Page and Group posts receive preview metadata through the existing protected preview service and remain within their own Page or Group context. |
| Isolation | New Page posts use a dedicated Page marker. Older Page posts remain readable through the existing legacy marker. Neither is shown in the ordinary personal Feed. |
| Comments | Public Group comments use a dedicated storage table, preventing conflicts with normal post comments. Only Group members may create or delete their own comments. |

## Deployment

Extract the supplied ZIP, replace the contents of the existing GitHub repository, commit the changes, and push to `main`. Keep all existing Render configuration unchanged, including the Start Command, environment variables, database, and persistent disk.

The application creates only two missing compatibility structures at startup if needed: the `posts.pageId` column and the `public_group_post_comments` table plus its index. Existing users, Pages, Groups, posts, media, reactions, and comments are not deleted or rewritten.

## Safe Verification

Perform the following checks with a non-sensitive test Page and a test Public Group. Use a member account for the Group comment check.

| Step | Expected result |
|---|---|
| Create a Page colour post | It is shown large and centred with the selected background. |
| Add one web URL to a new Page post | A clickable preview card is shown; it does not appear on the main personal Feed. |
| Create a Group colour post | It is shown large and centred in that Group. |
| Add one URL to a new Group post | A clickable preview card is shown within the Group. |
| Add an image through the Group composer | The post is accepted and displays the image. |
| Add a Group reaction | The emoji count updates and remains after refresh. |
| Add a Group comment | The count updates; the comment remains after refresh and is visible to Group members. |

Existing URL-only Page posts created before this release will remain as text links because their historical preview details were not saved at the time. New URL posts use the full preview format.

## Operational Notes

Do not delete the Render database, media disk, or existing Page/Group data. If an individual external site does not expose preview metadata, FacingFace still retains the original URL as post content. The application does not generate previews by scraping private or login-protected web pages.
