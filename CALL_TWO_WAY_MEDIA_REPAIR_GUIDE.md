# Two-Way Voice and Video Call Repair

## What was repaired

FacingFace call screens could show a running timer even though early WebRTC connection candidates were missed before the receiving call screen had finished opening. When that happens, the call interface can look connected while the microphone and camera media path is incomplete.

This release keeps incoming ICE candidates safely until the call screen is ready, then applies them after the remote call description is in place. It also uses a dedicated remote audio player so microphone sound does not depend on the video panel being visible. Remote audio and video streams are retained if they arrive before the connected call interface renders, then attached and played when the interface is ready.

The repair is applied to the main Messages call screen, the floating desktop chat call screen, the dedicated Messenger interface, and the full Calls page.

## Test with two accounts

Use two accepted-friend accounts on separate devices or browsers.

| Test | Expected result |
| --- | --- |
| Voice call | Both people permit microphone access, hear the ringtone, accept the call, and can speak and hear each other. |
| Video call | Both people permit camera and microphone access, see their own preview and the other person’s camera, and can hear each other. |
| Microphone button | Muting silences that person’s outgoing microphone; unmuting restores it. |
| Call ending | The timer stops and the call screen closes for both people. |

## Important browser checks

Use the latest Chrome, Safari, or Edge and confirm that the browser has permission for **Microphone** for a voice call, and **Camera + Microphone** for a video call. If phone sound is muted or routed to Bluetooth headphones, calls can appear connected but be inaudible through the phone speaker.

> A TURN relay is sometimes required by mobile carriers, corporate Wi-Fi, or restrictive networks. This release corrects the application’s lost-candidate and audio/video playback problems. If a two-device test still has no media on a particular network after this deployment, the next step is adding TURN relay credentials for full cross-network reachability; that would need one small, separate environment configuration.

No database changes, reset, persistent-disk change, email configuration change, or Start Command change is included or required for this repair.
