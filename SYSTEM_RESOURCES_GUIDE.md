# System Resources and Abuse Control

## Purpose

This Admin panel release adds a **System Resources** tab for super-admins. It shows only measurements the FacingFace service can verify directly and provides a safe path to the existing user-account controls.

## What the panel measures

| Panel value | Meaning |
|---|---|
| Persistent disk | Actual size of files beneath Render's persistent media directory, file count, volume capacity, and remaining free space. |
| Disk capacity used | The percentage used on the mounted Render disk. **80%** is a warning and **90%** is critical. |
| Media delivery | Requests and bytes served by `/media` from the current FacingFace web process. Counters restart when Render restarts or deploys. |
| Media path misses | Media responses returning 404 or 410 from the current web process. A rising value may indicate missing legacy images or broken links. |
| Posts with media/audio | Existing post records that have a media or audio URL. |
| Documents recorded | Existing post records that have a document. The bytes value covers documents whose file size was recorded at upload time. |
| Accounts requiring review | Accounts with high post activity, previous content violations, or a currently active suspension. These are review signals, not automatic punishments. |

The application cannot accurately measure all Render network egress, CPU, RAM, uptime, restarts, or edge-cache traffic. Use the **Render Metrics** button for those platform-level values.

## Account-action safety

No account is suspended or deleted automatically. For each account needing review, select **Open User Controls** and use the existing Users panel.

| Action | Appropriate use |
|---|---|
| Suspend | Use for a clear temporary misuse case. Enter a specific reason and a proportionate duration. The action is recorded. |
| Unsuspend | Use when the temporary restriction is no longer justified. |
| Permanently delete | Use only for a serious, confirmed case. The interface requires the account name before deletion and removes account data permanently. |

Always review the post/report history before action. Avoid making decisions from activity count alone: a high count can come from a legitimate community event or business account.

## Optional threshold

The standard review signal is **20 or more posts in the prior 24 hours**. You can change it without code by adding this optional Render Environment value:

```text
ABUSE_POSTS_WARNING_PER_24H=20
```

A lower number produces more review signals; it does not suspend anyone automatically. Leave it unset to retain the standard value.

## Deploy and verify

1. Download and extract the accompanying ZIP.
2. Replace the contents of the GitHub repository with the extracted files. Do not add another enclosing folder.
3. Commit and push to `main`.
4. Wait for Render to show **Live**.
5. Open **Admin → System Resources** as a super-admin.
6. Confirm the persistent-media disk is visible and that **Render Metrics** opens the Render dashboard.

No new database migration, scheduled job, Render disk, SMTP setting, or Start Command is required for this release.
