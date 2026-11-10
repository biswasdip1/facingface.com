# Location and people suggestions — checked 10 November 2026

The checked source does not implement GPS tracking or nearby-people matching. Profile hometown/current location are manually entered strings (100 characters maximum). The current profile serializer includes those strings and displays them to profile visitors. Entering a city is not consent to live location discovery. Check-ins are typed place labels tied to the post audience, not a stream of GPS coordinates.

People You May Know currently uses mutual accepted friends, with randomized ties (`server/db.ts`, suggestions helper around lines 6089–6145). It does not compare cities or geographic distances. The inspected iOS/Android wrapper does not implement location APIs/permissions and its existing configuration declares camera/microphone/photo uses, not foreground location.

No location was requested, obtained, stored or exposed by this menu update. No new database columns, permissions, store declarations or native binaries were changed.

## Proposed separate feature, not implemented in this ZIP

A conservative first step is an explicit **People in my area** opt-in using a user-selected city/area, rather than precise GPS. Default off; separate from the existing public profile location. Both people must opt in. Users choose the audience and can pause/remove the setting at any time. Enforce existing block/account/deletion controls, and avoid suggesting deleted/suspended users. Never auto-post a location or represent a manually entered city as proof of physical proximity.

If distance-based discovery is later chosen, request device permission only after explaining and accepting that feature. Use foreground, coarse, short-lived area information; do not expose raw coordinates, exact distances, travel history or a continuously updated person map. Apply query-rate limits and safeguards against singling out/trilateration. With minors in the declared audience, additional age/safety design is required; do not casually enable precise discovery for teen accounts.

Adding device location requires a separate implementation/test/release review, updated privacy and Play Data safety declarations, and likely native permission configuration/new signed builds. Publishing currentCity strings alone does not give permission to switch those users into a new discovery service. Confirm the intended audience, precision and retention before adding location collection.
