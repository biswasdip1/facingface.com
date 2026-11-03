# FacingFace: repaired live streaming and smaller media captions

**Release: 3 November 2026**

This is a complete cumulative website source release, not a patch-only ZIP. It includes the previous logo/Facebook-preview assets, optional Digital Member Card, Admin Actions dropdown, Latest/For You feeds, larger text-only composer, Messenger, voice/video calls, Pages and Groups, and earlier repairs.

## What changed

| Area | Expected behaviour |
| --- | --- |
| Home → Live → Go Live | Opens a separate camera panel even when the normal post composer is closed. |
| Live duration | Maximum **5 minutes**, enforced by server and browser. The countdown uses the session's original start time; joining/reconnecting does not give another five minutes. |
| Ending | A 30-second warning, followed by automatic ending. End live or the panel's X stops the broadcast and camera/microphone immediately. |
| Viewing | Active public sessions appear under **Live Now**. Viewers can join and use **Turn on sound**. |
| Connectivity | Host and viewers use the existing secure `calls.iceServers` API, including your configured Cloudflare TURN service. ICE/answers are sent only to the correct peer in the same live session. |
| Viewer count | Unique socket joins count once; leaving does not end the host's broadcast or another viewer's connection. |
| Errors | Clear camera/microphone permission guidance, connection errors and Retry for viewers instead of indefinite Connecting. Camera setup failure ends its created session. |
| Photo/video captions | The typing area becomes a compact caption field when a photo/video is selected. Longer captions grow and then scroll. |
| Text-only posts | Keep the larger writing area and existing coloured backgrounds. Removing the final photo/video restores the large writing area without losing your text. |

The existing quota of **3 live sessions per 24 hours** is unchanged. Live sessions are public in Live Now; this release does not add private live broadcasts.

## Deploy: your usual GitHub → Render method

1. Download and extract **facingface.com-live-stream-five-minute-repair-and-compact-captions-03-Nov-2026.zip**.
2. Use all extracted source files to replace/update the website files in the existing GitHub repository. The ZIP has website files at its root; do not upload a ZIP file as your application source.
3. Commit and push to the same branch. Let the existing Render service finish its deployment.
4. Refresh FacingFace, then test from two different signed-in accounts.

**Do not change or recreate the database, persistent disk/media, Gmail/SMTP configuration, Render environment variables, build command or Start Command.** Keep your existing Cloudflare TURN settings private and in place. No new environment variables or database migration are required for this release.

Start Command remains:

```text
node dist/_core/index.js
```

Keep your existing `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` setting unchanged. The ZIP excludes dependencies, generated builds, Git internals, environment files and logs; Render builds from the source as before. The checksum file is optional and helps verify that the downloaded ZIP has not changed.

## Simple live test

1. Sign in as Account A and click **Live**, optionally enter a topic, then **Go Live**.
2. Allow **both camera and microphone**. You should see your camera and a countdown close to **05:00**. A little setup time is part of the five-minute session.
3. On another phone/browser, sign in as Account B. Wait a few seconds for **Live Now**, then click the live session to watch.
4. Click **Turn on sound**. Test that Account B sees Account A and hears their voice. Use headphones or separate rooms to avoid feedback.
5. Optionally add Account C to test another viewer. Account A should show two viewers.
6. Let one session run until its countdown ends. The broadcast and viewer playback should stop automatically after five minutes; camera/microphone should stop too.
7. Separately test **End live** and the panel's X. Both deliberately end the broadcast.

Brief tab/permission switches no longer deliberately terminate a broadcast, but phones can still suspend browser camera/network activity when the app is backgrounded or the screen locks. Keep the broadcasting page open and the device awake.

## Simple caption test

Open **Start a post** with no attachment: the larger text box remains. Select a photo or video: the text box becomes a smaller caption field, leaving more space for your media. Type a longer caption to check growth/scrolling. Remove the media: the larger field returns with your text still present. Test on desktop and mobile. Upload limits, thumbnails, Reel/Story choices, scheduling and publishing handlers are unchanged.

## Important limits

This remains a browser WebRTC, peer-to-peer live system—not a new broadcast/CDN service. Each viewer adds a connection and outgoing video/audio traffic from the host. It is suitable for small live audiences; large audiences require a dedicated media server/CDN and separate capacity work. The five-minute limit controls duration, not a fixed bandwidth bill. Cloudflare TURN may relay the media and its provider usage/billing still applies. This release does not add recording/replay or automatic live-video storage.

We tested real browser video/audio transmission to two simultaneous viewers using synthetic camera/microphone devices and isolated sample accounts, plus automatic/manual ending, permission errors, retry, media captions, privacy/ownership and previous features. This is not a live production-network test and cannot guarantee every device/network will connect. Your existing TURN credentials must remain valid.

## Validation completed

- Complete `npm run build`: passed.
- 482 focused tests across 17 files: passed, including live socket/API safety and previous feature regressions.
- 4 real isolated PostgreSQL tests: passed; five-minute expiry retains stream history and does not reset/delete user data.
- Real browser WebRTC: two simultaneous viewers received video frames and audio tracks; sound toggle, manual end, original-deadline automatic end, permission-denied cleanup and connection Retry passed.
- Desktop/mobile actual photo/video caption selection, long captions, attachment removal and restored photo drafts: passed.
- Larger text-only/coloured composer, Admin Actions, member-card profile links, For You controls and pagination/hide timing: passed.
- Whole-project TypeScript check still has pre-existing unrelated errors; comparison against the previous branding release found **no new diagnostics** from these changes. Production build passes.
- Release packaging verifies that no file from the previous cumulative ZIP is missing, and verifies ZIP integrity and SHA-256.

No live user accounts, posts, messages or production database were used by the sandbox tests.
