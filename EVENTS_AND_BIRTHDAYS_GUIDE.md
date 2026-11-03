# Events and Birthdays

## Events

FacingFace now includes standard private Events. A member can create an event, set its name, details, location, start time, and optional end time, then select accepted friends to invite.

| Feature | Behaviour |
| --- | --- |
| Event visibility | An event is visible only to its host and accepted-friend invitees. It is not placed in the public Feed. |
| Invitations | Only accepted friends can be invited. The recipient sees the invitation on **Events**. |
| RSVP | Invited friends can select **Going**, **Maybe**, or **Can't go**. |
| Host controls | The host can invite more accepted friends or cancel the event. |
| Attendance | Events show response totals, not a public guest list. |

## Birthdays

Birthdays are privacy-preserving by design. FacingFace uses only **birth day** and **birth month**. It does not ask for, store, or show a year of birth in the profile form or Birthday reminders.

The Birthday page lists only accepted friends who chose to add their birthday day and month. It shows people celebrating today and upcoming birthdays in order.

## Quick Check

1. Open **Events** from the More menu and select **Create event**.
2. Invite one accepted friend, then use that friend’s account to open Events and choose an RSVP.
3. Open your profile, choose **Edit details**, and enter only a birthday day and month. There is no birth-year field.
4. On an accepted friend’s account, open **Birthdays** to see the day-and-month reminder.

## Render Settings

No Render setting changes are required. Keep the existing Start Command, PostgreSQL database, persistent disk, media configuration, Gmail/SMTP values, and migration setting exactly as they are. The required Event tables are created safely at application startup without enabling the historical global migration process.
