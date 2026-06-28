# FacingFace Messenger Encryption Update

**Author:** Manus AI  
**Package:** `facingface-17-May-2026-4th-with-chat-preferences-encrypted.zip`  
**Date:** 2026-05-18

## Summary

This package adds practical **server-side encryption at rest** for FacingFace Messenger text chats. New direct-message text and group text-message content are encrypted before being saved in PostgreSQL, then decrypted by the server before being returned to authenticated users through the existing APIs. The update keeps the current website, `www.facingface.com`, and Messenger subdomain, `chat.facingface.com`, in the same codebase and deployment model.

This implementation is intentionally backward-compatible. Existing plaintext messages remain readable, while new messages are stored with the encrypted `ffenc:v1:` payload format. No database migration is required because the encrypted payload fits into the existing `text` and `content` text columns.

## What Was Added

| Area | Update |
|---|---|
| Direct messages | New direct-message `text` values are encrypted before insert and decrypted when read. |
| Direct-message previews | Conversation last-message previews decrypt encrypted text before display. |
| Group messages | New group text-message `content` values are encrypted before insert and decrypted when read. |
| Pinned messages | Pinned direct and group message reads decrypt encrypted text before display. |
| Forwarding | Forwarded direct messages decrypt the source, then re-encrypt the new copied message. |
| Compatibility | Existing unencrypted messages continue to display normally. |
| Database migrations | No schema migration is required. |

## Encryption Key

For best security, add this environment variable in Render under your existing FacingFace web service:

```text
CHAT_ENCRYPTION_KEY=use-a-long-random-secret-at-least-32-characters
```

If `CHAT_ENCRYPTION_KEY` is not set, the app falls back to `JWT_SECRET` or `SESSION_SECRET` if available. The recommended production setup is to set a dedicated `CHAT_ENCRYPTION_KEY` and keep it permanently. If this key is changed later, previously encrypted messages cannot be decrypted with the new key.

## Important Scope Note

This update provides **encryption at rest** for stored chat text in PostgreSQL. It is not full end-to-end encryption. With this approach, the database does not store readable new chat text, but the server can still decrypt messages for authenticated users. Full end-to-end encryption would require a larger client-side key-management system, account/device recovery design, and changes to how search, previews, moderation, and multi-device access work.

## Validation

The merged package was validated successfully with:

```text
pnpm check
pnpm build
```

Both commands passed. The production build only reported the existing non-blocking analytics placeholder warnings and large bundle-size warnings.

## Deployment

Use the attached ZIP in GitHub Desktop as before. Commit and push it to the same FacingFace repository, then let Render redeploy the same service for both domains:

| Domain | Behavior |
|---|---|
| `www.facingface.com` | Normal FacingFace website |
| `chat.facingface.com` | Dedicated Messenger interface with Preferences and encrypted new chat text |
