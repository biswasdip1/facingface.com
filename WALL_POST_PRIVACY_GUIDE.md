# FacingFace Wall-Post Privacy Update

## Purpose

This cumulative release adds a **Public** and **Private** audience choice to ordinary personal wall posts. It does not reset or remove existing users, posts, Pages, Groups, media, database records, email configuration, or the Render persistent disk.

| Audience | Who can view the normal wall post | Where it appears |
| --- | --- | --- |
| **Public** | Anyone who can normally access FacingFace | The ordinary Feed, profile timeline, search, hashtag results, media galleries, and Trending as applicable. |
| **Private** | The author and **accepted friends only** | The author’s and accepted friends’ authorized views only. It is omitted for strangers, pending requests, and signed-out visitors. |

> Existing wall posts remain **Public** automatically. The production startup check safely adds the new `posts.audience` column where it does not yet exist and assigns the public default; no global migration needs to be enabled.

## What Changed

The normal post composer now includes two clear choices: **“Public — anyone can see”** and **“Private — friends only.”** The selector appears only for ordinary personal wall posts. Page and Group composers deliberately retain their own established privacy models and are not sent this new field.

Privacy is enforced on the server, not merely hidden in the browser. Private normal wall posts are excluded from the Feed, profile timeline, search, hashtag pages, photo/video/document profile galleries, bookmarked views after friend removal, and Trending unless the requesting user is the author or an accepted friend. Direct post detail, comments, comment reactions, post reactions, likes, polls, saves, share counts, and video view registration also check access first. Private posts cannot be reshared, so their content cannot become public through a repost.

| Safeguard | Result |
| --- | --- |
| Legacy data compatibility | Historic records with no audience value remain public. |
| Friend rule | Only a confirmed record in `friendships` is accepted; a pending request never grants access. |
| Direct-link protection | A private normal post returns no post data to signed-out visitors or non-friends. |
| Interaction protection | A non-friend cannot obtain comments, react, vote, bookmark, share, or increment views for a private post. |
| Page and Group isolation | Existing Page and Group privacy and interaction routes remain separate from this wall-post feature. |

## Deploy Through GitHub and Render

1. Download the ZIP file and extract it on your computer.
2. Replace the contents of your existing FacingFace GitHub repository with the extracted files. Do **not** upload the ZIP file itself into the repository.
3. Commit the changes and push them to the `main` branch as usual.
4. Wait for Render’s normal automatic deployment to complete, then open `https://www.facingface.com`.

**Do not change anything in Render for this release.** Keep the current Start Command as `node dist/_core/index.js`. Keep the current PostgreSQL database, persistent disk, media settings, Gmail/SMTP settings, and the existing environment values, including `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`. The application’s safe startup compatibility check handles only the new audience column and index without running the historical global migration set.

## Two-Account Verification

Use two ordinary test accounts, **Account A** and **Account B**. Repeat the test after Account B has accepted Account A’s friend request.

| Test | Expected result |
| --- | --- |
| Account A creates a **Public** normal wall post. | The post appears for both accounts in the normal Feed and on Account A’s profile. |
| Account A creates a **Private** normal wall post before friendship is accepted. | Account A sees it. Account B does not see it in Feed, profile, search, hashtag, media tabs, or a copied post link. |
| Account B accepts Account A’s friend request and refreshes. | Account B can now see Account A’s private normal wall post and can use its permitted interaction controls. |
| Account B is removed as a friend and refreshes. | Account B no longer sees Account A’s private normal wall post or its attached media in normal views. |
| Account A attempts to reshare a Private post. | FacingFace rejects the action with a clear message; private posts cannot be reshared. |
| Create or view an existing Page or Group post. | Its Page/Group privacy behaviour remains unchanged. |

## Notes

A **Private** post means “author and accepted friends,” not “author only.” The audience label beside ordinary post timestamps shows either **Public** or **Friends** for viewers who are authorized to see the post.

If a deployment fails, use the Render log only to identify the failed build or startup line; do not reset the database or recreate the service. The runtime schema update is idempotent, so restarting after a temporary deployment interruption is safe.
