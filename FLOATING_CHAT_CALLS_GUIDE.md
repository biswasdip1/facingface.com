# Floating Chat Voice and Video Calls

## What is new

Each open individual floating chat now has two compact buttons in its header:

| Button | Action |
| --- | --- |
| Phone | Starts a voice call. |
| Video camera | Starts a video call. |

The buttons use FacingFace’s existing one-to-one call screen. The other participant receives the existing incoming-call controls and can accept or decline. Calls remain available through the full Calls and Messages pages as before.

## Privacy and permissions

The call buttons use the existing direct participant and call-signaling flow. The browser will ask for microphone permission for a voice call and microphone plus camera permission for a video call. FacingFace does not enable either device without the member’s browser permission.

## Simple verification

Use two signed-in accounts on separate browsers or devices. Open a floating chat from a friend’s Profile, select the phone button, and accept the incoming call on the second account. Repeat with the video-camera button and permit the camera when asked. End each call and confirm it continues to appear in the existing call history.

No Render environment, database reset, persistent disk, Start Command, or email configuration needs to change.
