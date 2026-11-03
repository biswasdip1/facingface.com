# FacingFace Post Submission Lock

## What changed

The normal post composer now locks immediately when a member presses **Post**. The button stays disabled from the first click through all media uploads, optional accessibility processing, post creation, Feed refresh, and modal closing.

The button shows **Uploading…** while a photo, video, document, or audio file is being sent. Once the media step completes, it changes to **Posting…** and remains disabled until the wall post has been created successfully or an error is returned.

## Why this matters

There is no longer a brief active-button moment between media upload and post creation. Fast repeated clicks, pressing Enter quickly, and duplicate form submissions are also blocked by an in-memory submission guard.

## Simple verification

Create a normal post with one or more photos. Press **Post** once. Confirm that the button immediately locks, shows **Uploading…**, then **Posting…**, and the composer closes after the post appears on the Feed. Do not press Post again; it will remain disabled until completion.

## Deployment

Use the normal GitHub-to-Render deployment process. No Render environment values, persistent disk settings, database settings, email settings, or Start Command changes are required.

## Validation

The production build passed after this change. The prior repository-wide social media test file has an unrelated video-frame fixture that can stall in this sandbox; no server, storage, privacy, or post schema was changed by this UI-only repair.
