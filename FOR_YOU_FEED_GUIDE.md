# FacingFace — Optional For You Feed

Release: **2 November 2026**

## What you will see

On Home, just below Stories, there are now two choices:

| Choice | What it does |
|---|---|
| **Latest** | The normal newest-first wall. Home always starts here. |
| **For You** | An optional selection ranked using your chosen interests, followed accounts and topics from approved public Pages/Groups you follow. |

Latest's existing posts, composer, Stories, advertisements, Reels inserts, People You May Know and Suggested Pages remain in place. Choosing For You is not compulsory and does not change anyone else's feed.

## Try it after deployment

1. Open **Home → For You**.
2. Press **Interests & controls**.
3. Choose up to **8 interests**, such as Sport & fitness, Music & dance, Travel, Art & literature, or Community & events.
4. Press **Save preferences**.
5. Browse the suggested posts. A short explanation above each post tells you why it was included.
6. Use **Show more recommendations** for the next batch, or **Refresh suggestions** for a newly ranked selection.
7. Press **Latest** whenever you want the normal newest-first wall.

English and selected Nepali topic keywords are supported. If there are few matching posts, the selection also includes recent community posts. It cannot recommend content that does not exist on FacingFace.

## Learning and privacy controls

**Learning from reactions/comments is off by default.** Merely opening For You or choosing interests does not turn it on.

If a member deliberately enables **Learn from reactions & comments** and saves, future positive post reactions and unflagged comments can help identify related topics. Only eligible activity within the last 30 days and since enabling is considered. Recommendations update when refreshed or preferences are saved; they do not reshuffle underneath you after each click.

The feature does not use direct messages, calls, search history, private-group membership, contact lists, outside browsing, or a watch-time tracking system. Interest preferences and hidden-post choices are private to the signed-in account. The existing privacy page explains the new controls.

### Not interested

Press **Not interested** above a recommendation to hide that post from your For You selection. The choice is saved to your account and persists across devices. It does not delete the post, notify its author, hide it from other people, or remove it from Latest. **Undo** restores the most recently hidden post in that screen.

### Reset recommendations

In **Interests & controls**, press **Reset recommendations** and confirm. This:

- Clears your chosen interests.
- Clears your hidden-recommendation choices.
- Turns activity learning off and advances its time cutoff.

It does not delete posts, reactions, comments, messages, friendships, Page follows or Group memberships. If learning is enabled again later, older activity is not reused. Followed accounts and public Page/Group topic labels still provide their normal signals because reset does not unfollow anything.

## Important scope

This is an explainable, lightweight rules-based recommendation system, not a claim to reproduce TikTok's machine-learning infrastructure. It considers a bounded pool of up to 400 recent eligible original wall posts and returns up to 120 suggestions, shown 20 at a time in a stable selection. Topic matches, followed authors, recentness and author variety influence order. No paid AI API or third-party tracking service is needed.

For this first focused release, For You recommends **original wall posts**. Page posts, Group posts and reshares remain in their existing locations; public Page/Group topic labels can help identify relevant wall-post topics. Existing search and the separate Reels feed have not been changed by this update.

Private wall posts are eligible only for their author or accepted friends, following the same audience rule as the current wall. Flagged posts, future-scheduled posts, blocked accounts in either direction and currently suspended authors are excluded before recommendation scoring. Activity on inaccessible or hidden candidates is not used for learning.

## Deploy this complete website ZIP

Use **facingface.com-optional-for-you-feed-02-Nov-2026.zip**. It is the full cumulative FacingFace website source, including the latest Admin Actions dropdown, member cards, attractive backgrounds, repaired profile link, and previous repairs. Do not combine it with older ZIPs or create a new website.

1. Download and extract the newest ZIP.
2. Replace your existing GitHub repository contents with its extracted contents.
3. Commit/push to `main` and let the same Render service deploy.
4. Wait for **Live**, refresh the browser, then try **Home → For You**.

Keep the current Start Command:

```text
node dist/_core/index.js
```

No new API key, Environment Variable, paid provider or manual database-migration command is required. Keep the current database, persistent-media storage, Gmail/SMTP and Cloudflare TURN configuration unchanged, including `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`.

On first use of For You, the server creates two isolated optional tables, `feed_recommendation_settings` and `feed_recommendation_hidden`, using the existing database connection. It does not alter/reset existing tables or run the historical migration chain. The database account must permit creating these feature tables, as with the existing optional member-card feature. If For You cannot load, it shows an error with a return to Latest; normal browsing remains separate.

## Validation

- Complete production build passed.
- 234 focused policy/API/privacy/social/call/group/admin/member-card tests passed, including 105 new ranking and API ownership tests.
- 15 additional tests using an isolated real PostgreSQL engine passed for persistence, private audiences, both block directions, suspensions, consent cutoffs, positive/negative reaction consistency, approved public community signals, reset and database cascades.
- Real production UI browser checks passed for Latest default, no recommendation calls until chosen, interest Save/Cancel, learning opt-in, Not interested/Undo, reset, stable 20-post batches, mobile sizing and error/empty-state recovery.
- Additional browser regressions passed for returning from For You after loading multiple Latest pages, and hiding a post while an older refresh is still in flight. Latest restarts at its newest page and the hidden recommendation does not reappear.
- The latest Admin Actions menu and card-to-profile navigation were rechecked and passed.
- No new TypeScript diagnostics were introduced; the existing 30 unrelated whole-project diagnostics remain.
- File-by-file cumulative preservation, ZIP integrity and SHA-256 are verified before delivery.

All tests used isolated fixture accounts or sandbox-only databases. No live user preferences, posts, accounts or data were modified during development. Please perform the simple post-deployment checks above on FacingFace.
