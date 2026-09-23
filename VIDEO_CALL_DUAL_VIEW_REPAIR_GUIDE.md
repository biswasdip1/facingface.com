# FacingFace Video Call Dual-View Repair

**Release date:** 23 September 2026  
**Scope:** One-to-one Messenger video calls and the Calls page

## What this repair fixes

Video and voice calls are already connecting through the working TURN-supported call system. This repair fixes the **empty outlined self-view** that could appear in a connected video call, particularly on mobile browsers. The browser obtained the local camera stream before the final connected-call panel was mounted, so the visible preview did not always receive that saved stream.

The repaired call view now always reconnects the saved local camera stream after the call panel opens. Both people therefore have a visible video panel:

- The other person's video is the main view by default.
- Your own camera appears in a clearly labelled small preview marked **You**.
- Tap the small preview to make your camera the large view; the other person remains visible in the small panel.
- Tap the small panel again to swap back.
- Use the expand icon in the top-right of the video area for a larger, distraction-free call view. The normal control buttons remain available.

The same local-stream recovery was added to the dedicated **Calls** page so Messenger calls and Calls-page calls behave consistently.

## What remains unchanged

This is a focused display repair only. It does **not** alter user accounts, posts, Pages, Groups, chats, call history, persistent media, database data, Gmail settings, Render settings, or the Render Start Command. Existing microphone, camera, screen-share, end-call, signalling, call-time limit, and Cloudflare TURN behaviour remain in place.

This remains a **one-to-one** Messenger video call feature. It displays both participants clearly. A true multi-person group video conference would require a separate, larger feature with new group-call rooms and multi-participant media handling; it is not needed for this repair and has not been added silently.

## Deployment steps

1. Download the newest complete ZIP package from this delivery.
2. Extract it on your computer.
3. Replace the contents of your existing FacingFace GitHub repository with the extracted contents.
4. Commit and push to the `main` branch.
5. Render will deploy automatically. Keep the existing Start Command exactly as it is:

   ```text
   node dist/_core/index.js
   ```

Do not change your database, persistent disk/media, existing Gmail variables, existing TURN variables, or `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`.

## Simple test after Render is Live

1. Sign in to two different FacingFace accounts.
2. Start a **video call** in Messenger.
3. On the first account, confirm the other person is large and your own video is visible in the small panel labelled **You**.
4. On the second account, confirm the same result in the opposite direction.
5. Tap the small video panel to check that it swaps the large/small view while both videos remain visible.
6. Tap the expand icon to check the larger video view, then tap it again to return to normal.
7. Test microphone mute, camera off/on, and End Call once.

For the best reliability test, use a phone on mobile data for one account and another phone or computer on Wi-Fi for the other. That confirms the deployed Cloudflare TURN configuration can handle different networks.

## Validation completed

- Prettier check passed for the changed video-call files.
- Focused call reliability tests passed: **17/17**.
- `npm run build` completed successfully.
- The release ZIP will be integrity-tested before delivery.
