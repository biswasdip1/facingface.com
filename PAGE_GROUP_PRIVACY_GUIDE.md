# FacingFace Page & Public Group Privacy Guide

## Purpose

This release adds a secure **Public / Private** setting to both Pages and Public Groups. Existing Pages and Groups remain **Public** automatically, so no current community, follower, post, comment, or media record is removed or made inaccessible by the deployment.

## Visibility rules

| Area | Public | Private |
|---|---|---|
| **Page discovery** | Appears in the Page browse and search views. | Does not appear in public Page discovery. |
| **Page posts** | Anyone can view posts. | Only approved followers and Page admins can view posts. |
| **Following a Page** | A follower is approved immediately. | The action creates a pending follow request. |
| **Public Group discovery** | Appears in Group browse and search views. | Does not appear in public Group discovery. |
| **Public Group posts and members** | Anyone may view posts; members may interact. | Only approved members and Group admins can view posts and members. |
| **Joining a Group** | Membership is approved immediately. | The action creates a pending join request. |

> A Private setting is enforced by the server. Hiding the Page or Group screen in a browser is not the only protection: direct requests for private posts or member lists are denied until approval.

## How to make a Page private

Open the Page as a Page admin and select **Edit Page**. Under **Visibility**, choose **Private** and save. The Page header remains identifiable, but its timeline is visible only to approved followers and Page admins. A visitor will see **Request to Follow**. The admin can approve or decline requests in the **Follow Requests** card.

## How to make a Public Group private

Open the Group as a Group admin and select **Edit Group**. Under **Visibility**, choose **Private** and save. Visitors will see **Request to Join**. They cannot load the Group timeline or member list until an admin or moderator approves the request.

Group administrators and moderators use the new **Requests** tab in the member sidebar to approve or decline requests. The member count includes approved members only; a pending request does not increase the count.

## Safe verification sequence

First deploy the release and wait for Render to display **Live**. Use two accounts for a controlled check.

1. Set a test Page to **Private**.
2. From the second account, open its direct URL and confirm that the Page post list is unavailable.
3. Select **Request to Follow**, then approve the request as a Page admin.
4. Refresh the second account and confirm that it can view the Page posts.
5. Repeat the same sequence with a test Public Group using **Request to Join** and the Group **Requests** tab.
6. Set both test areas back to **Public** if they were previously public.

Do not change Render Environment variables, the Start Command, the database, the media disk, or email settings for this release.
