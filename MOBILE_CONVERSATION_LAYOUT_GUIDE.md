# Mobile Conversation Layout Improvement

## What changed

The individual direct-message screen is now more comfortable on mobile phones.

| Area | New behaviour |
| --- | --- |
| Voice and Video Call | The two call buttons remain visible in the conversation header. Less important header actions move out of the small-screen view. |
| Camera | A new Camera button in the message tools opens the phone camera to take and send a photo. It uses the same secure image-message upload path and 3 MB limit as existing image messages. |
| Bottom navigation | Home, Friends, Messages, Saved, Calls, and Reels are hidden only while an individual direct conversation is open. They return when using the back arrow to return to the Messages list. |
| Screen space | The unnecessary mobile bottom spacing is removed while the chat is open, giving messages and the composer more usable space. |

## Verification

1. On a phone, open **Messages** and choose a direct conversation.
2. Confirm the bottom Home/Friends/Messages navigation hides and the phone/video buttons stay visible at the top.
3. Select the Camera icon beside the message box, take or choose a photo, and send it.
4. Use the back arrow in the conversation header. Confirm the Messages list and normal bottom navigation return.
5. On desktop, confirm the full Messages page and floating chat system continue to work normally.

No Render settings, database reset, persistent disk, Start Command, or email configuration needs changing.
