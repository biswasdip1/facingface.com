# FacingFace — cleaner chat and four-person group calls

**Complete cumulative website update — 3 November 2026**

This is the full website source, not a patch. It includes the latest five-minute live-stream repair and smaller photo/video caption box, plus all earlier logo/Facebook-preview, member-card, For You feed, profile, Admin and Messenger improvements.

## What changed

| Area | Improvement |
|---|---|
| Mobile direct chat | A focused chat screen hides extra site navigation. Voice/video buttons remain visible. In the three-dot menu, choose **Show site menu** to bring normal navigation back. |
| Main chat toolbar | Camera, image, file and GIF options are kept under one **+** button. Typing, Send and voice recording remain available. |
| Three-dot menu | Search, notification mute and pinned messages are retained, rather than deleted. |
| Chat photos | Tap a photo to view it. Use **Download** for the original file, or **Open original** for browser saving/sharing options. |
| Attached videos/audio | Supported files have browser playback controls and Download/Open original actions. |
| Video links | Website links are clickable. YouTube, YouTube Shorts and Vimeo links have a **Play** control; supported direct video-file URLs can also play. Video embeds load only after a click. Shorts use a vertical player. |
| Desktop small chat boxes | The same photo download and video-link controls are included. |
| Group chat | Voice/video buttons are visible on phones. Secondary tools are in a three-dot menu. An existing call appears with **Join call**, so members enter the same room. |
| Group calls | Up to **4 people total, including you**, with everyone shown in a two-column grid. Voice-only rooms do not request the camera. Active calls hide site navigation so it cannot cover call controls. |

The previous one-to-one call media implementation is preserved. Group calls use the same secure server-side ICE/TURN configuration; no new provider account or token is requested.

## Deploy — your usual GitHub → Render method

1. Download **facingface.com-clean-chat-and-group-video-calls-03-Nov-2026.zip**.
2. Extract it. Use the complete contents to update your existing GitHub repository, retaining the folders such as `client`, `server`, `shared`, `drizzle`, `scripts`, and `brand-assets`.
3. Commit and push to your existing branch. Wait for the existing Render service to finish deploying.
4. Refresh FacingFace. If an old interface remains, close/reopen the browser tab or refresh again after deployment.

**Do not change your database, persistent media disk, Gmail/SMTP configuration, Cloudflare TURN environment variables or existing Render settings.** Keep the Start Command as:

```text
node dist/_core/index.js
```

Keep `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`. This update reuses the existing call-room tables. It does not reset/delete users, messages, posts, groups or media, and does not run new global migrations.

## Test ordinary chat first

Open a conversation on your phone. You should see its name, voice/video buttons, a three-dot menu and a wider typing area with **+**. In that menu, try Search and Show site menu/Hide site menu. Send a message as normal.

Send an image, then tap it and choose Download. Send a supported video file and try its playback controls. Paste a normal YouTube or Shorts URL and tap Play. Try the same image/link in the small desktop chat box.

Some third-party videos cannot be embedded because of their owner's restrictions. Facebook/TikTok and unsupported video sites remain clickable links rather than being promised as embedded players. Use **Open original video** if an embedded video is restricted.

On iPhone, the browser may offer a Save/Share sheet instead of a desktop-style file download. If a remote host blocks direct downloads, use **Open original**, then the browser's Save or Share option. The browser's address bar and its own menu cannot be removed by the website.

## Start a call with more than two people

1. Open **Messenger → Groups**. Choose an existing group, or create a group and add your friends using the existing group controls.
2. In that group's conversation, press its **video** button (or the phone button for voice only).
3. Choose **Join call** and allow camera/microphone access when asked. Nothing starts automatically before Join.
4. Other group members use **Join call** in the group conversation, or open the **Copy link** invitation you deliberately share with them.
5. Up to four people, including you, can join. Only current members of that group can enter; a copied link does not grant membership.
6. Use the microphone/camera buttons or **Leave call**. Leaving releases your camera and microphone and does not disconnect the remaining members. The room ends when the last person leaves.

This is **group-room calling**, not an Add Person button that converts an already-running one-to-one call. For a multi-person call, start from the group conversation. If a connection fails, use Leave and rejoin. Long backgrounding/connection loss can expire a participant; the service removes stale participants after about 45 seconds on subsequent room activity.

The five-minute cap applies to **live streaming**, not group conversations or group calls. Group calling uses peer-to-peer media; four-person calls use more upload bandwidth, relay traffic and phone battery than one-to-one calls. Four is a sensible initial limit, not a promise of unlimited conferencing.

## Validation

- Complete production build passed.
- 564 focused/new and existing feature regression tests passed across 20 suites.
- 20 additional durable call-room tests passed against disposable real PostgreSQL, including concurrent five-user admission, duplicate joins, rejoin, current membership, blocks and signal privacy.
- Real browser WebRTC tests exercised four separate browser sessions: all received three remote video streams and microphone audio; local audio stayed muted. Voice-only calls, the fifth-user rejection, leave cleanup, call controls and member-only invitation copying were tested.
- Desktop/mobile chat tests verified downloaded photo and video bytes match the originals, click-to-play Shorts sizing, native video playback, search, menus, sending, the floating chat and group-call entry.
- Earlier composer, compact media captions, Admin dropdown, member-card profile navigation and For You/timing browser regressions passed.
- Whole-project type checking still has 29 pre-existing findings outside the new feature sections; no new diagnostic identities were added.
- The release ZIP is checked for integrity and preservation of every file from the previous complete release. No dependencies, build outputs, `.git`, `.env` files or secrets are packaged.

Browser media tests use synthetic camera/microphone devices and isolated sample accounts in the sandbox. They do not use production accounts, and do not certify every phone or external network. After deployment, test your own phones using the Cloudflare TURN settings that already made your Messenger calls work.

Keep the accompanying `.sha256` file with your backup if desired. It verifies the ZIP has not changed; it is not installed or entered into Render.
