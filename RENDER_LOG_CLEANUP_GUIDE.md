# Render Log Cleanup Repair

This release fixes the **current production errors** found in the supplied Render log. It does not hide errors or erase history. Old log entries remain visible in Render, but the matching errors should stop appearing after this version is deployed.

## Fixed production errors

| Log entry | Root cause | Repair in this release |
|---|---|---|
| `column "actorId" of relation "admin_audit_log" does not exist` | The live PostgreSQL table is older than the current application schema. | Startup checks the existing columns and adds only the missing audit-log fields. Existing audit records are retained. |
| `post_reactions ... column "emoji" violates not-null constraint` | The live database has an obsolete required `emoji` field that is not used by the current reaction schema. | Startup makes that obsolete field nullable; current typed reactions then write normally. Existing reaction rows are retained. |
| `column "likecount" does not exist` while liking a Reel | A raw SQL expression converted the camelCase PostgreSQL name to lowercase. | The Reel counter update now uses the schema identifier, producing correctly quoted `likeCount` SQL. |
| `relation ... already exists, skipping` for reminder indexes | The prior reminder compatibility check used `IF NOT EXISTS`, which PostgreSQL reports as a notice every deployment. | The startup code now checks the table/index metadata first, so it creates only genuinely missing objects without those repeat notices. |

## Expected entries that are not faults

| Entry | Meaning | Action |
|---|---|---|
| `[Moderation] External AI moderation is disabled` | The deliberate Render-safe setting is active because there is no configured valid external moderation provider. It logs once per process, not for every upload. | Leave `CONTENT_MODERATION_ENABLED=false` unless you later configure a valid provider. |
| `Detected service running on port 10000` | Render has detected the correctly running web service. | No action. |
| `Some chunks are larger than 500 kB` during build | A build performance warning about the browser JavaScript bundle. It does not stop deployment or break site features. | No urgent action; code-splitting can be considered later as a separate performance task. |
| Historical red errors before this deployment | Logs are immutable history from older versions. | Filter logs by time and judge only entries after the new service is Live. |

## Safe deployment

1. Download and extract the accompanying ZIP.
2. Replace the contents of the GitHub repository with the extracted files. Do not add another enclosing folder.
3. Commit and push to `main`.
4. Keep the existing Render Start Command, disk, database, and Environment values unchanged.
5. Wait for Render to show **Live**.
6. Open Render Logs and check entries after the new deployment time.

## Verify the fixed paths

After the deployment is Live, make these small checks using normal test content:

| Check | Expected result |
|---|---|
| Perform an admin action that writes an audit entry | The action completes and no `actorId` audit-log error appears. |
| Add a standard Like to one post | The Like persists after refresh and no `emoji` constraint error appears. |
| Like and unlike one Reel | The count changes and no `likecount` column error appears. |
| Restart/redeploy once | Reminder storage starts without `already exists, skipping` notices. |

No account, post, Page, Group, media file, reminder record, or existing audit record is deleted by this release.
