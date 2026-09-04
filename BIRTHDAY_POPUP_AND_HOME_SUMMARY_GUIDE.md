# Birthday Popup and Home Summary Update

## Birthday Save Repair

The profile save issue is repaired. The cause was an empty name being sent by the profile-completion route together with the birthday update. Birthday-only updates now preserve the existing saved name instead of sending an invalid empty value.

The profile editor now includes an **Add** or **Change** birthday button. It opens a simple popup with two choices only: **day** and **month**. There is no year field.

After choosing a valid day and month and selecting **Save birthday**, the value appears immediately in the profile Biodata as, for example, `12 Nov`.

| Privacy rule | Result |
| --- | --- |
| Birth year | Not requested, stored, or displayed. |
| Birthday form | Popup with day and month only. |
| Biodata display | Day and month only. |
| Birthday reminders | Visible only for accepted friends. |

## Home Page Summary

Open **More >>** on the left side of the Home page. Under **Birthdays** and **Events**, FacingFace now shows:

| List | Maximum shown | Access rule |
| --- | ---: | --- |
| Upcoming Events | 5 | Events created by the member or events they were invited to. |
| Birthdays | 5 | Accepted friends’ day-and-month birthdays. |

Each list has an **All** link to open the full Events or Birthdays page.

## Quick Check

1. Open your profile and select **Edit Profile**.
2. In the Birthday row, select **Add** and choose a day and month in the popup.
3. Select **Save birthday**. Confirm that the day and month appear in Biodata.
4. On the Home page, open **More >>** in the left sidebar. Confirm that the Events and Birthdays previews appear below their links.

## Render Settings

No Render settings need changing. Keep the existing Start Command, PostgreSQL database, persistent disk, media configuration, email settings, and migration setting unchanged.
