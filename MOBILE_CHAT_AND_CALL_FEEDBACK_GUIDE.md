# Mobile Chat and Call Feedback Repair

## What changed

An open individual conversation is now a dedicated full-screen mobile panel below the main FacingFace header. The conversation header stays visible at the top with the member name plus **Voice Call** and **Video Call** controls. The message list scrolls independently below it, and the composer stays at the bottom.

The normal mobile bottom navigation is still hidden only while a direct conversation is open, but the chat panel now fills that recovered space instead of leaving a blank area.

## Call feedback

Outgoing voice and video calls now provide an audible repeating ringtone while waiting for the other member to answer. The call screen clearly states **“Ringing… Waiting for [name] to answer.”** Incoming calls show **“Incoming Voice/Video Call · Ringing.”** The ringtone stops automatically when the call is answered, declined, ended, or fails.

> Some mobile browsers can block unsolicited sound until the user has interacted with the webpage. Calls started by the member should be allowed to ring, and the visible ringing status remains available in every browser.

## Camera

The mobile message composer retains the new Camera shortcut. It opens the phone camera and sends the chosen photo through the existing secure image-message upload path.

## Verification

1. On a phone, select a direct conversation.
2. Confirm the chat fills the area below the FacingFace header, with no blank space or bottom navigation.
3. Confirm the Voice and Video buttons remain visible at the top while scrolling messages.
4. Start a call and confirm the ringing status and tone; accept, decline, or hang up and confirm the ringing stops.
5. Return with the chat back arrow and confirm the Messages list and mobile bottom navigation return.

No Render settings, database reset, persistent disk, Start Command, or email configuration needs changing.
