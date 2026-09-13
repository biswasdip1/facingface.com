# Messenger Profile Link and Quiet Public Default

## What changed

This focused update repairs two small everyday actions without changing existing users, posts, messages, Pages, Groups, media, or privacy rules.

| Area | New behavior |
|---|---|
| Messenger conversation links | A link such as `/messages?conv=52` now opens its selected conversation reliably. The participant name and photo in the conversation header can then be tapped or clicked to open that person’s profile. |
| Mobile post creation | A new wall post is always **Public** by default. The mobile browser no longer opens a Public/Private choice when the post window first appears. |
| Private posting | Private remains available deliberately through the small **More** arrow in the post window, then **Private**. It limits the post to accepted friends as before. |
| Public posting | The default remains Public. In **More**, choose **Public** at any time to switch back. |

## Simple test after deployment

Open **Messenger**, select any conversation, and confirm the person’s name or photo in the conversation header opens their profile. On a phone, start a new wall post and confirm it opens directly for writing, with no automatic Public/Private popup. Open the small More arrow only if you wish to change the audience to Private.

## Deployment

1. Download and extract the complete ZIP delivered with this release.
2. Replace the FacingFace GitHub repository contents with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render’s automatic deployment to display **Live**.

No database migration, Render Environment value, media-disk change, Gmail setting, or Start Command change is required.
