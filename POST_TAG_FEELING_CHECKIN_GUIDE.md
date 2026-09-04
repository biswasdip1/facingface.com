# Tag, Feeling, and Check-in Guide

## New Post Options

Ordinary wall posts now include a Facebook-style **Add to your post** area with three choices: **Tag**, **Feeling**, and **Check in**. These options are available only for normal personal wall posts. Existing Page and Public Group creation flows are unchanged.

| Option | How it works | Privacy rule |
| --- | --- | --- |
| Tag | Select up to 10 accepted friends. | The server verifies every selected person is an accepted friend before publishing. |
| Feeling | Select a preset feeling or activity, such as Happy, Excited, Celebrating, Watching, or Travelling. | Only controlled preset values are stored and displayed. |
| Check in | Enter a town, venue, or place name. | This is a manual text place name only; FacingFace does not collect or share live device location. |

## Quick Check

1. Open the normal Home post composer and select **Add to your post**.
2. Choose **Tag** and select one or more accepted friends.
3. Choose **Feeling** and select an option.
4. Choose **Check in** and enter a place name.
5. Publish the post. The Feed should show the selected friends, feeling or activity, and check-in location above the post text.

> Tags, feelings, and check-ins follow the existing audience setting. A Private post remains visible only to its author and accepted friends.

## Render Settings

No Render configuration changes are required. Keep the existing Start Command, PostgreSQL database, persistent media disk, email settings, and `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false` unchanged. On deployment, FacingFace safely adds only the three missing post metadata columns when needed; it does not reset existing data or run the historical global migration journal.
