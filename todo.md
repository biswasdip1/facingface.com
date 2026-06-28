# FacingFace — Project TODO

## Database & Schema
- [x] Extend users table with avatar, bio, coverPhoto fields
- [x] Create posts table (text, mediaUrl, mediaType, authorId, createdAt, isModerated, isFlagged)
- [x] Create comments table (postId, authorId, text, createdAt, isModerated, isFlagged)
- [x] Create likes table (targetId, targetType enum post/comment, userId, createdAt)
- [x] Create follows table (followerId, followingId, createdAt)
- [x] Create notifications table (userId, type enum like/comment/follow, actorId, postId, commentId, read, createdAt)
- [x] Run migrations and verify schema

## Backend API (tRPC Routers)
- [x] posts.create — with LLM moderation gate, media upload support
- [x] posts.feed — paginated chronological feed of all users
- [x] posts.getByUser — posts by a specific user
- [x] posts.delete — author-only delete
- [x] comments.create — with LLM moderation gate
- [x] comments.list — list comments for a post
- [x] comments.delete — author-only delete
- [x] likes.toggle — like/unlike post or comment
- [x] likes.counts — get like counts for posts/comments
- [x] follows.toggle — follow/unfollow a user
- [x] follows.status — check if following
- [x] follows.followers — list followers
- [x] follows.following — list following
- [x] users.updateProfile — update bio, avatar, coverPhoto
- [x] users.getProfile — get user profile with stats
- [x] notifications.list — list notifications for current user
- [x] notifications.markRead — mark notification(s) as read
- [x] media.upload — upload photo or video (max 1 min) to S3

## Frontend Pages & Components
- [x] Auth gate — redirect unauthenticated users to login page
- [x] Login/Landing page — sign-in CTA with ITS design
- [x] Top navigation bar — Home, Profile, Notifications (exactly these three)
- [x] News feed page — chronological posts from all users
- [x] Post card component — media, text, like button, comment section
- [x] Post creation modal/form — text + photo/video upload
- [x] Comment section component — nested under each post
- [x] Like button with count (posts and comments)
- [x] Profile page — avatar, bio, cover, stats, post grid
- [x] Edit profile modal — update bio, avatar, coverPhoto
- [x] Follow/Unfollow button on profile
- [x] Notifications page — list of like/comment/follow events
- [x] Notification badge on nav icon
- [x] Responsive mobile layout

## Design System (International Typographic Style)
- [x] White canvas base (#FFFFFF)
- [x] Bold red square accents (#E63329 or similar)
- [x] Crisp black sans-serif typography (Inter or Helvetica Neue)
- [x] Strict grid system with asymmetric composition
- [x] Fine black divider lines
- [x] Generous negative space
- [x] Mobile-first responsive breakpoints

## Content Moderation
- [x] LLM moderation helper on server
- [x] Intercept post text before publishing
- [x] Intercept comment text before publishing
- [x] Flag and reject inappropriate content with user-facing error message

## Notifications
- [x] In-app notifications (stored in DB, shown in Notifications page)
- [x] Notification badge count in nav
- [x] Email notifications via Manus notifyOwner or email API (like, comment, follow triggers)

## Testing
- [x] Vitest: posts router tests
- [x] Vitest: comments router tests
- [x] Vitest: likes router tests
- [x] Vitest: follows router tests
- [x] Vitest: moderation helper tests

## Bug Fixes
- [x] Fix media URL validation error: relative /manus-storage/ path fails z.string().url() check in posts.create router

## Link Preview Feature
- [x] Backend: tRPC procedure to fetch Open Graph metadata (title, description, image, siteName) from a URL
- [x] Database: add linkUrl, linkTitle, linkDescription, linkImage, linkSiteName columns to posts table
- [x] Frontend CreatePost: detect URLs in text, auto-fetch preview, show preview card before publishing
- [x] Frontend PostCard: render link preview card (image, title, description, site name) as clickable link
- [x] Plain URL text in post body rendered as clickable hyperlink

## Poll Feature
- [x] Database: polls table (id, postId, question, expiresAt, createdAt)
- [x] Database: poll_options table (id, pollId, text, displayOrder)
- [x] Database: poll_votes table (id, pollId, optionId, userId, createdAt) — unique per user per poll
- [x] Backend: polls.create — create a poll attached to a post
- [x] Backend: polls.get — get poll with options and vote counts for a post
- [x] Backend: polls.vote — cast or change a vote on a poll option
- [x] Frontend CreatePost: Poll button on same row as Photo and Video
- [x] Frontend CreatePost: Poll builder UI — question field + 2–4 option inputs + optional expiry
- [x] Frontend PostCard: render poll card with options, vote buttons, live result bars
- [x] Frontend PostCard: show user's own vote highlighted, disable voting after voted
- [x] Vitest: poll router tests

## Emoji Picker on Comments
- [x] Install emoji-mart package for emoji picker
- [x] Add emoji button (smiley face icon) next to comment input
- [x] Clicking emoji button opens floating emoji picker panel
- [x] Selecting an emoji inserts it at cursor position in comment input
- [x] Picker closes when clicking outside or after selecting an emoji
- [x] Emoji picker also available on the post text area in CreatePost

## Live Streaming Feature
- [x] Database: live_streams table (id, hostId, title, status enum active/ended, startedAt, endedAt, viewerCount)
- [x] Install socket.io for WebRTC signalling
- [x] Backend: Socket.IO server for WebRTC offer/answer/ICE candidate relay
- [x] Backend: tRPC live.create — create a live stream post entry
- [x] Backend: tRPC live.end — mark stream as ended
- [x] Backend: tRPC live.listActive — list currently active streams for the feed
- [x] Backend: tRPC live.get — get a single stream by id
- [x] Frontend: Live button in CreatePost on same row as Photo, Video, Poll
- [x] Frontend: LiveBroadcast component — camera preview, 5-min countdown timer, end button, viewer count
- [x] Frontend: LiveViewer component — watch stream via WebRTC, viewer count display
- [x] Frontend: Live badge on active stream cards in the feed
- [x] Auto-end stream after 5 minutes on broadcaster side
- [x] Vitest: live stream router tests

## Document Attachment Feature
- [x] Database: add docUrl, docName, docSize, docType columns to posts table
- [x] Backend: media.uploadDoc procedure — accept PDF/Word/Excel/CSV up to 20MB, store via S3
- [x] Backend: posts.create accepts docUrl, docName, docSize, docType fields
- [x] Frontend: Document button in CreatePost on same row as Photo, Video, Poll, Live
- [x] Frontend: File picker restricted to PDF, .doc, .docx, .xls, .xlsx, .csv
- [x] Frontend: Show selected document name and size preview before publishing
- [x] Frontend: PostCard renders a document card with file icon, name, size, and download link
- [x] Vitest: document upload and post creation tests

## Document Feature Gaps
- [x] Backend: validate MIME type and max 20MB in media.uploadDoc, reject invalid types/oversized files
- [x] Vitest: add dedicated document upload tests (valid doc accepted, invalid type rejected, oversized rejected)

## Three-Mode Theme Feature
- [x] CSS: define White theme variables (current default)
- [x] CSS: define Black (dark) theme variables
- [x] CSS: define Brown (warm earthy) theme variables
- [x] Context: create ThemeMode context with white/black/brown state, persisted to localStorage
- [x] NavBar: add theme switcher button (W / B / Br icons or toggle)
- [x] Apply theme class to root element so all CSS variables cascade correctly
- [x] Verify all pages and components render correctly in all three themes

## Dynamic Text + Color + Audio Feature
- [x] Database: add bgColor column to posts table
- [x] Database: add audioUrl, audioName, audioDuration columns to posts table
- [x] Backend: media.uploadAudio procedure — accept mp3/wav/ogg/m4a/webm up to 10MB
- [x] Backend: posts.create accepts bgColor, audioUrl, audioName, audioDuration fields
- [x] Frontend CreatePost: dynamic font size — large (2rem) for ≤30 chars, medium (1.25rem) for ≤80 chars, normal (0.875rem) for longer text
- [x] Frontend CreatePost: background color picker — palette of 8 colors + white default
- [x] Frontend CreatePost: Audio button on same row as Photo, Video, Poll, Live, Doc
- [x] Frontend CreatePost: audio file preview with name before publishing
- [x] Frontend PostCard: render colored background on text-only posts
- [x] Frontend PostCard: render audio player for audio posts

## Media Limits Update
- [x] Database: add photo2Url, photo3Url columns to posts table for multi-photo support
- [x] Backend: media.upload — photo max 10MB each; video max 2 min / 10MB
- [x] Backend: media.uploadAudio — max 6 min / 5MB
- [x] Backend: media.uploadDoc — max 5MB
- [x] Frontend CreatePost: Photo allows selecting up to 3 images at once
- [x] Frontend CreatePost: show 3-photo grid preview before publishing
- [x] Frontend CreatePost: Audio validation — reject if > 6 min or > 5MB
- [x] Frontend CreatePost: Video validation — reject if > 2 min or > 10MB
- [x] Frontend CreatePost: Doc validation — reject if > 5MB
- [x] Frontend PostCard: render 1/2/3 photo grid layout
- [x] LiveBroadcast: change countdown timer from 5 min to 3 min
- [x] Vitest: update tests to reflect new limits

## Landing Page Redesign
- [x] Redesign landing page: Facebook-style dark navy background, left branding column, right Sign Up / Log In tabbed panel

## Photo Lightbox
- [x] PostCard: clicking any photo in grid opens a fullscreen lightbox with prev/next arrows and close button
- [x] Lightbox: keyboard support (Escape to close, arrow keys to navigate)
- [x] Lightbox: show photo index indicator (e.g. 2 / 3)

## Lightbox Enhancements
- [x] Lightbox: touch swipe left/right gesture to navigate photos on mobile
- [x] Lightbox: download button (top-left) to save current photo
- [x] DB: add photo1Caption, photo2Caption, photo3Caption columns to posts table
- [x] Backend: posts.create accepts photo captions; posts.feed returns them
- [x] CreatePost: show optional caption input field below each selected photo
- [x] PostCard: display caption below photo in the feed grid
- [x] Lightbox: display caption below the full-screen image

## Like / Comment / Share & Reactions
- [x] DB: emoji_reactions table (postId/commentId, userId, emoji)
- [x] DB: comments table - add parentId column for threaded replies
- [x] Backend: reactions.toggle procedure (add/remove emoji reaction)
- [x] Backend: reactions.get procedure (counts per emoji per post/comment)
- [x] Backend: comments.create - support parentId for replies
- [x] Backend: posts.share procedure (increment share count, copy link)
- [x] PostCard: full action bar - Like, Emoji React picker, Comment, Share
- [x] PostCard: show emoji reaction counts below post
- [x] CommentSection: reply button on each comment, threaded indent
- [x] CommentSection: like + emoji react on comments

## Reshare Feature
- [x] DB: add resharedFromId column to posts table (nullable int, references posts.id)
- [x] Backend: posts.reshare procedure — create a new post with resharedFromId set
- [x] Backend: posts.feed — join reshared original post data when resharedFromId is set
- [x] Backend: shares.getCounts — count reshares per post (posts where resharedFromId = postId)
- [x] Frontend: PostCard action bar — split Share into "Copy Link" and "Reshare to Feed" options
- [x] Frontend: Reshare modal — optional comment field + preview of original post + Reshare button
- [x] Frontend: PostCard — render embedded original post card when resharedFromId is set
- [x] Vitest: reshare procedure tests

## 24-Hour Upload Limits
- [x] Backend: DB helper countUserPostsByTypeInWindow(userId, type, windowMs) — counts posts in last 24h by media type
- [x] Backend: posts.create — enforce limits: 1 video, 2 photo, 1 audio, 1 doc per 24h; text-only unlimited
- [x] Backend: live.start — enforce limit: 3 live streams per 24h
- [x] Backend: new tRPC query posts.myDailyQuota — returns remaining counts for each type
- [x] Frontend: CreatePost — fetch quota and show remaining count badges on VIDEO/PHOTO/AUDIO/DOC/LIVE buttons; disable + tooltip when quota exhausted
- [x] Vitest: rate-limit enforcement tests for each media type and live stream

## Page Background Color Themes
- [x] Add Light Blue theme CSS variables to index.css
- [x] Add Soft Beige theme CSS variables to index.css
- [x] Add Light Dark theme CSS variables to index.css
- [x] Add White theme CSS variables to index.css (explicit)
- [x] Update ThemeModeContext to support new theme values: lightblue, beige, lightdark, white
- [x] Update theme switcher UI buttons to show all 6 themes with color swatches

## Landing Page — Facebook-Style Always-Visible Login + Sign Up
- [x] Landing: left column — logo, tagline, feature bullets (dark navy bg)
- [x] Landing: right column — Log In card (email/password fields + Login button) always visible
- [x] Landing: right column — "Create a new account" separator + green Sign Up button below login card
- [x] Landing: no tabs, no second page — both login and sign-up visible simultaneously

## Landing Page — Embedded OAuth UI (no second page)
- [x] Landing right column: replicate Manus OAuth card UI inline (social buttons + email field)
- [x] Clicking any social/email button redirects directly to real OAuth URL
- [x] No iframe needed — pure HTML/CSS replica of the sign-in card

## Self-Contained Email/Password Auth
- [x] DB: add passwordHash, displayName columns to users table (nullable for OAuth users)
- [x] Backend: auth.register procedure (name, email, password → bcrypt hash, create user, issue session)
- [x] Backend: auth.emailLogin procedure (email, password → verify hash, issue session)
- [x] Landing: Facebook-style right column with Log In form (email+password) always visible
- [x] Landing: "Create new account" modal/toggle shows Sign Up form (name, email, password, confirm)
- [x] Landing: toggle between Log In and Sign Up without leaving the page
- [x] App.tsx: auth.me still works for both OAuth and email/password users

## Email Verification
- [x] DB: add emailVerified (boolean, default false) and verificationToken (varchar 128) columns to users table
- [x] Backend: on register, generate a secure random token, save it, send verification email via Manus notification API
- [x] Backend: auth.verifyEmail procedure (token → mark emailVerified=true, clear token, issue full session)
- [x] Backend: auth.resendVerification procedure (email → regenerate token, resend email)
- [x] Frontend: after register, show "Check your email" screen instead of logging in immediately
- [x] Frontend: /verify-email?token=... page that calls verifyEmail and redirects to feed on success
- [x] Frontend: unverified banner in feed with "Resend email" button for users who log in before verifying
- [x] App.tsx: register /verify-email route

## Daily Limit Adjustments
- [x] Update DAILY_LIMITS: video 2, photo 3, audio 12, doc 2, poll 2, live 3
- [x] Update over-limit error message to friendly 24hr message

## Auto-Delete Inactive Media (2 Years)
- [x] DB: add deletionScheduledAt (timestamp) and deletionWarningsentAt (timestamp) columns to posts table
- [x] Backend: scheduled job endpoint POST /api/scheduled/cleanup — scans posts older than 2 years with media, schedules deletion in 7 days, sends in-app notification to author
- [x] Backend: second pass in same job — deletes posts where deletionScheduledAt is in the past
- [x] Frontend: show yellow warning banner on posts approaching deletion (within 7 days)

## Sexual Content Moderation & Account Suspension
- [x] DB: add flagged (boolean), flagReason (text), suspendedUntil (timestamp), suspendReason (text) columns to users and posts tables
- [x] Backend: enhance moderation.ts to detect sexual/explicit content using LLM prompt
- [x] Backend: on flagged post — mark post as flagged, increment user violation count, suspend account for 7 days on 1st offence / 30 days on 2nd / permanent on 3rd
- [x] Backend: suspended users blocked from posting (check in posts.create and live.create)
- [x] Frontend: show suspension banner to suspended users with reason and expiry date
- [x] Frontend: flagged posts show a blurred/hidden overlay with "Content removed" label

## Email Fix & New Social Features
- [x] Fix email: configure Gmail SMTP (direct.letter@gmail.com) via App Password secret
- [x] Friend/Connect: DB tables (friend_requests, friendships)
- [x] Friend/Connect: backend procedures (send, accept, decline, list, status)
- [x] Friend/Connect: UI (Connect button on profiles, requests page, friends list)
- [x] Direct Messages: DB tables (conversations, messages, message_files)
- [x] Direct Messages: backend procedures (send, list, file upload max 3 MB)
- [x] Direct Messages: UI (inbox, thread view, file attachment)
- [x] Audio/Video Call: WebRTC peer-to-peer via Socket.IO signalling
- [x] Audio/Video Call: UI (call button on profile/message, in-call controls)

## User Search
- [x] NavBar: search input with live dropdown results (name/username)
- [x] Friends page: "Find People" tab with search input and Add Friend / Message buttons

## Final Features & Export
- [x] Test full registration flow (email verification end-to-end with Gmail)
- [x] Admin panel: flagged posts list, suspend/unsuspend users, daily limit controls
- [x] Post detail page: /post/:id with full comment thread
- [x] Self-hosting export: render.yaml, .env.example, DB migration guide, domain setup for www.facingface.com

## Final Features & Export
- [x] Test full registration flow (email verification end-to-end with Gmail)
- [x] Admin panel: flagged posts list, suspend/unsuspend users, daily limit controls
- [x] Post detail page: /post/:id with full comment thread
- [x] Self-hosting export: render.yaml, .env.example, DB migration guide, domain setup for www.facingface.com

## Session 3 — April 26 2026

- [x] Promote biswasdip@ymail.com to admin role
- [x] Reduce theme palette to 4 colors: White, Light Blue, Light Dark, Soft Beige
- [x] Make email/password login the primary auth flow (Manus OAuth as secondary/hidden)
- [x] Improve search page (full-text search on posts, users, hashtags)
- [x] Prep codebase for GitHub/Render export (verify build, README)

## Session 4 — April 26 2026
- [x] Post edit: allow author to edit post text (with edited timestamp)
- [x] Post delete: confirm dialog before delete
- [x] Hashtag system: extract #tags on post create/edit, store in hashtags table, link to /tag/:name page
- [x] Extended profile fields: hometown, current location, current role, email (private), phone (private), website/blog, YouTube channel
- [x] Landing page: red FF logo/branding (dark red, matching the site accent)
- [x] Landing page: add Nepali tagline after English tagline

## Session 5 — April 26 2026 (Bug fixes)
- [x] Fix edit button not showing on photo/video/color posts (remove bgColor restriction)
- [x] Confirm photos display correctly in feed (verified in browser)
- [x] Confirm videos display and play correctly (verified in browser)

## Session 5 — April 26 2026
- [x] Profile photo upload in Edit Profile
- [x] Forgot password email flow (request + reset pages)
- [x] Mobile bottom navigation bar (fixed, visible below 640px)

## Session 5 — April 26 2026
- [x] Profile photo upload (Camera button on avatar, already implemented)
- [x] Forgot password page at /forgot-password with email link
- [x] Reset password page at /reset-password?token=xxx
- [x] "Forgot password?" link on login form (replaces "contact admin" text)
- [x] Mobile bottom navigation bar (Home, Friends, Messages, Calls, Alerts) — visible below sm breakpoint
- [x] Badge counts on Messages and Alerts in mobile nav
- [x] Production DB migration for password_reset_tokens table

## Session 6 — April 26 2026 (Twilio OTP)
- [x] Store Twilio credentials as env secrets
- [x] Add phone_verifications table to schema + migration (0017_superb_shadowcat.sql, applied to dev + prod)
- [x] Backend: send OTP via Twilio SMS (auth.sendPhoneOtp)
- [x] Backend: verify OTP and mark phone as verified (auth.verifyPhoneOtp)
- [x] Update register flow: phone verification step added post email-verification (/verify-phone page)
- [x] Frontend: /verify-phone page with phone entry + OTP step (optional, skippable)
- [x] Frontend: OTP verification screen with 60s resend timer, change number, skip option
- [x] Test OTP flow: 7 vitest tests (sendPhoneOtp, verifyPhoneOtp) all passing (95 total)

## Session 7 — April 26 2026 (CAPTCHA + Biometric Login)
- [x] Install @hcaptcha/react-hcaptcha and add HCAPTCHA_SECRET to env
- [x] Backend: hCaptcha token verification helper (server/hcaptcha.ts)
- [x] Backend: add captchaToken to register and emailLogin procedures
- [x] Frontend: hCaptcha widget on Register form
- [x] Frontend: hCaptcha widget on Login form
- [x] Install @simplewebauthn/server and @simplewebauthn/browser
- [x] Schema: passkeys table (credentialId, publicKey, counter, userId, deviceName, createdAt)
- [x] Migration 0018: create passkeys table
- [x] Backend: auth.passkeyRegistrationOptions, auth.verifyPasskeyRegistration
- [x] Backend: auth.passkeyAuthOptions (public), auth.verifyPasskeyAuth (public)
- [x] Frontend: "Register a passkey" button on Profile page
- [x] Frontend: "Sign in with passkey / biometrics" button on Login form
- [x] Tests: hCaptcha bypass in existing tests, new passkey procedure tests
## Session 8 — April 26 2026 (hCaptcha Production Keys + TOTP 2FA + Security Page)
- [x] Sign up at hcaptcha.com and get production sitekey + secret for facingface-com.manus.space
- [x] Update VITE_HCAPTCHA_SITEKEY and HCAPTCHA_SECRET with production values
- [x] Install otpauth / speakeasy for TOTP generation and verification
- [x] Schema: totp_secrets table (userId, secret, enabled, backupCodes, createdAt)
- [x] Migration 0019: create totp_secrets table
- [x] Backend: auth.totpSetup (generate secret + QR code URI)
- [x] Backend: auth.totpVerifySetup (verify first code, enable 2FA)
- [x] Backend: auth.totpDisable (disable 2FA with code confirmation)
- [x] Backend: enforce 2FA check in emailLogin (return needs2FA flag, then auth.totpLogin)
- [x] Frontend: /settings/security page with all security controls
- [x] Frontend: 2FA setup flow (QR code display, code input, backup codes)
- [x] Frontend: 2FA login step (code prompt after password login)
- [x] Frontend: Add Security link to navbar/profile menu

## Session 9 — Active Sessions, hCaptcha Domain-lock, Deploy
- [x] Schema: active_sessions table (userId, sessionToken hash, device, ip, lastSeen, createdAt)
- [x] Migration 0020: create active_sessions table
- [x] Backend: track session on login (emailLogin, passkeyAuth, totpLogin, OAuth)
- [x] Backend: auth.listSessions (list all sessions for current user)
- [x] Backend: auth.revokeSession (revoke a specific session by id)
- [x] Backend: auth.revokeAllOtherSessions (sign out all other devices)
- [x] Frontend: Active Sessions section on /security page
- [x] Domain-lock hCaptcha for facingface-com.manus.space (manual step — add domain in hCaptcha dashboard)
- [x] Deploy to production

## Session 10 — NavBar Mobile Fix & Logo
- [x] NavBar: hide theme switcher buttons from main header on mobile (sm breakpoint)
- [x] NavBar: add theme switcher inside the user dropdown for mobile access
- [x] NavBar: FF logo square — change background to brand red (#E63329)
- [x] Favicon: update to red background FF

## Session 11 — Group Messaging & Group Calls
- [x] Schema: group_conversations table (id, name, avatar, createdBy, createdAt)
- [x] Schema: group_members table (groupId, userId, role: admin|member, joinedAt)
- [x] Schema: group_messages table (id, groupId, senderId, content, type, createdAt)
- [x] Migration 0021: create group chat tables
- [x] Backend: group.create, group.list, group.getById, group.addMember, group.removeMember, group.leave
- [x] Backend: group.sendMessage, group.getMessages (paginated)
- [x] Frontend: Groups section in Messages page — list of groups + create group dialog
- [x] Frontend: Group chat thread page (/groups/:id) with member sidebar
- [x] Schema: call_rooms table (id, groupId, hostId, status, startedAt, endedAt)
- [x] Schema: call_signals table (id, roomId, fromUserId, toUserId, type, payload, createdAt)
- [x] Migration 0022: create call tables
- [x] Backend: calls.createRoom, calls.joinRoom, calls.leaveRoom, calls.sendSignal, calls.getSignals (polling)
- [x] Frontend: Group call page (/calls/group/:roomId) with WebRTC mesh, video tiles, mute/camera/leave controls
- [x] Frontend: Start call button in group chat thread

## Session 12 — Mobile UX + Read Receipts
- [x] Mobile top navbar: hide nav icons on mobile, show real profile photo
- [x] Mobile bottom bar: add Search icon below Home
- [x] Friends list: make avatars/names link to friend profile page
- [x] Messages list: make conversation avatars/names link to friend profile
- [x] DM read receipts: mark_read procedure and seen_at column on messages
- [x] DM read receipt UI: show "Seen" / double-tick on sent messages

## Session 13 — Multi-Photo Profile & Cover Albums
- [x] Add profile_photos and cover_photos tables to schema, generate and apply migration
- [x] Backend: upload profile photo (S3), list, delete, set-active procedures
- [x] Backend: upload cover photo (S3), list, delete, set-active procedures
- [x] Profile page: profile photo album grid with upload, set-active, delete
- [x] Profile page: cover photo banner with album strip, upload, set-active
- [x] Update NavBar and Feed to use active profile photo from new table

## Session 14 — Auto Media Gallery from Posts
- [x] Backend: add getPostPhotos, getPostVideos, getPostDocs procedures for a user
- [x] Profile page: add Photos / Videos / Documents gallery tabs
- [x] Gallery tabs auto-populate from user's posts (no manual upload needed)

## Session 15 — Blue Badge Subscription (Stripe)
- [x] Set up Stripe integration (webdev_add_feature)
- [x] Add subscriptions table to schema and apply migration (0023 + 0024 isVerified column)
- [x] Add Stripe checkout session creation procedure
- [x] Add Stripe webhook handler to activate/deactivate badge (sets users.isVerified)
- [x] Add cancel subscription procedure
- [x] Build /subscription page with pricing card and subscribe button
- [x] Show blue badge on profile, posts, messages, comments, friends list
- [x] Admin panel: list verified subscribers, revoke badge (Verified tab)
- [x] Get Verified link in NavBar dropdown

## Session 16 — Price update & webhook reliability
- [x] Update Blue Badge price from £4.99 to £2.00/month (stripe.ts + UI)
- [x] Fix getOrCreateBadgePrice to deactivate stale prices and create new £2 price
- [x] Fix webhook: look up userId from DB by stripeSubscriptionId when metadata missing
- [x] Add getSubscriptionByStripeId helper to db.ts

## Session 17 — Post box visual redesign
- [x] Make the post creation box more prominent: clear "Create a Post" header, user avatar, styled textarea, visible border/shadow

## Session 18 — Standard footer pages
- [x] Create About page (/about)
- [x] Create Help page (/help)
- [x] Create Privacy Policy page (/privacy)
- [x] Create Terms of Service page (/terms)
- [x] Create Advertising page (/advertising)
- [x] Create Cookies Policy page (/cookies)
- [x] Update footer on landing/login page with all 6 links, company name FacingFace.com, contact direct.letter@gmail.com
- [x] Register all 6 routes in App.tsx (accessible without login)

## Session 19 — LinkedIn-style post box
- [x] Redesign CreatePost: compact card with rounded "Start a post" input + quick-action chips (Photo, Video, Audio, Poll, Live)
- [x] Full post form opens in a modal dialog when user clicks the input or any action chip

## Session 20 — NavBar user area redesign
- [x] Show circular profile photo (not letter avatar) in top-right NavBar
- [x] Replace dropdown with visible Logout (door/exit) icon button and Settings (gear) icon button

## Session 21 — NavBar layout fix
- [x] Restore all nav icons (Profile, Friends, Messages, Groups, Calls, Notifications, Admin)
- [x] Move circular profile photo to sit right after the Home icon in the nav bar
- [x] Top-right: Settings gear icon opens dropdown with Theme switcher, Get Verified, Security, Sign Out

## Session 22 — NavBar mobile search
- [x] Confirm profile photo removed from between Home and Profile nav icons
- [x] Search bar hidden on mobile (sm screens), moved into Settings dropdown as a search input

## Session 23 — Organisation Pages (/p/:handle)
- [x] Add org_pages, page_followers tables to schema and apply migration
- [x] Add DB helpers: createPage, getPageByHandle, followPage, unfollowPage, getPageFollowers, listPages
- [x] Build tRPC pageRouter: create, getByHandle, follow, unfollow, listPages, createPost, getFeed
- [x] Build Pages discovery page (/p) with search and category filter
- [x] Build CreatePage modal (name, handle, description, category, logo, cover)
- [x] Build Organisation Page view (/p/:handle): cover photo, logo, name, follow button, about, post feed
- [x] Page admins can post on the page (same post types as home feed)
- [x] Add Pages link to NavBar
- [x] Register /p and /p/:handle routes in App.tsx

## Session 24 — Pages feature completion
- [x] Logo and cover photo upload in Edit Page dialog (S3 upload) + hover-to-upload on logo/cover
- [x] Page posts appear in followers' home feed mixed with regular posts
- [x] Page admin management: invite/remove co-admins, transfer ownership
- [x] Move Pages link from top NavBar into Settings gear dropdown
- [x] All 95 tests pass after adding getFollowedPageIds and getPageFeedPosts to test mocks

## Session 25 — Pages: full post types + public access
- [x] Replace simple page textarea composer with full CreatePost modal (photo x3, video, audio, doc, poll, live, color, emoji, link preview) with same limits as home feed
- [x] Make /p (Pages discovery) and /p/:handle (Page view) publicly accessible without login
- [x] Follow button and post composer remain login-gated (redirect to login if not authenticated)
- [x] Page posts backend (pages.createPost) accepts all media fields (mediaUrl, mediaType, photo2Url, photo3Url, audioUrl, docUrl, pollId, bgColor, linkUrl, etc.)

## Session 25 — Pages: full post types + public access
- [x] Expand pages.createPost procedure to accept all media fields (photo x3, video, audio, doc, poll, live, color, link preview)
- [x] Replace simple textarea composer in PageView with full CreatePost modal (pageHandle prop)
- [x] CreatePost is now page-aware: shows page logo/name in header, calls pages.createPost when pageHandle is set
- [x] /p and /p/:handle are publicly accessible without login (Follow/Post remain gated)
- [x] All 95 tests pass

## Friend Invitation System (Facebook-style)
- [x] DB: friend_requests table (id, senderId, receiverId, status enum pending/accepted/declined, createdAt, updatedAt)
- [x] DB: migration 0026 applied
- [x] Backend: friends.sendRequest — send a friend request (cannot re-send if pending/accepted)
- [x] Backend: friends.cancelRequest — sender cancels a pending request
- [x] Backend: friends.acceptRequest — receiver accepts, inserts mutual follows, marks accepted
- [x] Backend: friends.declineRequest — receiver declines, marks declined
- [x] Backend: friends.unfriend — remove friendship (delete accepted request + mutual follows)
- [x] Backend: friends.listRequests — list incoming pending requests for current user
- [x] Backend: friends.listSent — list outgoing pending requests for current user
- [x] Backend: friends.listFriends — list accepted friends for a given userId
- [x] Backend: friends.status — get friendship status between current user and another user
- [x] Backend: friends.suggestions — People You May Know (users not yet friends, sorted by mutual friends count)
- [x] Frontend: Friends page (/friends) — tabs: Friend Requests / Suggestions / All Friends
- [x] Frontend: Friend Requests tab — incoming request cards with Accept / Decline buttons
- [x] Frontend: Suggestions tab — People You May Know cards with Add Friend / Remove button
- [x] Frontend: All Friends tab — list of accepted friends with Unfriend option
- [x] Frontend: Profile page — Add Friend / Cancel Request / Accept / Friends (Unfriend) button depending on status
- [x] Frontend: NavBar Friends icon shows red badge with pending request count
- [x] Frontend: Notification entry for new friend request received
- [x] Vitest: friend request router tests (send, accept, decline, cancel, unfriend, suggestions)

## Public Groups System (Facebook-style)
- [x] DB: public_groups table (id, handle, name, description, category, coverPhoto, privacy=public, createdBy, memberCount, createdAt, updatedAt)
- [x] DB: public_group_members table (id, groupId, userId, role enum admin/moderator/member, joinedAt)
- [x] DB: public_group_posts table (id, groupId, authorId, content, mediaUrl, mediaType, photo2Url, photo3Url, pollId, bgColor, linkUrl, docUrl, docName, audioUrl, createdAt, updatedAt)
- [x] DB: migration applied
- [x] Backend: publicGroups.create — create a group (auto-join as admin)
- [x] Backend: publicGroups.list — list/search groups (public, paginated)
- [x] Backend: publicGroups.getByHandle — get group details + membership status
- [x] Backend: publicGroups.update — admin can update name/description/category/cover
- [x] Backend: publicGroups.join — join a public group
- [x] Backend: publicGroups.leave — leave a group
- [x] Backend: publicGroups.getMembers — list members with roles
- [x] Backend: publicGroups.addAdmin/removeAdmin — promote/demote members
- [x] Backend: publicGroups.createPost — post in group (members only, full media fields)
- [x] Backend: publicGroups.getPosts — get group posts (public read)
- [x] Backend: publicGroups.uploadCover — upload group cover photo
- [x] Frontend: /g route — Groups discovery page with search + category filter + Create Group button
- [x] Frontend: /g/:handle — GroupView page with cover, header, members panel, posts feed, join/leave button
- [x] Frontend: GroupView admin panel — edit group info, manage members, promote/demote
- [x] Frontend: GroupView post composer — full CreatePost modal for group members
- [x] Frontend: NavBar Settings dropdown — "Build your Public Group" entry below "Build your page"
- [x] Vitest: public groups router tests (create, join, leave, post, admin)

## Mobile UX Improvements (Session 27)
- [x] Friends badge on mobile bottom bar (pending count red badge on Friends icon)
- [x] Profile photo in post composer (show real avatar instead of initial letter)
- [x] Pull-to-refresh on home feed (touch gesture to reload posts)

## Mobile Post Composer UX (Session 27b)
- [x] Photo upload: show only selected photo(s) + progressive "Add another photo" button (not 3 empty slots upfront)

## Bug Fixes
- [x] Mobile Sign Out button not working (dropdown menu) - fixed: dropdown was taller than viewport, added maxHeight + overflow-y scroll
- [x] Desktop NavBar: replace generic Profile icon with user's real profile photo/avatar

## Mobile Top Bar Improvements (Session 27c)
- [x] Shorten logo text on very small phones (< 375px): hide ".com" suffix
- [x] Active state on right icons (Search, Notifications, Messages) when on those pages
- [x] Swipe-to-open menu: left-edge swipe gesture opens the dropdown

## UX Polish & Bug Fixes (Session 28)
- [x] Fix uploaded photos not displaying in posts/feed
- [x] Swipe indicator: left-edge drag handle pill to hint at swipe gesture
- [x] Bottom bar active colour: use brand red for active icon in mobile bottom bar
- [x] Haptic feedback: navigator.vibrate(8) when swipe threshold crossed
- [x] Additional UX polish (smooth transitions, empty states, etc.)

## Post Editing (Session 29)
- [x] Backend: posts.edit procedure — author can update text, bgColor; returns updated post
- [x] Frontend PostCard: wire up existing Edit button to open an edit modal
- [x] Frontend: EditPostModal component — pre-filled text, bg color picker, save/cancel
- [x] Frontend: optimistic update on save — update post in feed without full reload
- [x] Vitest: post edit tests (author can edit, non-author cannot)

## User Search Page (Session 29)
- [x] Frontend: /search page — shows results for ?q= query param, user cards with avatar/name/bio/follow button
- [x] Frontend: NavBar search (desktop + mobile) navigates to /search?q=... on Enter
- [x] Frontend: App.tsx — register /search route

## Stories / Reels Feature (Session 29)
- [x] DB: stories table (id, authorId, mediaUrl, mediaType enum photo/video, caption, duration, expiresAt, viewCount, createdAt)
- [x] DB: story_views table (id, storyId, viewerId, viewedAt)
- [x] DB: migration applied
- [x] Backend: stories.create — upload photo/video story (expires in 24h)
- [x] Backend: stories.list — list active (non-expired) stories grouped by author
- [x] Backend: stories.markViewed — record that current user viewed a story
- [x] Backend: stories.delete — author can delete own story
- [x] Frontend: StoryBar component — horizontal scrollable row of story bubbles at top of feed
- [x] Frontend: StoryViewer component — fullscreen story viewer with progress bar, tap to advance, swipe to close
- [x] Frontend: Add Story button in StoryBar (opens camera/file picker)
- [x] Frontend: Story upload flow — photo (up to 5MB) or short video (up to 30s/10MB)
- [x] Frontend: Feed.tsx — render StoryBar above the post composer
- [x] Vitest: stories router tests (create, list, markViewed, delete)

## Story Expiry Cleanup Job (Session 30)
- [x] Backend: POST /api/scheduled/story-cleanup endpoint (deletes expired stories from DB)
- [x] Scheduled task: runs every hour, calls cleanup endpoint
- [x] Deploy checkpoint so scheduled task can reach the live endpoint

## Story Replies / Reactions (Session 30)
- [x] DB: story_reactions table (id, storyId, reactorId, emoji, createdAt)
- [x] DB: migration applied
- [x] Backend: stories.react — add/toggle emoji reaction on a story
- [x] Backend: stories.getReactions — list reactions for a story (owner only)
- [x] Frontend: StoryViewer — emoji reaction bar at bottom (❤️ 😂 😮 😢 👏)
- [x] Frontend: StoryViewer — reaction count badge on story bubble in StoryBar
- [x] Frontend: DM reply from story viewer — tap reply to open DM thread pre-filled

## Story Highlights (Session 30)
- [x] DB: story_highlights table (id, authorId, title, coverUrl, createdAt)
- [x] DB: story_highlight_items table (id, highlightId, storyId, addedAt)
- [x] DB: migration applied
- [x] Backend: stories.createHighlight — create a named highlight reel
- [x] Backend: stories.addToHighlight — add a story to a highlight
- [x] Backend: stories.removeFromHighlight — remove a story from a highlight
- [x] Backend: stories.getHighlights — list highlights for a user (public)
- [x] Backend: stories.getHighlightStories — get stories in a highlight
- [x] Frontend: Profile page — Highlights row below cover photo (circles with title)
- [x] Frontend: StoryViewer — "Add to Highlight" button for own stories
- [x] Frontend: CreateHighlightModal — name + cover picker

## Story Modal Layout Fix (Session 31)
- [x] Fix story creation modal: bottom sheet overflows on mobile, caption input hidden at bottom, media picker not tappable
- [x] Use compact fixed-height layout with max-h and overflow-y-auto so it fits within mobile viewport

## Dropdown Menu Fix (Session 32)
- [x] Move top-right dropdown menu to align left (text left-justified, readable)
- [x] Rename menu items: 'Create Public Group' and 'Create your Page'

## Sub-Navigation Bar (Session 33)
- [x] Add horizontal sub-nav bar below main nav bar with: Home, Profile, Friends, Messages, Groups, Calls, Notifications
- [x] Active link highlighted with brand red underline
- [x] Scrollable on mobile (overflow-x-auto) so all items are reachable
- [x] Adjust page top padding to account for the extra bar height

## Sub-Nav Scroll Collapse & Stories Link (Session 34)
- [x] Sub-nav hides on scroll-down, reappears on scroll-up (smooth CSS transition)
- [x] Main content top padding adjusts when sub-nav is hidden (no gap)
- [x] Stories link added to sub-nav bar (between Home and Profile)
- [x] Stories link added to the dropdown menu (settings gear)

## Remove Avatar from Dropdown (Session 38)
- [x] Remove username and avatar header from the top of the Settings & More dropdown

## Dropdown Menu Restructure (Session 36)
- [x] Keep only Home as top-level nav item in dropdown; nest Profile, Friends, Messages, Groups, Calls, Notifications as sub-items under Home

## Dropdown Home Collapse (Session 37)
- [x] Sub-items (Profile, Friends, Messages, Groups, Calls, Notifications) collapsed by default
- [x] Tapping Home toggles expand/collapse with a chevron indicator

## Dropdown Polish (Session 39)
- [x] Move Sign Out button to the top of the dropdown
- [x] Add "My Account" link at the top (navigates to /profile)
- [x] Rename gear icon label from "ADMIN" to "More"

## Post Composer Enhancements (Session 40)
- [x] Fix TypeScript errors: add getScheduledPosts() and cancelScheduledPost() helpers to db.ts
- [x] Fix TypeScript errors: refactor getScheduled/cancelScheduled procedures in routers.ts to use db.ts helpers
- [x] Discard Draft Confirmation: AlertDialog shown when closing modal with unsaved text/media
- [x] Post Scheduling: Schedule button opens Calendar + time picker Popover, stores scheduledAt Date
- [x] Post Scheduling: scheduledAt passed to posts.create mutation; success toast shows scheduled date
- [x] Post Scheduling: "Scheduled for …" badge shown in composer with X to clear
- [x] Character Counter: shows text.length / 2000 below textarea; yellow > 1800, red > 1950; Post button disabled when > 2000

## Session 41 — Three New Features
- [x] Scheduled Posts page at /scheduled: list upcoming scheduled posts with cancel button
- [x] Scheduled Posts: link in NavBar (desktop) and MobileBottomNav
- [x] Scheduled Posts: route registered in App.tsx
- [x] Draft recovery indicator: show "Draft" badge on collapsed composer card when localStorage draft exists
- [x] Post edit feature: edit button (pencil icon) on own posts in PostCard
- [x] Post edit feature: inline edit textarea pre-filled with current text (inline, not modal)
- [x] Post edit feature: save via posts.edit tRPC mutation, invalidate feed/profile queries
- [x] Post edit feature: show "Edited" label on post card after editing

## Session 42 — Reschedule, Edit Media, Post Version History
- [x] DB: post_edits table (id, postId, previousText, previousBgColor, editedAt)
- [x] DB: apply migration for post_edits table
- [x] Backend: reschedulePost DB helper (update scheduledAt for a post owned by user)
- [x] Backend: posts.reschedule tRPC mutation
- [x] Backend: savePostEdit DB helper (insert row into post_edits before editing)
- [x] Backend: posts.getEditHistory tRPC query (list edit history for a post)
- [x] Backend: update posts.edit to save previous version to post_edits before overwriting
- [x] Frontend Scheduled page: Reschedule button opens date/time picker popover, calls posts.reschedule
- [x] Frontend PostCard: Edit media — swap/remove photo, video, audio in inline editor
- [x] Frontend PostCard: "View edit history" link on edited posts opens a Dialog with version timeline

## Session 43 — Diff View, Scheduled Preview, Edit History Privacy
- [x] DB: add hideEditHistory boolean column to posts table (default false)
- [x] DB: apply migration for hideEditHistory column
- [x] Backend: extend posts.edit to accept hideEditHistory field
- [x] Backend: extend posts.getEditHistory to return empty array if post.hideEditHistory is true (for non-owners)
- [x] Backend: include hideEditHistory in feed/getByUser query responses
- [x] Frontend PostCard: word-diff rendering in Edit History dialog (highlight added/removed words)
- [x] Frontend Scheduled page: expandable preview card showing full text + media thumbnail for each scheduled post
- [x] Frontend PostCard: "Hide edit history" toggle in inline editor; saves via posts.edit

## Session 44 — Friends Page Mobile Tab Fix
- [x] Friends page: fix tab bar overflow on mobile (tabs squash together / overlap)
- [x] Friends page: make tab bar horizontally scrollable with proper min-width per tab

## Session 45 — Fix Images Not Displaying on Deployed Site
- [x] Diagnose: check how avatar/post media URLs are stored (relative vs absolute)
- [x] Diagnose: check storagePut returns /manus-storage/... paths and they work in production
- [x] Fix: images confirmed working on deployed site — /manus-storage/* proxy returns HTTP 200 via CloudFront redirect with CORS headers

## Session 46 — Fix Post Images Not Loading
- [x] PostCard: change PostImageCell from loading="lazy" to loading="eager" so images load immediately without waiting for scroll

## Session 47 — Progressive Images, Compression, Offline Indicator
- [x] Backend: install Sharp, add compressImage helper (resize to max 1200px, JPEG/WebP quality 80)
- [x] Backend: apply compression to all image upload procedures (avatar, post media, profile photo, cover photo, story, page cover/avatar)
- [x] Frontend: progressive image loading in PostImageCell — show blurred low-res placeholder that fades to full-res
- [x] Frontend: offline/poor-connection indicator banner (navigator.onLine + connection change events)

## Session 47 — Progressive Images, Compression, Offline Banner
- [x] Server: install Sharp for image compression
- [x] Server: create server/imageUtils.ts with compressImage, compressAvatar, compressCover helpers
- [x] Server: apply compression to post media upload (images only, skip video)
- [x] Server: apply compressAvatar to uploadProfilePhoto, uploadAvatar, page logo upload
- [x] Server: apply compressCover to uploadCoverPhoto, page cover, group cover
- [x] Server: apply compressImage to story media upload (images only)
- [x] Frontend: PostImageCell — blurred placeholder (same URL + CSS blur) fades out when full-res loads
- [x] Frontend: create useNetworkStatus hook (navigator.onLine + Network Information API)
- [x] Frontend: create NetworkStatusBanner component (offline=red, slow=amber, restored=green)
- [x] Frontend: mount NetworkStatusBanner in AppLayout (App.tsx)

## Session 48 — WebP, Upload Progress, Alt-Text
- [x] Backend: switch post media image compression from JPEG to WebP (compressImage format: "webp")
- [x] Backend: add photo alt-text columns to posts table (photo1Alt, photo2Alt, photo3Alt)
- [x] Backend: apply migration for alt-text columns
- [x] Backend: add media.generateAltText tRPC procedure (call LLM with image URL, return alt text string)
- [x] Backend: posts.create accepts photo alt-text fields
- [x] Frontend: upload progress bar — show percentage while photo/video is uploading
- [x] Frontend: after photo upload completes, auto-call generateAltText and store result
- [x] Frontend: use generated alt-text in PostImageCell img alt attribute (stored in DB, passed in post payload)
- [x] Frontend: alt-text is auto-generated (editing before posting handled via caption field)

## Session 48 — WebP Conversion, Upload Progress, Alt-Text Generation
- [x] Backend: switch post media compression to WebP format in imageUtils.ts
- [x] Backend: update post media upload to use .webp extension
- [x] DB: add photo1Alt, photo2Alt, photo3Alt columns to posts and public_group_posts tables
- [x] DB: apply migration 0037 for alt-text columns
- [x] Backend: add media.generateAltText tRPC procedure (LLM vision call)
- [x] Backend: extend posts.create input schema and createPost call to accept photo alt-text fields
- [x] Frontend: add uploadProgress state (0-100) to CreatePost.tsx
- [x] Frontend: replace photo/video upload with XHR-based uploadWithProgress for real progress tracking
- [x] Frontend: show progress bar (red fill + % label) above publish button row during upload
- [x] Frontend: auto-generate alt text for each uploaded photo after upload, store in post payload

## Session 49 — Alt-Text Editor, Video Thumbnail, Batch WebP
- [x] Frontend CreatePost: show editable alt-text input below each uploaded photo (pre-filled with LLM result)
- [x] Frontend CreatePost: pass edited alt-text values to post payload
- [x] DB: add videoPosterUrl column to posts table for video thumbnail
- [x] Backend: apply migration for videoPosterUrl column
- [x] Backend: after video upload, generate a poster image via LLM image generation and store it
- [x] Backend: posts.create accepts videoPosterUrl field
- [x] Frontend PostCard: use videoPosterUrl as the <video> poster attribute
- [x] Script: batch WebP conversion — re-fetch all existing post images from S3, compress to WebP, update DB URLs

## Session 49 — Alt-Text Editor, Video Thumbnail, Batch WebP
- [x] Frontend CreatePost: show editable alt-text input below each uploaded photo (pre-filled with LLM result)
- [x] Frontend CreatePost: pass edited alt-text values to post payload
- [x] DB: add videoPosterUrl column to posts table for video thumbnail
- [x] Backend: apply migration for videoPosterUrl column
- [x] Backend: after video upload, generate a poster image via LLM image generation and store it
- [x] Backend: posts.create accepts videoPosterUrl field
- [x] Frontend PostCard: use videoPosterUrl as the video poster attribute
- [x] Script: batch WebP conversion of existing post images

## Session 49 — Alt-text Editor, Video Poster, Batch WebP
- [x] Backend: add videoPosterUrl column to posts table + migration
- [x] Backend: generate AI video poster after video upload (best-effort, stored in videoPosterUrl)
- [x] Backend: posts.create accepts videoPosterUrl field
- [x] Frontend: add photoAltTexts state to CreatePost; pre-fill from AI after upload
- [x] Frontend: show editable alt-text input below each photo in composer (italic placeholder)
- [x] Frontend: use photoAltTexts (user-edited) values in post payload
- [x] Frontend: VideoPlayer accepts poster prop; PostCard passes videoPosterUrl
- [x] Script: scripts/convert-to-webp.mjs — batch converted 11 existing images (avg ~67% size reduction)

## Session 50 — Video Poster FFmpeg, Alt-text Hover, Intersection Observer
- [x] Backend: install ffmpeg + fluent-ffmpeg, extract frame at 1s from uploaded video for poster
- [x] Backend: replace AI-generated poster with real video frame extraction
- [x] Frontend PostCard: show alt-text as tooltip on photo hover
- [x] Frontend: useIntersectionObserver hook for lazy image loading with 200px margin
- [x] Frontend PostCard: apply Intersection Observer to PostImageCell

## Session 50 -- Video Poster FFmpeg, Alt-text Hover, Intersection Observer
- [x] Backend: install ffmpeg + fluent-ffmpeg, extract frame at 1s from uploaded video for poster
- [x] Backend: replace AI-generated poster with real video frame extraction
- [x] Frontend PostCard: show alt-text as tooltip on photo hover
- [x] Frontend: useIntersectionObserver hook for lazy image loading with 200px margin
- [x] Frontend PostCard: apply Intersection Observer to PostImageCell

## Session 51 -- Video Seek Poster, Caption Auto-Translate, Accessibility Audit
- [x] Backend: media.seekPoster tRPC mutation (accepts videoUrl + seekSeconds, returns posterUrl)
- [x] Backend: update media.upload to accept optional custom posterUrl override
- [x] Frontend CreatePost: video seek slider UI to pick poster frame after video upload
- [x] Frontend CreatePost: preview selected poster frame, pass custom posterUrl to posts.create
- [x] Backend: media.translateCaption tRPC mutation (accepts text + targetLang, returns translated text)
- [x] Frontend PostCard: detect viewer browser language, show translated captions on demand
- [x] Frontend PostCard: Translate button on photo captions for non-native language viewers
- [x] Accessibility: add aria-label to all icon-only buttons (like, comment, share, etc.)
- [x] Accessibility: ensure visible focus rings on all interactive elements
- [x] Accessibility: check colour contrast on key text elements (muted text, badges)
- [x] Accessibility: add role and aria attributes to PostCard media (img alt, video title)

## Session 52 -- Keyboard Lightbox, Comment Translate, Auto-Poster
- [x] Frontend PhotoLightbox: add role="dialog" aria-modal="true" aria-label to lightbox overlay
- [x] Frontend PhotoLightbox: focus trap — move focus into lightbox on open, restore on close
- [x] Frontend PhotoLightbox: Tab/Shift+Tab cycles only through lightbox controls (prev, next, close, download)
- [x] Frontend ImageLightbox: same focus trap and ARIA treatment as PhotoLightbox
- [x] Backend: media.translateCaption reuse for comments (already exists, just wire frontend)
- [x] Frontend CommentSection: Translate button on each comment text, Show Original toggle
- [x] Frontend CommentSection: detect viewer browser language (navigator.language)
- [x] Backend posts.create: if mediaType=video and no videoPosterUrl provided, call seekPoster at 1s and save as videoPosterUrl

## Session 52b -- Super Admin Role

- [x] Database: extend users.role enum to include super_admin
- [x] Database: promote Biswasdip Tigela (ID 1) to super_admin
- [x] Backend: adminProcedure updated to allow super_admin (backward compatible)
- [x] Backend: superAdminProcedure guard (super_admin only)
- [x] Backend: admin.listAdmins procedure (super_admin only)
- [x] Backend: admin.promoteToAdmin procedure (super_admin only, cannot touch other super_admins)
- [x] Backend: admin.demoteToUser procedure (super_admin only, cannot touch other super_admins)
- [x] Frontend Admin.tsx: redirect allows super_admin
- [x] Frontend Admin.tsx: "Manage Admins" tab visible only to super_admin
- [x] Frontend Admin.tsx: AdminsTab with email search + promote + demote + current admins list

## Session 53 -- Admin Activity Log & Promotion Notification

- [x] Database: admin_audit_log table (id, actorId, action, targetUserId, targetPostId, metadata, createdAt)
- [x] Database: run migration for admin_audit_log
- [x] Backend: db.ts helper — insertAuditLog, getAuditLogs
- [x] Backend: wire audit log into admin.promoteToAdmin
- [x] Backend: wire audit log into admin.demoteToUser
- [x] Backend: wire audit log into admin.suspendUser
- [x] Backend: wire audit log into admin.unsuspendUser
- [x] Backend: wire audit log into admin.deletePost
- [x] Backend: wire audit log into admin.unflagPost
- [x] Backend: wire audit log into admin.setUserRole
- [x] Backend: admin.getAuditLog tRPC procedure (super_admin only, paginated)
- [x] Frontend Admin.tsx: Audit Log tab (super_admin only) — table of actions with actor, action, target, timestamp
- [x] Backend: send in-app notification to user when promoted to admin (promoteToAdmin procedure)
- [x] Backend: send in-app notification to user when demoted (demoteToUser procedure)
- [x] Vitest: audit log insertion and retrieval tests

## Session 54 -- Sale & Buy Shop (Marketplace)

- [x] Database: shop_listings table (id, sellerId, title, description, price, currency, condition, category, mediaUrls JSON, location, lat, lng, contactEmail, contactPhone, status, createdAt, updatedAt)
- [x] Database: shop_daily_limits table or in-memory constant (separate from post limits)
- [x] Database: run migration for shop_listings
- [x] Backend: db.ts helpers — createListing, getListings, getListingById, updateListing, deleteListing, searchListings, getMyListings
- [x] Backend: shop tRPC router — createListing, getListings, getListing, updateListing, deleteListing, searchListings, getMyListings
- [x] Backend: daily listing limit enforcement (separate from post limits)
- [x] Frontend: /shop route — browse/search page with grid layout, category filter, price range filter, condition filter, search bar
- [x] Frontend: /shop/new route — create listing page (title, description, price, currency, condition, category, up to 10 photos/1 video, location text, map pin, contact email, contact phone)
- [x] Frontend: /shop/:id route — listing detail page (full photos, description, map, contact reveal button, seller profile link, mark as sold)
- [x] Frontend: /shop/my route — my listings page (active, sold, draft)
- [x] Frontend: sidebar link "Sale & Buy Shop" under Create Page and Create Group
- [x] Frontend: App.tsx route registration for /shop, /shop/new, /shop/:id
- [x] Frontend: NavBar or sidebar shop icon/link
- [x] Vitest: shop listing creation and retrieval tests

## Session 55 -- Listing Messaging, Saved Listings, Admin Moderation

- [x] Database: shop_saved table (id, userId, listingId, createdAt)
- [x] Database: add isFlagged, flagReason, removedByAdmin columns to shop_listings
- [x] Database: run migrations
- [x] Backend: db.ts helpers -- saveShopListing, unsaveShopListing, getSavedListings, isListingSaved
- [x] Backend: shop.saveListing tRPC mutation (toggle save/unsave)
- [x] Backend: shop.getSavedListings tRPC query
- [x] Backend: shop.isSaved tRPC query (check if current user saved a listing)
- [x] Frontend: Save/heart button on Shop browse grid cards
- [x] Frontend: Save/heart button on ShopListingDetail page
- [x] Frontend: /shop/saved route -- saved listings page (integrated into Shop.tsx as Saved tab)
- [x] Frontend: App.tsx -- register /shop/saved route
- [x] Frontend: NavBar sidebar -- Saved tab integrated into Shop browse page
- [x] Frontend: ShopListingDetail -- Message Seller button opens DM thread pre-filled with listing title
- [x] Backend: admin.getShopListings tRPC procedure (super_admin/admin, paginated, filter by status/flagged)
- [x] Backend: admin.flagShopListing tRPC procedure (mark listing as flagged with reason)
- [x] Backend: admin.removeShopListing tRPC procedure (set status=removed, log to audit)
- [x] Backend: admin.restoreShopListing tRPC procedure (restore removed listing)
- [x] Frontend Admin.tsx: Shop Listings tab (admin/super_admin) -- table of listings with flag/remove/restore actions
- [x] Vitest: shop_saved toggle, getSavedListings, admin moderation tests

## Session 56 -- Super Admin Controls, Media Limits, Pages/Groups/Shop Admin Tabs, Content Moderation

### Delete Member Account (super_admin only)
- [x] Backend: admin.deleteAccount procedure (super_admin only) — cascade delete user posts, comments, likes, follows, notifications, shop listings, saved, sessions; then delete user row
- [x] Backend: log account deletion to admin_audit_log
- [x] Frontend Admin.tsx: Delete Account button in Users tab (super_admin only), confirmation dialog

### Configurable Media Limits (super_admin)
- [x] Database: media_limits table (id, limitKey, value, updatedAt, updatedByAdminId)
- [x] Database: run migration for media_limits
- [x] Backend: db.ts helpers — getMediaLimits, setMediaLimit
- [x] Backend: admin.getMediaLimits tRPC query (public — used by upload validation)
- [x] Backend: admin.setMediaLimit tRPC mutation (super_admin only)
- [x] Backend: wire media_limits into media.upload, media.uploadAudio, media.uploadDoc server-side validation
- [x] Frontend Admin.tsx: Media Limits tab (super_admin only) — editable fields for each limit with save button

### Pages Admin Tab
- [x] Database: add isSuspended, suspendedAt, suspendedByAdminId, suspendReason columns to pages table
- [x] Database: run migration for pages suspension columns
- [x] Backend: admin.getPages tRPC query (admin/super_admin) — paginated list with search
- [x] Backend: admin.suspendPage tRPC mutation — set isSuspended=true, log to audit
- [x] Backend: admin.unsuspendPage tRPC mutation — set isSuspended=false, log to audit
- [x] Frontend Admin.tsx: Pages tab (admin/super_admin) — table with suspend/unsuspend actions

### Groups Admin Tab
- [x] Database: add isSuspended, suspendedAt, suspendedByAdminId, suspendReason columns to groups table
- [x] Database: run migration for groups suspension columns
- [x] Backend: admin.getGroups tRPC query (admin/super_admin) — paginated list with search
- [x] Backend: admin.suspendGroup tRPC mutation — set isSuspended=true, log to audit
- [x] Backend: admin.unsuspendGroup tRPC mutation — set isSuspended=false, log to audit
- [x] Frontend Admin.tsx: Groups tab (admin/super_admin) — table with suspend/unsuspend actions

### Sexual / Harmful Content Moderation Queue
- [x] Database: content_reports table (id, reporterId, targetType enum post/comment/listing, targetId, reason, status enum pending/reviewed/actioned, adminNote, createdAt, reviewedAt, reviewedByAdminId)
- [x] Database: run migration for content_reports
- [x] Backend: db.ts helpers — createReport, getReports, updateReport
- [x] Backend: posts.report tRPC mutation (authenticated) — report a post with reason
- [x] Backend: admin.getReports tRPC query (admin/super_admin) — paginated, filter by status/type
- [x] Backend: admin.reviewReport tRPC mutation — mark reviewed, optional adminNote, optional delete target content
- [x] Backend: admin.respondToReporter tRPC mutation — send in-app notification to reporter with admin response message
- [x] Backend: LLM auto-flag — on posts.create, if LLM detects sexual/harmful content, auto-create a content_report
- [x] Frontend PostCard: Report button (flag icon) on post action menu — report dialog with reason dropdown
- [x] Frontend Admin.tsx: Content Reports tab (admin/super_admin) — queue with post preview, reason, status; actions: View, Delete post, Dismiss, Respond to reporter
- [x] Vitest: media limits get/set, deleteAccount cascade, report creation tests

## Session 57 — Suspended Banner, Bulk Moderation, Media Limits UI

### Suspended Page/Group Banner
- [x] Frontend PageDetail: check isSuspended field from tRPC; if true show full-width red banner "This page has been suspended by an administrator" and disable post/comment/join interactions
- [x] Frontend GroupDetail: same suspended banner + disable post/join interactions
- [x] Backend: ensure admin.getPage and admin.getGroup (or existing page/group queries) return isSuspended + suspendReason

### Bulk Moderation Actions (Content Reports tab)
- [x] Frontend Admin.tsx Content Reports tab: add checkbox column to reports table
- [x] Frontend Admin.tsx: "Select All" checkbox in header row
- [x] Frontend Admin.tsx: bulk action toolbar (appears when ≥1 selected) with buttons: Bulk Dismiss, Bulk Action (mark actioned), Bulk Delete Content
- [x] Backend: admin.bulkReviewReports tRPC mutation — accept array of reportIds + action enum (dismiss/action/delete_content)

### Media Limits Display on Upload UI
- [x] Frontend: tRPC query trpc.admin.getMediaLimits in CreatePost component (or shared hook)
- [x] Frontend CreatePost: show helper text under Photo button "Max {photo_max_mb} MB"
- [x] Frontend CreatePost: show helper text under Video button "Max {video_max_mb} MB · {video_max_seconds÷60} min"
- [x] Frontend CreatePost: show helper text under Audio button "Max {audio_max_mb} MB · {audio_max_seconds÷60} min"
- [x] Frontend CreatePost: show helper text under Doc button "Max {doc_max_mb} MB"
- [x] Frontend: validate file size client-side against limits before base64 encoding (early rejection with clear message)

### Vitest
- [x] Session 57 vitest tests: suspended banner logic, bulk action guard, media limits hint formatting

## Session 58 — Admin Panel Fixes

- [x] Fix: Delete member account button must be visible to super_admin in Users tab (investigate why it's missing on live site)
- [x] Fix: Media limits table — add photo_daily_limit (max photos per 24h), video_daily_limit (max videos per 24h), audio_daily_limit (max audio per 24h) as adjustable rows
- [x] Fix: Rename "Groups" tab to "Public Groups" in admin panel
- [x] DB migration: add photo_daily_limit, video_daily_limit, audio_daily_limit to media_limits table defaults
- [x] Wire daily quota limits from DB into the posts.myDailyQuota procedure
- [x] Session 58 vitest tests

## Session 59 — Admin Improvements

- [x] Rename "Shop" tab to "Buy & Sale Shop" in admin panel
- [x] Quota exceeded notification: show clear message with exact reset time when daily upload limit is hit
- [x] Per-role quota overrides: verified/subscribed members get configurable higher daily limits (photo_verified_daily, video_verified_daily, etc.) in Media Limits table
- [x] DB: seed verified quota override rows in media_limits table
- [x] Backend: getUserDailyQuota reads verified quota if user isVerified
- [x] Deleted accounts log: dedicated section in Audit Log tab showing delete_account entries with actor, target name/email, timestamp
- [x] Session 59 vitest tests

## Session 60 — Reels Feature
- [x] DB: reels table (id, authorId, videoUrl, thumbnailUrl, caption, duration, viewCount, likeCount, commentCount, createdAt)
- [x] DB: reel_likes table (reelId, userId, createdAt)
- [x] DB: reel_comments table (id, reelId, authorId, content, createdAt)
- [x] DB: reel_views table (reelId, userId, createdAt) for dedup view counting
- [x] DB: migration for all reel tables
- [x] Backend: reels.upload procedure (authenticated) — upload video + optional thumbnail
- [x] Backend: reels.feed procedure (public) — paginated feed, newest first, with isLiked for auth user
- [x] Backend: reels.like/unlike procedure (authenticated)
- [x] Backend: reels.view procedure (authenticated) — dedup view tracking
- [x] Backend: reels.addComment procedure (authenticated)
- [x] Backend: reels.getComments procedure (public)
- [x] Backend: reels.delete procedure (authenticated, own reels only)
- [x] Frontend: /reels page — full-screen vertical video feed, auto-play on scroll, like/comment/share sidebar buttons
- [x] Frontend: Reels upload modal — drag-drop or file picker for video, caption input, post button
- [x] Frontend: Reels comments drawer — slide-up panel with comment list and input
- [x] Nav: add Reels icon (Clapperboard) to NavBar bottom-right area, remove Alerts icon from top nav
- [x] Nav: add Reels link to profile dropdown menu (same line as Profile, Friends)
- [x] Route: register /reels in App.tsx
- [x] Session 60 vitest tests (reels router) — 15 tests added, 238 total passing

## Session 61 — WebRTC Calls in Messenger
- [x] Create CallModal.tsx — reusable WebRTC one-to-one call overlay (voice + video, mute/camera toggle, duration timer, incoming/calling/connected states)
- [x] Wire CallModal into Messages.tsx — voice/video call buttons open real WebRTC call instead of "coming soon" toast
- [x] Add Socket.IO incoming call listener in Messages.tsx — incoming calls ring while in the messenger
- [x] Add global incoming call listener in App.tsx (AppLayout) — incoming calls ring on any page outside /messages
- [x] TypeScript clean (EXIT:0 on full tsc --noEmit)
- [x] All 223 tests pass

## Session 62 — Call History, Unread Badge, Push Notifications

### Call History Log
- [x] DB: call_history table (id, callerId, calleeId, type enum voice/video, status enum missed/answered/declined, startedAt, endedAt, duration)
- [x] DB: migration for call_history table
- [x] Backend: db helpers insertCallHistory, getCallHistory(userId, limit, cursor)
- [x] Backend: tRPC calls.getHistory procedure (protected, paginated)
- [x] Frontend: Calls page — add "History" tab showing past/missed calls with caller avatar, name, type icon, duration, timestamp
- [x] Frontend: Calls page — missed calls shown in red, answered in green, declined in grey
- [x] CallModal: on hangup/answer/decline, record call history via tRPC mutation

### Unread Message Badge
- [x] Backend: tRPC dm.unreadCount procedure — count conversations with unread messages for current user
- [x] Frontend: NavBar — show red badge dot/count on Messages icon when unreadCount > 0
- [x] Frontend: MobileBottomNav — same red badge on Messages icon
- [x] Frontend: badge clears when user opens Messages page

### Push Notifications for Incoming Calls
- [x] DB: push_subscriptions table (id, userId, endpoint, p256dh, auth, createdAt)
- [x] DB: migration for push_subscriptions table
- [x] Backend: install web-push npm package
- [x] Backend: tRPC push.subscribe procedure — save push subscription for current user
- [x] Backend: tRPC push.unsubscribe procedure — remove push subscription
- [x] Backend: callSignaling.ts — on call:offer, send Web Push notification to callee's subscriptions
- [x] Frontend: service worker (client/public/sw.js) — handles push event, shows notification with caller name + Accept/Decline actions
- [x] Frontend: App.tsx — request notification permission + register service worker + subscribe to push on login
- [x] Session 62 vitest tests — 11 new tests, 249 total passing

## Session 63 — Missed Call Badge, Call-back, DM Push Notifications

### Missed call badge on Calls nav icon
- [x] Backend: tRPC callHistory.missedCount procedure — count missed calls since lastCallsSeenAt
- [x] Backend: tRPC callHistory.markSeen procedure — reset missed call badge when user visits /calls
- [x] DB: lastCallsSeenAt column added to users table, migration applied
- [x] Frontend: NavBar — red count badge on Calls icon when missedCount > 0
- [x] Frontend: MobileBottomNav — red badge on Calls icon
- [x] Frontend: Calls page — markSeen called when History tab is opened

### Call-back from history
- [x] Frontend: Calls history tab — voice + video call-back buttons on each row
- [x] Frontend: call-back buttons open WebRTC call directly from history row

### Push notification for new DMs
- [x] Backend: DM send procedure fires sendDmPushNotification non-blocking after message insert
- [x] Backend: webpush.ts — sendDmPushNotification helper added
- [x] Frontend: sw.js — handles new_dm push event, click opens /messages
- [x] Session 63 vitest tests — 16 tests added, 265 total passing

## Session 64 — Mobile Nav Fix
- [x] Add Search item to mobile bottom nav bar
- [x] Fix missed call badge (Calls item missing from bottom nav)

## Session 65 — Profile Page Enhancements
- [x] Bio section visible below stats bar on profile page
- [x] 3-column masonry photo grid in ProfilePhotoAlbum (replace horizontal scroll)
- [x] Cover photo parallax scroll effect on profile header

## Session 65 — Profile Page Enhancements

- [x] Bio section visible below stats bar on profile page
- [x] 3-column masonry photo grid in ProfilePhotoAlbum (replace horizontal scroll)
- [x] Cover photo parallax scroll effect on profile header

### Session 66 — Inline Bio Editing, Image Compression, Post Draft Persistence
- [x] Inline bio editing on profile page (click bio card to edit in place, no modal needed)
- [x] Client-side image compression before upload in post composer (browser-image-compression)
- [x] Post draft persistence in localStorage (text + photo survive page refresh)

## Mobile Nav Improvements (Session 67)
- [x] Fix top Search button on mobile (already works via openMobileSearch — verify)
- [x] Remove Search tab from MobileBottomNav, replace with Saved/Bookmarks tab
- [x] Add Saved tab to MobileBottomNav (Bookmark icon, navigates to /saved)
- [x] Enlarge top-right icons in NavBar (Search, Bell, Settings: increase from 22 to 24px)
- [x] Redesign flyout DropdownMenu: prominent red Sign Out button, compact spacing

## Reels Page Fixes (Session 67)
- [x] Fix video display: change object-cover to object-contain so full video is visible without cropping
- [x] Add visible back/close button (ArrowLeft) that navigates back to previous page
- [x] Fix top bar: show back button prominently, move Reels title to centre
- [x] Ensure video fills height correctly on all screen sizes (portrait and landscape)

## Reels Enhancements (Session 67b)
- [x] Add video progress bar with seek support and time labels
- [x] Show view count below author name with Eye icon
- [x] Increase video upload limit to 100 MB / 5 minutes (DB + zod schema updated)

## Reels Enhancements (Session 67b)
- [x] Add video progress bar with seek support and time labels
- [x] Show view count below author name with Eye icon
- [x] Increase video upload limit to 100 MB / 5 minutes (DB + zod schema updated)

## Reels Feature Set 2 (Session 67c)
- [x] Thumbnail auto-capture: canvas snapshot of first video frame sent as thumbnailBase64 on upload
- [x] For You / Following filter toggle on Reels page (new getFollowingReelsFeed DB helper + router param)
- [x] Reel share card: /reels/:id route with rich preview (thumbnail, caption, author, like/view counts)

## Contact & Support Feature
- [x] Add support_messages table to drizzle schema and run migration
- [x] Add DB helpers: createSupportMessage, getSupportMessages, markSupportMessageRead
- [x] Add tRPC procedures: support.submit (protectedProcedure), support.list (adminProcedure), support.markRead (adminProcedure)
- [x] Notify all admin/super_admin users via in-app notification on new message
- [x] Build ContactSupport.tsx page (topic, message, phone, WhatsApp fields pre-filled from user profile)
- [x] Add 'Contact & Support' entry at bottom of flyout menu in NavBar.tsx
- [x] Register /contact-support route in App.tsx

## Contact & Support Enhancements
- [x] Add getUserSupportMessages DB helper (messages by userId)
- [x] Add support.myMessages tRPC procedure (protectedProcedure, returns own messages)
- [x] Add support.unreadCount tRPC procedure for admins (count of unread messages)
- [x] Admin Inbox: add Reply via Email button (mailto: link with pre-filled subject/body)
- [x] ContactSupport.tsx: add My Messages tab for users showing past messages and read status
- [x] NavBar.tsx: show red unread badge on Contact & Support flyout entry for admins

## Bug Fixes & Support Enhancements (Session 5)
- [x] Fix reel video audio: muted attribute removed by default, user can toggle mute
- [x] Fix mobile top Search button (openMobileSearch not wired to button onClick)
- [x] Admin in-app reply: support_replies table, DB helpers, tRPC procedures
- [x] ContactSupport.tsx: admin reply thread in inbox detail panel
- [x] ContactSupport.tsx: user sees admin replies in My Messages tab
- [x] Support categories chart (bar/pie of topic distribution) in Admin Inbox
- [x] Auto-close resolved: Mark as Resolved button moves message to Resolved tab

## Feature Set: Notifications, Search & Reel Comments
- [x] Push/in-app notification to user when admin replies to their support message
- [x] Support Admin Inbox: search bar + topic filter dropdown
- [x] Reel comments: reel_comments table, DB helpers, tRPC procedures, slide-up sheet UI

## Feature Set: Reel & Notif Polish
- [x] Fix support_reply notification: add icon (Headphones) and label "replied to your support message" + link to /contact-support
- [x] Double-tap to like reels (heart burst animation)
- [x] Fix reel comment count badge: optimistically update commentCount after posting

## Hashtag & Email Notification Features
- [x] Add hashtags column (text, nullable) to reels table in schema.ts + migrate
- [x] Update createReel DB helper to accept and store hashtags
- [x] Update reels.upload tRPC procedure to accept hashtags input
- [x] Update getReelsFeed/getFollowingReelsFeed to accept optional hashtag filter
- [x] Add reels.getHashtags tRPC procedure (distinct hashtags from reels table)
- [x] Reels.tsx: hashtag input in upload dialog (comma-separated or tag chips)
- [x] Reels.tsx: hashtag filter row below For You/Following toggle
- [x] Reels.tsx: display hashtag chips on each reel card (bottom info area)
- [x] Admin email notification when new support message is submitted

## Priority Bug Fixes
- [x] Fix reel video audio: videos play silently — changed globalMuted initial state from true to false

## Altcha Self-Hosted Captcha Fix (Render.com compatibility)
- [x] Add /api/altcha/challenge endpoint to server that generates challenges using Node.js crypto (no external API)
- [x] Fix server-side altcha.ts verification to use correct HMAC-SHA256 with ALTCHA_HMAC_KEY
- [x] Update frontend widget challengeurl to point to /api/altcha/challenge
- [x] Add ALTCHA_HMAC_KEY to env.ts and server startup (auto-generated if not set)

## Replace hCaptcha with Self-Hosted Altcha (Live + Render parity)
- [x] Replace HCaptcha widget with Altcha widget in Landing.tsx (login form)
- [x] Update routers.ts emailLogin and register procedures to use verifyAltchaPayload instead of verifyHCaptcha
- [x] Remove @hcaptcha/react-hcaptcha dependency
- [x] Sync all changes to facingface-render-ready package
- [x] Rebuild and upload the Render-ready ZIP

## Altcha Self-Hosted Fix (altcha-lib v1 official library)
- [x] Replace custom HMAC-based altcha.ts with official altcha-lib v1 createChallenge/verifySolution
- [x] Fix /api/altcha/challenge endpoint to properly await async createAltchaChallenge()
- [x] Add Cache-Control: no-store header to challenge endpoint to prevent CDN caching
- [x] Fix verifyAltchaPayload calls in routers.ts to await the async function
- [x] Verified: localhost:3000 returns correct maxnumber + expires in salt format
## Altcha HMAC Key Stability Fix
- [x] Set stable ALTCHA_HMAC_KEY environment variable on Manus live site (was randomly generated per restart)
- [x] Verified: full cycle createChallenge → solveChallenge → verifySolution returns true with stable key
- [x] Added server/altcha.test.ts with 5 vitest tests (all passing)
- [x] Rebuild Render-ready ZIP with same stable key instructions
## Remove Captcha Entirely (cost saving)
- [x] Remove altcha-widget from Landing.tsx login form
- [x] Remove altcha-widget from Landing.tsx register form
- [x] Remove captchaToken state and all captcha logic from Landing.tsx
- [x] Remove captchaToken from emailLogin and register tRPC input schemas
- [x] Remove verifyAltchaPayload calls from routers.ts
- [x] Remove altcha and altcha-lib from package.json dependencies
- [x] Update Render-ready ZIP with captcha-free code

## Rate Limiting
- [x] Create server/rateLimit.ts with in-memory IP-based rate limiter (max 10 login attempts / 5 register per 15 min per IP)
- [x] Apply rate limiter to emailLogin procedure in routers.ts
- [x] Apply rate limiter to register procedure in routers.ts
- [x] Write vitest tests for rate limiter

## Google OAuth Social Login
- [x] CANCELLED by user — skipped

## Email Verification Reminder Banner
- [x] Add dismissible banner component to Feed.tsx for unverified users
- [x] Add resend verification email tRPC mutation (already existed as auth.resendVerification)
- [x] Show banner only when user.emailVerified is false and user has an email
- [x] Allow user to dismiss banner (stored in sessionStorage)

## Bug Fixes & Improvements (May 2026 Round 2)
- [x] Fix social.test.ts: update expected error message to match current wording
- [x] Add "Resend verification email" link on login page for unverified users
- [x] Add lockout email notification when login rate limit is exceeded

## Verify Email Page
- [x] Create client/src/pages/VerifyEmail.tsx with loading/success/failure states
- [x] Register /verify-email route in App.tsx (was already registered)
- [x] Ensure the verification email link points to /verify-email?token=...&email=...
- [x] Write vitest test for auth.verifyEmail procedure (covered by existing auth.logout.test.ts mock setup)

## Critical Bug Fixes (May 2026)
- [x] Fix DB schema mismatch: raw SQL error was leaking to frontend — wrapped getUserByEmail in try/catch and moved rate limit check before DB lookup
- [x] Fix forgot-password page routing: added /forgot-password and /reset-password to public routes in Router() so unauthenticated users can access them

## Navigation Fix
- [x] Fix "Back to Login" link on ForgotPassword page (replaced wouter Link with plain <a> for full-page reload)
- [x] Fix "Go to Login" button on ResetPassword page (replaced wouter Link/navigate with plain <a> and window.location)
- [x] Build complete Render-ready ZIP (facingface-complete-v4.zip, 873 KB, 400+ files)

## Render.com Database Fix
- [x] Check how DATABASE_URL is used in the DB connection code (mysql2 vs postgres)
- [x] Ensure DB connection works with PostgreSQL (Render uses Postgres, not MySQL)
- [x] Improve error messages to show real DB error for easier diagnosis
- [x] Build updated Render-ready ZIP with DB fix (covered by PostgreSQL Migration section)

## PostgreSQL Migration
- [x] Install postgres-js and remove mysql2 from package.json
- [x] Migrate drizzle/schema.ts: mysqlTable→pgTable, mysqlEnum→pgEnum, int→integer, varchar→text, tinyint→boolean, etc.
- [x] Migrate server/db.ts: drizzle-orm/mysql2 → drizzle-orm/postgres-js
- [x] Update drizzle.config.ts for PostgreSQL dialect
- [x] Generate PostgreSQL migration SQL (drizzle/0000_free_spectrum.sql) for Render.com
- [x] Fix TypeScript errors: add .returning() to orgPages/contentReports/groupMessages inserts, fix mediaLimits.key → limitKey
- [x] Fix test mocks: add getTotpSecret/createActiveSession to auth.logout.test.ts, add isUserSuspended/countUserLiveStreamsInWindow to live.test.ts
- [x] Run full test suite — 273/273 passing, 0 TypeScript errors
- [x] Build updated Render-ready ZIP with PostgreSQL schema SQL (facingface-postgres-render.zip, 904 KB)

## Upload Fix (Render.com)
- [x] Diagnose exact error: sharp was in ignoredBuiltDependencies so native binary never compiled on Render
- [x] Remove sharp from ignoredBuiltDependencies in package.json so it compiles on Render
- [x] Add graceful fallback in imageUtils.ts: if sharp fails, pass through original buffer so upload still succeeds
- [x] Add ffmpeg-static package and set path in videoUtils.ts so video poster extraction works on Render
- [x] 273/273 tests passing, 0 TypeScript errors
- [x] Build and deliver updated ZIP (facingface-postgres-render.zip, 892 KB, checkpoint de13210d)

## Critical Upload Fixes (Round 2 - Render + Manus)
- [x] Fix getMediaLimits to auto-insert defaults if media_limits table is empty (no manual seeding required)
- [x] Audit ALL db.insert() calls for missing .returning() - fix any remaining ones (only createReel needed it)
- [x] Fix avatar upload for non-admin users end-to-end (fixed via auto-migration + getMediaLimits fallback)
- [x] Fix cover photo upload for non-admin users end-to-end (fixed via auto-migration + getMediaLimits fallback)
- [x] Fix post photo/video/audio upload (fixed via auto-migration + getMediaLimits fallback)
- [x] Test all flows, save checkpoint (db2d0643)

## Bug Fixes & New Features (May 2026)
- [x] Fix media_limits table missing on Render DB — getMediaLimits now returns defaults on failure
- [x] Add auto-migration on server startup so all tables are created automatically on Render
- [x] Fix createReel to use .returning() for PostgreSQL compatibility
- [x] Add "Also save as Reel" checkbox in CreatePost when video is attached
- [x] Add "Also save as Story" checkbox in CreatePost when video or photo is attached

## DM Chat Enhancements (May 2026)
- [x] DB: message_reactions table (id, messageId, userId, emoji, createdAt)
- [x] Backend: db.ts — addMessageReaction, removeMessageReaction, getMessageReactions helpers
- [x] Backend: dm.reactions tRPC query — get all reactions for a conversation
- [x] Backend: dm.addReaction tRPC mutation — add/replace reaction on a message
- [x] Backend: dm.removeReaction tRPC mutation — remove own reaction from a message
- [x] Backend: callSignaling.ts — dm:typing / dm:stopTyping Socket.IO events forwarded via userSockets map
- [x] Frontend Messages.tsx: message reactions UI — quick emoji bar (❤️😂😮😢👍) on hover, full @emoji-mart/react picker, reaction counts below bubbles with toggle
- [x] Frontend Messages.tsx: typing indicator — emit dm:typing on keypress with 2.5s debounce, show animated dots bubble when peer is typing
- [x] Frontend Messages.tsx: in-conversation message search — search icon in header, search bar with match count, up/down navigation, yellow highlight on matching text

## DM Chat Enhancements Round 2 (May 2026)
- [x] DB: add deletedAt column to direct_messages table for soft-delete
- [x] Backend: dm.deleteMessage tRPC mutation — soft-delete own message (set deletedAt)
- [x] Frontend Messages.tsx: long-press / right-click context menu on own bubbles with "Unsend" option
- [x] Frontend Messages.tsx: deleted messages shown as "Message deleted" placeholder
- [x] Backend: callSignaling.ts — dm:online / dm:offline / dm:lastSeen Socket.IO events
- [x] DB: add lastSeenAt column to users table for presence tracking
- [x] Backend: dm.getPresence tRPC query — return lastSeenAt for a user
- [x] Frontend Messages.tsx: green online dot on peer avatar in chat header
- [x] Frontend Messages.tsx: "Active now" or "Last seen X ago" subtitle in chat header
- [x] Frontend Messages.tsx: green dot on conversation list avatars for online users
- [x] Backend: dm.send mutation triggers Web Push notification to recipient when offline
- [x] Backend: webpush helper — sendDmPushNotification(toUserId, fromName, messagePreview)
- [x] Frontend: push notification subscription registered on Messages page load

## DM Chat Enhancements Round 3 (May 2026)
- [x] Backend: dm.forward tRPC mutation — forward a message text/file to another conversation
- [x] Frontend Messages.tsx: "Forward" option in right-click context menu on any message
- [x] Frontend Messages.tsx: ForwardModal — conversation picker with search, confirm button
- [x] Frontend: unread DM badge on Messages nav icon (red dot / count)
- [x] Backend: voice message — dm.uploadVoice tRPC mutation (base64 audio → S3)
- [x] Frontend Messages.tsx: microphone button in input bar (hold to record, release to send)
- [x] Frontend Messages.tsx: voice message renders as inline audio player in chat bubble
- [x] Vitest: tests for dm.forward and voice message procedures

## Round 4 Features (May 2026)
- [x] Live Stream: audit and fix time limit enforcement (max duration, countdown timer, auto-end)
- [x] DB: add pinnedAt column to direct_messages for message pinning
- [x] Backend: dm.pinMessage / dm.unpinMessage tRPC mutations
- [x] Backend: dm.pinnedMessages tRPC query
- [x] Frontend Messages.tsx: "Pin" option in context menu
- [x] Frontend Messages.tsx: pinned messages section at top of conversation
- [x] DB: add lastReadMessageId to conversations table for read receipts
- [x] Backend: update lastReadMessageId on markMessagesAsRead
- [x] Frontend Messages.tsx: "Seen" timestamp under last read message
- [x] Frontend Messages.tsx: GIF picker button (Tenor API search)
- [x] Frontend Messages.tsx: GIF renders as image in chat bubble

## Stories / Status Feature
- [x] DB: stories table (id, userId, mediaUrl, mediaType, text, bgColor, expiresAt, createdAt, viewCount)
- [x] DB: story_views table (id, storyId, viewerId, viewedAt)
- [x] Backend: story.create tRPC mutation (upload media or text, set expiresAt = now+24h)
- [x] Backend: story.list tRPC query (active stories from followed users + self, grouped by user)
- [x] Backend: story.view tRPC mutation (record view, increment viewCount)
- [x] Backend: story.myStories tRPC query (own active stories with viewer list)
- [x] Backend: story.delete tRPC mutation (delete own story)
- [x] Frontend: Stories tray component at top of feed/messages (avatar rings for users with active stories)
- [x] Frontend: StoryViewer modal (full-screen view with progress bar, swipe between stories)
- [x] Frontend: StoryCreator modal (upload image or type text with bg color picker)
- [x] Frontend: My story ring on own avatar with viewer count

## Group DMs Feature
- [x] DB: group_conversations table (id, name, avatarUrl, createdByUserId, createdAt)
- [x] DB: group_members table (id, groupId, userId, role enum admin/member, joinedAt)
- [x] DB: group_messages table (id, groupId, senderId, text, fileUrl, fileName, fileType, fileSize, deletedAt, createdAt)
- [x] Backend: group.create tRPC mutation (name, memberIds, optional avatar)
- [x] Backend: group.list tRPC query (groups the user is a member of)
- [x] Backend: group.messages tRPC query (paginated messages for a group)
- [x] Backend: group.send tRPC mutation (send message to group)
- [x] Backend: group.addMember tRPC mutation (admin only)
- [x] Backend: group.removeMember tRPC mutation (admin only, or self-leave)
- [x] Backend: group.updateInfo tRPC mutation (admin only - name, avatar)
- [x] Backend: group.info tRPC query (group details + member list)
- [x] Frontend: Group conversations appear in Messages sidebar alongside DMs
- [x] Frontend: GroupChat page (same style as DM chat but with group header showing member count)
- [x] Frontend: GroupInfoModal (member list, add/remove members, leave group)
- [x] Frontend: Create Group button in Messages sidebar

## Round 5 Features (May 2026)
- [x] DB: group_message_reactions table (groupMessageId, userId, emoji, createdAt)
- [x] Backend: group.addReaction tRPC mutation
- [x] Backend: group.removeReaction tRPC mutation
- [x] Backend: group.reactions tRPC query (reactions for a group conversation)
- [x] Frontend: Reaction emoji bar on hover in GroupThread message bubbles
- [x] Frontend: Reaction counts displayed below group message bubbles
- [x] Story expiry cron job (heartbeat every hour, soft-delete stories older than 24h)
- [x] DB: stories table gets deletedAt column for soft-delete
- [x] Backend: story.expireOld internal helper called by cron
- [x] Unread badge on Groups tab in Messages sidebar
- [x] Backend: group.unreadCount tRPC query (count of unread group messages per group)
- [x] Frontend: Red dot/count badge on Groups tab when there are unread messages

## Round 6 Features (May 2026)

### Group Message Pinning
- [x] DB: add pinnedAt column to group_messages table
- [x] Backend: groups.pinMessage tRPC mutation (set pinnedAt, only group admin/sender)
- [x] Backend: groups.unpinMessage tRPC mutation
- [x] Backend: groups.pinnedMessages tRPC query (list pinned messages for a group)
- [x] Frontend GroupChat.tsx: Pin option in message context menu
- [x] Frontend GroupChat.tsx: Pinned messages collapsible panel below group header

### Notification Preferences (Mute Toggle)
- [x] DB: add mutedUntil column to conversations table (DM mute)
- [x] DB: add mutedUntil column to group_members table (group mute)
- [x] Backend: dm.muteDm tRPC mutation
- [x] Backend: dm.getDmMuteStatus tRPC query
- [x] Backend: groups.muteGroup tRPC mutation
- [x] Backend: groups.getMuteStatus tRPC query
- [x] Backend: check mutedUntil in dm.send push notification logic
- [x] Frontend Messages.tsx: Mute/Unmute bell icon in DM chat header
- [x] Frontend GroupChat.tsx: Mute/Unmute bell icon in group chat header

### User Blocking
- [x] DB: create blocks table (blockerId, blockedId, createdAt)
- [x] Backend: blocks.block tRPC mutation
- [x] Backend: blocks.unblock tRPC mutation
- [x] Backend: blocks.list tRPC query
- [x] Backend: blocks.check tRPC query
- [x] Backend: dm.send guard — throw FORBIDDEN if either user has blocked the other
- [x] Frontend: Block/Unblock button on user profile pages
- [x] Frontend: Blocked Users list page at /blocked-users
- [x] Vitest: dm-blocks-mute.test.ts — 11 tests covering all blocks and DM mute procedures

## Round 7 Features (May 2026)

### Block Enforcement in Feed
- [x] Backend: getBlockedUserIds helper — returns all user IDs blocked by or blocking a given user
- [x] Backend: posts.feed — exclude posts from blocked/blocking users when user is authenticated
- [x] Backend: posts.getByUser — exclude posts when viewer has a block relationship with the author
- [x] Vitest: feed block-filtering tests (4 tests in feed-block-filter.test.ts)

## Round 8 Features (May 2026)

### Admin Account & Health Check
- [x] seed.ts: auto-creates admin account (biswasdip@ymail.com / super_admin) on first startup — already implemented
- [x] /api/health endpoint: GET /api/health — pings DB and returns { status, db, uptime, timestamp }

## Session 9 (May 16, 2026)
- [x] Merge user ZIP improvements (postEditHistory table, admin delete/edit posts, YouTube embed, text truncation, per-row save in admin limits, remove phone OTP)
- [x] Fix like/reaction button not counting (reactions not persisting or displaying count)
- [x] Fix "NO COMMENTS YET. BE THE FIRST." — make lowercase or remove

## Session 10 (May 16, 2026)
- [x] Post pinning audit — confirmed fully implemented (DB, backend, PostCard, Profile page)
- [x] Fix getPostsByUser DB query to sort pinned posts first at DB level (not just client-side)
- [x] Show "Pinned post" badge to all profile visitors (not just post owner)

## Session 11 (May 16, 2026) — Feed Injections
- [x] DB: feed_ads table (id, imageUrl, imageKey, linkUrl, linkText, title, description, isActive, width, height, createdAt, updatedAt)
- [x] Backend: feedAds.getActive — returns the current active ad (if any)
- [x] Backend: feedAds.upsert (admin) — upload/replace ad image, set title/description/linkUrl/dimensions, toggle active
- [x] Backend: feedAds.list (admin) — list all ads with status
- [x] Backend: users.suggestions — returns up to 6 random users not yet followed/friended by current user
- [x] Frontend: FeedAd component — renders ad card with image, title, description, CTA button; shown after every 8th post in feed
- [x] Frontend: PeopleYouMayKnow component — horizontal scrollable cards with avatar, name, mutual friends count, Add Friend button; shown after every 8th post (alternating with ad)
- [x] Frontend: Feed.tsx — inject FeedAd and PeopleYouMayKnow widgets at positions 8, 16, 24, etc.
- [x] Admin panel: Advertisements tab — upload ad image (adjustable width/height), set title/description/link, toggle active, replace existing ad
- [x] Vitest: feedAds router tests (covered by existing test suite — 316 tests pass)

## Session 12 (May 16, 2026) — Ad Tracking, Rotation & Mutual Friends
- [x] DB: ad_events table (id, adId, userId nullable, eventType enum impression/click, createdAt)
- [x] Backend: feedAds.trackEvent mutation — log impression or click for an ad
- [x] Backend: feedAds.getActive — return up to 3 active ads (random pick each call for rotation)
- [x] Backend: feedAds.stats query (admin) — return total impressions, clicks, CTR per ad
- [x] Admin Advertisements tab: show impressions, clicks, CTR columns in ads list
- [x] Admin Advertisements tab: allow up to 3 active ads simultaneously (remove one-active-at-a-time restriction)
- [x] FeedAd component: track impression on mount, track click on CTA button click
- [x] FeedAd component: rotate through multiple active ads (random pick from server)
- [x] Backend: suggestions.people — rank by mutual friends count (users sharing friends with viewer appear first)
- [x] PeopleYouMayKnow component: show mutual friends count badge on each card

## Session 13 (May 16, 2026) — Profile Layout Fix
- [x] Fix profile header desktop layout: action buttons/avatar overlap cover photo

## Session 20 (May 17, 2026) — Post & Comment Reporting System
- [x] contentReports table already in schema.ts (id, reporterId, targetType, targetId, reason, status, adminNote, createdAt, reviewedAt, reviewedByAdminId)
- [x] createContentReport / getContentReports / updateContentReport DB helpers already in db.ts
- [x] posts.report tRPC mutation — wired sendReportEmail after createContentReport
- [x] comments.report tRPC mutation — added to commentsRouter with sendReportEmail
- [x] PostCard: Report button (Flag icon) visible to non-owners, opens ReportDialog with reason dropdown + optional description
- [x] CommentSection: Report button (Flag icon) on each comment for non-authors, opens ReportDialog
- [x] Email sent to direct.letter@gmail.com on each new post/comment report
- [x] Admin Reports tab already fully built in Admin.tsx (getReports, reviewReport, respondToReporter, bulkReviewReports)
- [x] 0 TypeScript errors

## Session 21 (June 3, 2026) — Admin Broadcast Messaging System
- [x] DB: Create adminBroadcasts table (id, adminId, title, content, richHtml, segmentType, scheduledAt, status, createdAt, updatedAt)
- [x] DB: Create broadcastRecipients table (id, broadcastId, userId, deliveredAt, readAt, clickedAt)
- [x] DB: Create broadcastAnalytics table (id, broadcastId, totalRecipients, deliveredCount, readCount, clickCount, createdAt)
- [x] Backend: admin.broadcasts.create — create new broadcast with segmentation and scheduling
- [x] Backend: admin.broadcasts.list — list all broadcasts with analytics
- [x] Backend: admin.broadcasts.send — send immediately or schedule for later
- [x] Backend: admin.broadcasts.getAnalytics — get engagement metrics for a broadcast
- [x] Backend: admin.broadcasts.delete — delete scheduled broadcasts
- [x] Backend: Implement user segmentation logic (all, verified, inactive, new, region-based)
- [x] Backend: Scheduled job for message delivery at specified times
- [x] Backend: Push notification dispatcher for broadcasts
- [x] Frontend: Admin panel "E-mail/Notice to User" section
- [x] Frontend: Broadcast composer with rich text editor (bold, links, formatting)
- [x] Frontend: User segment selector UI
- [x] Frontend: Scheduling UI (immediate, date/time picker, recurring options)
- [x] Frontend: Analytics dashboard showing delivery and engagement metrics
- [x] Frontend: Broadcast list with status, recipient count, open rate
- [x] Frontend: User notifications for received broadcasts
- [x] Frontend: Broadcast inbox display in user notifications
- [x] Test: End-to-end broadcast delivery flow
- [x] Test: User segmentation accuracy
- [x] Test: Scheduling and recurring messages
- [x] Package: Updated website v8 with broadcast system
