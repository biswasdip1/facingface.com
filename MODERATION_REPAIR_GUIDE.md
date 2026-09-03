# Moderation Workflow Repair

## Scope

This release changes only the content moderation workflow. It retains the existing homepage, Render startup configuration, PostgreSQL database, Render media disk, Pages, Public Groups, reminder email process, and existing user records.

## What is repaired

| Workflow | Correct behaviour after deployment |
|---|---|
| Member post/comment report | A pending report remains in **Admin → Reports**. |
| Flag a reported post | An administrator may select **Flag for Review**. The post is then hidden from ordinary feeds and appears in **Admin → Flagged Posts**. |
| Approve flagged post | The administrator selects **Approve** in Flagged Posts. The post is restored to ordinary feeds. |
| Remove reported content | The exact reported post, comment, or listing is removed. The report becomes **actioned** and an audit entry is recorded. |
| Dismiss report | The report becomes **dismissed** without altering content. |
| Respond to reporter | The written response is sent through the configured SMTP account to the reporting member's email address. The interface confirms success only after the mail provider accepts the recipient. |

## Deploy

1. Download and extract the accompanying ZIP file.
2. Replace the contents of the GitHub repository with the extracted files. Do not create a second enclosing folder in the repository.
3. Commit and push to the `main` branch.
4. Wait for Render to deploy automatically and report **Live**.

Do not change the Render Start Command, environment variables, database, or persistent media disk for this release.

## Safe verification

Use a non-sensitive test post from a normal member account. Submit one post report, then sign in as the super-admin.

1. Open **Admin → Reports** and confirm the new entry appears as **pending**.
2. Select **Flag for Review**. Confirm the post appears in **Admin → Flagged Posts** and is no longer visible to ordinary members.
3. Select **Approve** and confirm the post returns to the normal feed.
4. Submit a second test report. Select **Remove Content**, accept the confirmation, and confirm only that selected test item is removed.
5. Submit a third test report. Use **Respond**, enter a short message, and select **Send Email**. Confirm the reporting account receives the message.

Do not use deletion actions on real content until the same checks pass with your test content.
