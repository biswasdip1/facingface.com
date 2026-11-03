# FacingFace — Cleaner mobile header and scroll-aware menus

This is the complete cumulative website source. It includes this mobile-navigation update, Add people to calls, four-person group calls and all earlier delivered changes. Deploy only this newest ZIP; you do not need to combine ZIPs.

## What changed

The duplicate profile photo at the far left of the mobile site header is removed. The FacingFace logo now starts the header, followed by Search, Notifications, Messages and More. Your photos in your profile, post composer and stories are unchanged. To open your own profile, tap More (the gear) and My Account. The desktop profile navigation is retained.

On phone screens, swipe up to read further down the page: both FacingFace menus slide away. Swipe down to move back up: both menus return together. Small finger movements are ignored to avoid flickering. The menus stay visible at the top of a page, return after navigating to another page or rotating/resizing to desktop, and remain available while Search or More is open or when keyboard navigation needs them.

This changes the website's menus only. A website cannot directly hide the phone status bar, address bar or Chrome/Safari tab controls; the browser manages those itself.

The fixed menus slide away without moving the posts or leaving a blank menu strip. Home-indicator safe areas are accounted for. If reduced motion is enabled on the device, menus hide and return without the sliding animation. Desktop navigation stays visible as before. The existing focused Messenger and fullscreen call layouts are retained.

## Deploy — same GitHub to Render process

1. Download and extract the newest complete ZIP.
2. Update your existing GitHub repository with its contents, then commit and push as usual.
3. Wait for your existing Render service to finish deploying. Refresh FacingFace on your phone.

There is no extra containing folder at the ZIP root. Keep the existing database, persistent media disk, domain, Gmail/SMTP settings, environment variables and working Cloudflare TURN settings. No new environment variables or database migrations are needed. Do not reset data or enable startup migrations.

Keep the Render Start Command unchanged:

```text
node dist/_core/index.js
```

Dependencies and compiled build files are intentionally excluded from the source ZIP; Render installs/builds them through your normal deployment process.

## Test after deployment

Open Home on your phone. Confirm there is no photo before the FacingFace logo. Swipe up through several posts: the top and bottom site menus should hide. Swipe down a little: both should return. Return to the top: both stay visible. Open More and check My Account; try Search, Messages and the bottom-menu links. Open a Messenger conversation and confirm its existing focused header/composer still work. On desktop, navigation should stay visible while scrolling.

## Checks completed

The production build passed. The regression suite passed 691 tests across 25 suites, including 33 new scroll-policy tests. Browser checks passed at 320px, 390px and 639px mobile widths, plus desktop resizing, real touch swipes, height-only mobile browser resizing, opening Search/More, navigation, draft preservation, reduced motion and the existing focused-chat menu exclusion.

Earlier chat attachment downloads/video links, Admin dropdown safety, member-card profile navigation, larger composer, compact media captions and Latest/For You flows were rechecked with isolated sample data. Existing whole-project TypeScript diagnostics remain, with no additional diagnostic identities introduced by this update. Only three existing navigation/layout files were changed; all 580 files from the previous complete ZIP are retained.
