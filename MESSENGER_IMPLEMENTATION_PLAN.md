# chat.FacingFace.com Messenger Implementation Plan

The dedicated Messenger experience will be implemented inside the existing FacingFace React application and will be selected by hostname. When the browser hostname is `chat.facingface.com`, the application will render a full-screen Messenger shell instead of the normal social-network navigation. The implementation keeps the same Express, tRPC, Socket.IO, PostgreSQL, Drizzle, session/authentication, storage, friends, conversations, groups, call infrastructure, and push-notification foundation.

## Current audit findings

| Area | Current state | Implementation decision |
|---|---|---|
| Database | PostgreSQL-only Drizzle schema with `conversations`, `messages`, `message_reactions`, `group_conversations`, `group_messages`, `call_rooms`, `call_signals`, `call_history`, `friendships`, and `users`. | No new database or account system. Reuse the existing PostgreSQL tables and add UI capabilities on top of existing fields. |
| Direct messages | Existing tRPC router supports conversation listing, messages, sending text/files, voice messages, reactions, forwarding, deletion, read states, pinned messages, mute state, and presence. | Build the chat subdomain UI around these existing procedures. |
| Group chat | Existing group conversation system supports list, create, messages, unread count, pinning, and group call pages. | Surface groups in the same left rail and preserve existing group workflow while making it feel integrated in Messenger. |
| Calls | One-to-one calls use Socket.IO WebRTC signaling through `CallModal`; group calls use DB-backed tRPC signaling and already include screen-share track replacement. | Upgrade the shared one-to-one call modal with polished controls, screen-sharing readiness, and clearer call states while preserving existing signaling. |
| PWA | Service worker exists for push notifications, but the HTML entry lacks a web manifest link and dedicated Messenger install metadata. | Add manifest wiring and Messenger-specific app metadata/icons so mobile users can add the chat product to the home screen. |
| Deployment | `chat.facingface.com` already points at the existing Render service. | Hostname detection allows one Render service to serve both the main product and dedicated chat product. |

## Dedicated chat subdomain architecture

The main `App.tsx` router will detect the current host with a helper such as `isMessengerHost = window.location.hostname === "chat.facingface.com" || window.location.hostname.startsWith("chat.")`. Public auth routes must remain available because password reset, email verification, and landing/login flows still need to work. After authentication, the chat hostname will render a new `MessengerApp` page that owns the full viewport and does not show the regular `NavBar` or `MobileBottomNav`.

## Messenger feature set for this iteration

| Feature | Delivered behavior |
|---|---|
| Full-screen product shell | A polished three-panel Messenger layout with left navigation, conversation list, active chat, and right-side details/media drawer on desktop; adaptive single-pane flow on mobile. |
| Same account/data | Uses `useAuth`, existing session cookies, and existing tRPC procedures. |
| Direct messages | Text, files, images/GIFs where supported by existing uploads, voice messages, read status, search, typing, pinned messages, reactions, delete, forward, and mute. |
| Media/audio collections | A per-conversation detail panel categorizes existing message attachments into Photos/Videos, Audio, Files, and Links from message content and file metadata. |
| Voice/video calls | Dedicated call buttons launch existing one-to-one calls from the chat header. |
| Screen sharing readiness | Video calls will gain a desktop screen-share toggle using `navigator.mediaDevices.getDisplayMedia()` and `RTCRtpSender.replaceTrack`, falling back gracefully on unsupported browsers. |
| Presence | Uses Socket.IO presence and persisted last-seen values. |
| Groups | Groups are accessible from the same Messenger shell and can reuse existing `GroupThread` behavior. |
| PWA | Add `/manifest.webmanifest`, theme metadata, and chat-focused service-worker notification links. |

## Implementation path

The safest route is to create a dedicated `client/src/pages/Messenger.tsx` page that reuses stable logic from `Messages.tsx` but improves the layout and adds the conversation details/media collections panel. `Messages.tsx` can continue serving the main FacingFace `/messages` route, while `Messenger.tsx` serves the chat subdomain. Shared call improvement belongs in `client/src/components/CallModal.tsx` so both the main site and chat subdomain benefit.
