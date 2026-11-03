# FacingFace — Add people to a call

This is the complete cumulative website source, ready for your existing GitHub-to-Render deployment. It contains the Add people improvement and retains all earlier features and repairs. No extra containing folder is included: package.json, client, server and the other project files are directly at the ZIP root.

## Deploy

1. Download and extract the newest ZIP.
2. Update your existing GitHub repository with the extracted website files, then commit and push as usual.
3. Wait for the existing Render service to finish deploying.

Keep your existing database, persistent media disk, domain, Gmail/SMTP settings, environment variables and Cloudflare TURN credentials. Do not reset the database or turn on startup migrations. Keep the Render Start Command as:

```text
node dist/_core/index.js
```

No new database migration, hosting service or API provider is required for this improvement. Normal build dependencies are installed by your existing Render build; node_modules and compiled dist are intentionally not included in the source ZIP.

## Use Add people

During a connected Messenger voice or video call, click the new Add button. Search your accepted friends, select one or two, and choose Send invitations. The maximum is four people total: you, your current call partner and up to two invited friends.

Invitations are sent to your current partner and the selected friends. Choose Open group call, then Join call. Each person decides whether to join. Moving from the direct call to the group view reconnects the media; it is not a seamless in-place conversion. Nobody's camera or microphone starts just because an invitation arrives.

Cancel or a failed invitation does not end the existing direct call. If your current partner opens the group first, your own group-call prompt remains available so you can follow them.

A new private chat group is created for the call. Existing direct chat history is not copied or shared. Invitations are saved in direct messages so selected friends can find the call link. An unused waiting room allows five minutes for someone to join; this is an invitation response window, not a five-minute limit on the connected group call. Group membership and block checks still apply when opening or joining a call.

The same existing server-side TURN configuration is used. Keep your working Cloudflare settings in Render. Real-world connection quality still depends on devices, camera/microphone permission and network conditions; sandbox tests do not prove every network will work.

## Validation

The final production build passed. The regression suite passed 658 tests across 24 suites; a final focused rerun passed 94 invitation/component tests. Twenty real disposable PostgreSQL tests passed, including separate waiting-room and active-heartbeat expiry. Real browser tests passed for an active two-person video call, cancellation without media loss, invitation failure without ending the call, targeted invitation delivery, explicit joining into three-person video, original-partner-first joining order and clean Leave behaviour.

The project's existing whole-project TypeScript diagnostics remain; the scoped changes introduced no additional diagnostic identities in the comparison check. Every file from the previous complete website release is retained, and secrets, dependencies, build output and test-only runtime tools are excluded.
