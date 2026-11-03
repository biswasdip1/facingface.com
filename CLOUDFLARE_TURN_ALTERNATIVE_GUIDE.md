# Cloudflare Alternative for Reliable FacingFace Calls

## You do not need to use Metered

If Metered registration is not working for you, use **Cloudflare Realtime TURN** instead. This release adds direct support for Cloudflare’s managed TURN service. It is the same purpose: it relays encrypted one-to-one call traffic only when a direct connection is blocked by mobile data, Wi-Fi, NAT, or a firewall.

> A registered TURN provider is still necessary for reliable calls across restrictive networks. FacingFace cannot turn the Render web service itself into a secure TURN relay. Cloudflare is the alternative provider supported by this release.

Cloudflare documents a 1,000 GB free tier before Realtime TURN charges begin, followed by $0.05 per GB of TURN data egress. Check the current Cloudflare dashboard and pricing page before enabling billing because provider terms can change. [1]

## First: do not save the unsuccessful Metered values

If the Render screen still has these Metered rows with a placeholder, checksum, or other non-Metered value, delete those three rows or press **Cancel** without saving them.

| Do not keep unless you later use Metered successfully |
|---|
| `METERED_TURN_APP_NAME` |
| `METERED_TURN_API_KEY` |
| `METERED_TURN_REGION` |

Do not place a ZIP checksum, verification code, password, or any placeholder text in a TURN API-key field.

## Step 1: Create or use a Cloudflare account

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Sign in, or create an account and complete the email verification.
3. Select your Cloudflare account. You do **not** need to move the FacingFace website from Render or change its domain, DNS, database, or hosting for this task.
4. In Cloudflare, open **Realtime** and then **TURN**. Follow Cloudflare’s current dashboard instructions to create a **TURN key**.
5. Cloudflare gives you two important private values: a **TURN Key ID** and a **TURN API Token**. Keep both private.

Cloudflare states that the long-term TURN key must stay on the server and is used to create expiring browser TURN credentials. The web browser receives only the temporary ICE entries needed for a call. [2]

## Step 2: Add two Render values

In the **FacingFace web service** in Render, open **Environment** and add the two rows below. Paste the values directly from the Cloudflare dashboard.

| Render environment variable | What to paste | Secret? |
|---|---|---|
| `CLOUDFLARE_TURN_KEY_ID` | The Cloudflare TURN Key ID | Treat as private |
| `CLOUDFLARE_TURN_API_TOKEN` | The Cloudflare TURN API Token | **Yes — never share it** |

You do **not** need to add `CLOUDFLARE_TURN_TTL_SECONDS`. FacingFace safely uses a one-hour temporary credential by default, which fits the existing 30-minute individual call limit. This optional variable is only for an advanced configuration between 1,800 and 172,800 seconds.

> Do **not** use names beginning `VITE_` for either value. Do not send the values in chat, email, screenshots, or GitHub. They belong only in Render’s Environment section.

## Step 3: Keep these existing settings unchanged

| Keep exactly as it is | Reason |
|---|---|
| Start Command: `node dist/_core/index.js` | This remains the correct FacingFace start command. |
| Render database / PostgreSQL settings | No database migration or reset is needed. |
| Persistent disk and media settings | Existing photos and videos are untouched. |
| Gmail / SMTP settings | Email settings are unrelated. |
| `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` | Keep the current safe production behavior. |
| Website address and Render service | FacingFace stays hosted on Render. |

## Step 4: Deploy this updated complete ZIP

1. Download this release ZIP and extract it on your computer.
2. Replace your GitHub FacingFace repository contents with the extracted files.
3. Commit and push the `main` branch.
4. Wait for Render to show the deployment as **Live**.
5. Add/save the two Cloudflare values above in Render. Saving them triggers a restart/deployment.
6. Test a voice call and a video call using two different accounts on two different networks, for example home Wi-Fi and mobile data.

The app tries Cloudflare first when both Cloudflare values are present. It preserves the existing STUN fallback when no provider is configured. One-to-one Messenger, Messages, floating-chat, and Calls-page calls all use the same protected relay settings. Group Calls and live streaming remain unchanged.

## What happens during a call

FacingFace’s server uses the Cloudflare values privately to request temporary TURN settings. Cloudflare returns ICE server URLs, a temporary username, and a temporary credential; FacingFace passes only those temporary connection details to the authenticated browser. [2] Cloudflare describes TURN as a relay for WebRTC where direct communication is blocked by NATs or firewalls. [3]

Cloudflare supports TURN transports including TCP/TLS port 443, which helps in restrictive networks where ordinary direct/UDP connections may fail. [3]

### References

[1]: https://developers.cloudflare.com/realtime/turn/faq/ "Cloudflare Realtime TURN FAQ and pricing"
[2]: https://developers.cloudflare.com/realtime/turn/generate-credentials/ "Cloudflare — Generate TURN Credentials"
[3]: https://developers.cloudflare.com/realtime/turn/ "Cloudflare — TURN Service"
