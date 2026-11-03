# Reliable One-to-One Voice and Video Calls

## What this update repairs

FacingFace already sends the call invitation correctly: the other person can hear the ringtone and accept it. The remaining issue is that some mobile networks, home routers, offices, and public Wi-Fi networks block the direct browser-to-browser media route. This release adds **secure TURN relay support** so the call can use a relay when a direct route is not available.

> **Important:** Deploying the code alone is not enough to fix a blocked network. After deployment, add the three Metered values below in Render. Without them, FacingFace safely keeps using the older STUN-only fallback, and a call may still remain on “Connecting audio and video…” on restrictive networks.

This repair is intentionally limited to **one-to-one Messenger, Messages, floating-chat, and Calls-page voice/video calls**. It does not alter Group Calls, live broadcasts, database data, posts, Pages, Groups, media files, email, or layout.

## What the application now does

The server securely requests WebRTC ICE settings from Metered and passes the returned STUN/TURN entries to an authenticated caller. The Metered API key remains on the server; it is not placed in browser source code or a `VITE_` variable. Metered documents an API that returns the STUN/TURN URLs plus the WebRTC username and credential needed by a browser connection. [1]

The application also retains a safe fallback when a provider is not configured or is briefly unavailable. It shows a truthful timeout rather than leaving a caller indefinitely on the connecting screen.

| Area | This release does | This release does **not** do |
|---|---|---|
| Direct voice/video calls | Uses secure TURN relay settings when configured | Does not guarantee blocked-network calls before the Render values are added |
| Provider secret | Keeps the Metered API key on Render/server only | Does not embed the API key in JavaScript, GitHub, or this guide |
| Existing data | Preserves all existing users, posts, chats, media, Pages, Groups, and settings | Does not reset or migrate the database |
| Other WebRTC features | Leaves Group Calls and live streaming unchanged | Does not alter their separate WebRTC connection paths |

## Step 1: Create a Metered TURN credential

Create a Metered account, open the TURN Server dashboard, and create a credential for FacingFace. Metered’s guide recommends the **Global** region so traffic is routed to a nearby relay, and its dashboard provides the app name and credential/API key. [2]

Do **not** send the API key to anyone in chat, email, screenshots, GitHub, or this project. Copy it only from the Metered dashboard directly into Render in the next step.

## Step 2: Add exactly three new values in Render

Open the **FacingFace web service** in Render. Select **Environment**, choose **Add Environment Variable**, add the three rows below, then save. Use the values from your own Metered dashboard.

| Render environment variable | What to enter | Example format | Keep secret? |
|---|---|---|---|
| `METERED_TURN_APP_NAME` | Your Metered app name/subdomain only; do not enter `https://` and do not enter the full URL | `facingface` | No, but do not need to share it |
| `METERED_TURN_API_KEY` | The API key/credential created in the Metered TURN dashboard | `paste-the-value-from-metered-here` | **Yes — never share it** |
| `METERED_TURN_REGION` | Enter exactly this value | `global` | No |

> **Do not use `VITE_METERED_TURN_API_KEY`.** Anything beginning `VITE_` is intended for the browser and is not appropriate for a provider secret.

Do **not** change or remove any existing Render configuration. Keep the following exactly as they are.

| Keep unchanged | Reason |
|---|---|
| Start Command: `node dist/_core/index.js` | This remains the correct production start command. |
| PostgreSQL/database values | This TURN repair requires no database change. |
| Persistent disk/media configuration | Existing uploaded images and media remain untouched. |
| Gmail/SMTP values | Email delivery is unrelated to this call repair. |
| `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` | Keep the existing safe startup behavior. |
| `CONTENT_MODERATION_ENABLED` and all other existing values | They are unrelated to TURN and should not be reset. |

Saving the Render variables triggers a service deploy/restart. The source code must also be deployed for the three values to be used.

## Step 3: Deploy the supplied complete ZIP to GitHub

1. Download the complete ZIP supplied with this release.
2. Extract it on your computer. The ZIP contains the full cumulative FacingFace source, not only the changed files.
3. Open your FacingFace GitHub repository and replace the repository contents with the extracted files. Do not upload `node_modules`, `dist`, `.env`, or any secret file.
4. Commit the replacement with a message such as `Add TURN relay support for reliable direct calls` and push to the `main` branch.
5. Wait for Render to finish the automatic deploy. Confirm that the Render deploy says **Live** before testing.

If you prefer, add the three Render values immediately before or immediately after the GitHub push. Both the deployed code and the three saved Render values are required.

## Step 4: Test with two real accounts and two networks

Use two different FacingFace accounts and two separate devices. For the strongest test, place one device on home Wi-Fi and the other on mobile data, or use two different Wi-Fi networks.

| Test step | Expected result |
|---|---|
| Account A opens a one-to-one message and starts a voice call | Account B hears the ringtone and sees the incoming call screen. |
| Account B taps **Accept** | The status moves through connecting and audio is heard on both sides. |
| Repeat as a video call | Both people see the other person’s video and hear audio. |
| Test from the Calls page as well | Direct Calls-page voice and video calls use the same protected relay configuration. |
| Test a normal message and a floating chat | Existing messaging behavior remains unchanged. |

The new server code uses the Metered API’s returned ICE list, including TURN variants for different transports. Metered documents TURN examples on port 443 and TCP/TLS options, which can help on networks that block ordinary UDP traffic. [1] [2]

## If a call still cannot connect

First confirm that all three variable names are spelled exactly as above and saved in the **FacingFace web service**, not a different Render service. The app name must be the short Metered app name only, and the API key must be current and active. Do not paste the key into GitHub.

Next, confirm that the code deployment finished after the ZIP was pushed. Test again with two real accounts on different networks. Then review Metered’s dashboard for credential status, quota, and billing/overage information. Provider plans, quotas, and prices can change, so use the provider dashboard as the source of truth. Metered’s current guide describes dashboard usage monitoring and plan/overage controls. [2]

If the problem remains, report only the **time of the test, whether it was audio or video, and the two network types** (for example, “Android mobile data to iPhone home Wi-Fi”). Do not send passwords, API keys, or screenshots containing secrets.

## Why the key must remain private

TURN services issue credentials that let a browser relay WebRTC traffic. Major TURN providers explicitly describe the long-term provider key as a server-side secret and recommend passing generated/short-lived ICE credentials to the client instead. [3] [4]

### References

[1]: https://www.metered.ca/docs/turn-rest-api/get-credential "Metered — Get TURN Credential"
[2]: https://www.metered.ca/blog/guide-to-setting-up-your-webrtc-turn-server-with-metered/ "Metered — Guide to Setting Up a WebRTC TURN Server"
[3]: https://developers.cloudflare.com/realtime/turn/generate-credentials/ "Cloudflare — Generate TURN Credentials"
[4]: https://www.twilio.com/docs/stun-turn/api "Twilio — Network Traversal Service Tokens"
