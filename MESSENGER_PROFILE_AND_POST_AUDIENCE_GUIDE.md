# Messenger Profile Link and Quiet Public Default

## What changed

This focused update repairs two small everyday actions without changing existing users, posts, messages, Pages, Groups, media, or privacy rules.

| Area | New behavior |
|---|---|
| Messenger conversation links | A link such as `/messages?conv=52` now opens its selected conversation reliably. The participant name and photo in the conversation header can then be tapped or clicked to open that person’s profile. |
| Mobile post creation | A new wall post is always **Public** by default. The audience menu does not open automatically. |
| Visible audience control | The post header now visibly shows a **Public ▾** button. It remains visible on mobile and desktop. |
| Private posting | Tap **Public ▾**, then choose **Private**. It limits the post to accepted friends as before. |
| Public posting | The default remains Public. Tap **Private ▾**, then choose **Public** at any time to switch back. |

## Simple test after deployment

Open **Messenger**, select any conversation, and confirm the person’s name or photo in the conversation header opens their profile. On a phone, start a new wall post and confirm it opens directly for writing with a visible **Public ▾** button in the header, but no automatic Public/Private popup. Tap **Public ▾** and confirm that Public and Private choices appear; select Private, then reopen the button and select Public again.

## Deployment

1. Download and extract the complete ZIP delivered with this release.
2. Replace the FacingFace GitHub repository contents with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render’s automatic deployment to display **Live**.

No database migration, Render Environment value, media-disk change, Gmail setting, or Start Command change is required.
