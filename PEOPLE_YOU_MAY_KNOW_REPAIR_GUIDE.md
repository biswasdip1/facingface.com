# People You May Know Repair Guide

## What Changed

The **People You May Know** system now handles both issues reported in the Admin Panel and Home Feed.

| Area | Updated behaviour |
| --- | --- |
| Missing or unavailable profile picture | A clear coloured initial is shown instead of an empty or broken image. |
| Admin Panel → People You May Know → Remove | The person disappears from the Admin list immediately. |
| Home Feed → People You May Know | A removed person no longer appears in the suggested-people cards after refresh. |
| User account and normal search | The member is not deleted, suspended, or hidden from normal search. Only the People You May Know suggestion is removed. |

## How to Use It

Open **Admin → People You May Know** and select **Remove** for anyone who should not be offered as a suggestion. The change is stored safely in the database and remains active after page refreshes and future deployments.

The person can still use FacingFace normally. This is only a suggestion-list control; it does not remove their account, posts, friends, media, or profile search result.

## Deployment

No Render setting needs changing. Keep the current Start Command, PostgreSQL database, persistent media disk, email configuration, and `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` unchanged. Push the complete source to the usual GitHub `main` branch and Render will deploy it automatically.
