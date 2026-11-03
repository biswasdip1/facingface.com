# FacingFace — Larger Post Composer & Simple Colour Styles

Release: **3 November 2026**

## One ZIP, one deployment

Use **facingface.com-larger-post-composer-and-for-you-feed-03-Nov-2026.zip**. This is the complete cumulative FacingFace website, not a patch. It includes both this larger-post update and the optional For You interest feed delivered immediately before it, along with the Admin Actions dropdown, member cards, attractive card backgrounds, profile-link repair and all previous source files.

You only need to deploy this newest ZIP. Do not upload the older For You ZIP separately or combine different releases.

## What changed

The Create Post window is now genuinely wider on desktop: up to **720 pixels**, while still fitting smaller screens. The plain writing area is taller, and text automatically grows while typing or pasting. Very long drafts remain scrollable rather than pushing the publishing controls off-screen.

Coloured text posts now have a clean, larger canvas: at least **360 pixels high on desktop** and **280 pixels on mobile**, with room to grow when needed. The former floating circles and decorative lines have been removed. Coloured text is centred, bold and readable, with responsive sizes that also support Nepali text.

There are **15 background choices**, including no background, the existing colours, gentle Royal Blue/Red/Grey gradients, Vivid Violet, Midnight and Sunset. Existing stored colour values are retained. The editor preview and published wall post use the same background definitions and text colours. Pale backgrounds use dark text.

The background picker has larger labelled swatches and a clear selected state. The Post button is larger and stays in a fixed footer inside the dialog, outside its scrollable editing area.

## Try it

1. On Home, click **Start a post**.
2. Write a short message. You should immediately notice the larger writing area.
3. Press **Color** (the background-colour icon on mobile).
4. Choose **Vivid Violet**, **Royal Blue**, or another style.
5. Press **Post**. The published coloured message should have the same clean background and a larger display area.

To return to plain text, choose the **Aa / No background** swatch. To test longer writing, paste several paragraphs and check that you can still scroll and reach Post.

The Public/Private dropdown stays visible, starts automatically at **Public**, and offers only **Public** and **Private**. Private remains a deliberate manual choice. No audience prompt opens automatically.

## What remains unchanged

Posting requests, media uploads and their limits, duplicate-submit guards, draft/discard behaviour, scheduling, tagging, feelings, check-in, polls and link-preview/Shorts logic retain their existing handlers. Reactions, comments, sharing and saving retain their existing functionality.

The shared composer is also used in Page/Group contexts and benefits from the larger editor. Those contexts still use their original posting routes and visibility rules. This update does not modify Page/Group URL-preview rules or move their content into the personal wall. The larger published coloured-post treatment in this release applies to wall posts rendered by PostCard; dedicated Page/Group renderer layouts are not redesigned here.

The For You feature is preserved unchanged. Home still starts in **Latest**, and users can choose **For You → Interests & controls**. Activity learning remains off by default until explicitly enabled. See the included FOR_YOU_FEED_GUIDE.md for usage and privacy details; use this newest combined ZIP for deployment rather than the older ZIP named in that historical guide.

## Deploy through the existing GitHub → Render path

1. Download and extract the newest combined ZIP.
2. Replace your existing GitHub repository contents with the extracted contents.
3. Commit/push to `main` and allow the same Render service to deploy.
4. Wait for **Live**, refresh FacingFace, and try the steps above on desktop and mobile.

Keep the existing Start Command:

```text
node dist/_core/index.js
```

Do not change the existing database, persistent media storage, Gmail/SMTP configuration, Cloudflare TURN settings or other Render Environment Variables. Keep `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`. No new environment variable or paid service is required for the composer update.

This visual update changes no server or database files relative to the previous For You release. Because this combined ZIP also contains the not-yet-deployed For You feature, its two private optional preference tables are created on first For You use through the existing database connection, as described in the For You guide. Existing tables and data are not reset.

## Validation completed

- Full production build passed.
- 356 focused tests passed, including 122 colour-style compatibility/contrast tests and the existing recommendation, privacy, posts, groups, calls, member-card and Admin regressions.
- 15 additional isolated PostgreSQL-engine tests passed for the preserved For You storage and privacy rules.
- Browser checks passed for the 720-pixel editor, bigger plain/coloured input, Nepali text, desktop/mobile layout, light/Dark Blue themes, matching preview/published styles, Public/Private defaults, long-draft scrolling and the visible publish footer.
- A sandbox publish test confirmed one submission only while the Post button was disabled during an in-flight request. The short saved colour value was preserved.
- The complete For You browser flows and its multi-page/late-refresh timing regressions were rerun and passed.
- No new TypeScript diagnostics were added. The pre-existing 30 unrelated whole-project diagnostics remain.
- Posting/upload payloads and their handlers were compared byte-for-byte with the previous complete release. Only CreatePost.tsx and PostCard.tsx changed among previously existing files; shared styling/helper/tests and this guide are additions.
- Complete cumulative file preservation, ZIP integrity and SHA-256 are verified before delivery.

Tests used sandbox fixtures and isolated databases. No live posts, user accounts or preferences were modified during development. After deployment, please perform the short checks above on FacingFace.
