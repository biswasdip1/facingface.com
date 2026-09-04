# Admin Overview Card Links

This release makes each summary card in **Admin → Overview** clickable. It does not change media storage, system-resource monitoring, Gmail, reminder emails, moderation, Pages, Groups, or account data.

| Overview card | Destination after click |
|---|---|
| Total Users | The **Users** tab, set to **All Users**. |
| Total Posts | The new read-only **All Posts** tab, showing up to the 1,000 most recent posts. |
| Flagged Posts | The existing **Flagged Posts** moderation queue. |
| Suspended Users | The **Users** tab, set to **Active Suspensions**, which excludes expired suspensions. |

## Deploy

1. Download and extract the accompanying ZIP file.
2. Replace the contents of the GitHub repository with the extracted files. Do not create another enclosing folder.
3. Commit and push to `main`.
4. Wait for Render to show **Live**.

No Render settings, environment variables, database changes, or disk changes are required.

## Verify

Open **Admin → Overview**. Each card now displays **View →** and can be clicked. Confirm that every card takes you to its matching view. The All Posts view is read-only; use Reports or Flagged Posts for moderation actions.
