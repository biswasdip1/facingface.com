# FacingFace — New Logo & Facebook Website Preview Repair

Release: **3 November 2026**

## Use one complete website ZIP

Deploy **facingface.com-new-logo-facebook-preview-repair-03-Nov-2026.zip** through your existing GitHub → Render workflow. This is the complete cumulative FacingFace source, not a patch or a new separate website. It includes the larger post composer, simpler coloured wall posts, optional For You feed, member cards, attractive card backgrounds, profile-link repair, Admin Actions dropdown and all earlier files.

Use only this newest ZIP. You do not need to combine or separately deploy previous releases.

## Logo recommendation and design

The two faces looking towards each other are a strong fit for **FacingFace** and **People meet people**. This release keeps that original idea, with balanced white face silhouettes, a lighter rounded border and a consistent red background. The website name stays as live text beside the mark so it remains clear on smaller screens.

The updated symbol replaces the old FF blocks on the desktop/mobile navbar, landing page, login/signup/two-factor screens, password-recovery/reset screens, legal-page header and digital member card. The browser favicon, iPhone icon and installable-app icons are updated too. Existing logo dimensions and surrounding page layouts are retained. User profile photos are not replaced.

Chat-related shortcut and fallback notification icons use a matching face-to-face symbol with a small conversation bubble. Main website/app icons use the standard symbol. The install display name is now FacingFace. Existing installation settings, shortcut destination URLs and notification actions remain unchanged.

The included images are PNG/JPEG raster assets, not editable vector files. The original supplied artwork is preserved separately and was not overwritten.

## Why Facebook showed no image

The live homepage pointed Facebook to an old external image URL that returned **403 Forbidden**. Its Open Graph website URL also still pointed to an old Manus hosting address rather than FacingFace.

The new sharing image is served by your existing Render website at:

```text
https://www.facingface.com/brand/facingface-share-20261103.jpg
```

It is a meaningful **1200 × 630 JPEG** banner with the face-to-face symbol and:

> FacingFace
> People meet people
> Share moments. Find your community.
> www.facingface.com

Facebook no longer has to use the inaccessible external favicon. The homepage delivers the correct HTTPS image URL, JPEG type, width, height, alt description, website address and title directly in its HTML. JavaScript and sign-in are not required for the crawler to read them. X/Twitter metadata also uses the larger image format.

The assets are small source-controlled files in `brand-assets/`. An isolated Vite plugin bundles them into `dist/public/brand` during the existing build. They are hosted with FacingFace itself, not on temporary image links. No extra CDN, paid service, API key, environment variable or database migration is needed.

This is a general FacingFace website promotional preview. It does not publish private user/profile/member-card information or implement new per-post social-media previews.

## Deploy

1. Download and extract the newest complete ZIP.
2. Replace the existing GitHub repository contents with the extracted contents, including the new `brand-assets/` folder and `scripts/brandAssetsPlugin.ts`.
3. Commit/push to `main` and let the same Render service deploy.
4. Wait for **Live**, then refresh FacingFace. If necessary use a hard refresh so the old favicon is not cached.
5. Open the image URL above. You should see the new banner, not a blank page or an error.

Keep your existing build settings and Start Command:

```text
node dist/_core/index.js
```

Do not change the database, persistent media storage, Gmail/SMTP settings, Cloudflare TURN credentials or other existing Render Environment Variables. Keep `RUN_DATABASE_MIGRATIONS_ON_STARTUP=false`. None of those settings is changed by this repair.

## Important: refresh Facebook's cached preview after deployment

1. Open [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).
2. Sign in to Facebook if it asks. Do not share your password or any verification code with anyone.
3. Enter **https://www.facingface.com/** and click **Debug**.
4. Click **Scrape Again** to fetch the newly deployed page and image.
5. Check the preview. Then create a fresh Facebook post containing the website link.

If you normally share **https://facingface.com/** without www, refresh that URL in the Debugger too. Facebook may keep separate cached entries for URL variants. The sharing tags now consistently identify the main website as **https://www.facingface.com/**.

Facebook controls its cache and final presentation. Changing your website does not guarantee that every old Facebook post automatically changes its old image. This release was checked with anonymous Facebook-like HTTP requests in the sandbox, but the new banner cannot be verified on Facebook's live preview until it has been deployed and Facebook has re-scraped it.

If an already-installed app still shows the old icon, its browser/operating system may keep the old install icon. Refresh/reopen the app first. If necessary, remove only the home-screen shortcut and add it again; this is not account deletion and does not reset the server database.

## Validation

- Complete production build passed; all seven permanent brand assets were emitted successfully.
- **413 focused tests passed**, including 57 new metadata/asset tests plus existing post styles, recommendations, privacy, member cards, calls, groups, reactions, posts and Admin tests.
- Anonymous `facebookexternalhit`, Facebot and browser-style requests received the correct raw HTML tags and an actual 1200 × 630 JPEG with the right content type, length and bytes.
- All declared PWA icon URLs were checked for availability, MIME type and actual dimensions.
- Desktop/mobile landing, login, signup, password and navbar logo checks passed. Existing forms/passkeys and Home links were retained.
- Member-card export, opt-in sharing, private defaults, disabled-link behaviour and desktop/mobile flows passed. The downloaded PNG QR was independently decoded successfully.
- The larger composer, matching coloured-post styles, Public/Private defaults, For You controls and timing regressions, Admin dropdown and member-card profile navigation were rechecked and passed.
- No new TypeScript diagnostics were introduced; the same 30 pre-existing unrelated diagnostics remain.
- Database schemas, backend source, user data, messages, calls, post handlers, app routes, Render build/start commands and existing environment settings are unchanged from the previous complete release. A new server-directory test file is added; server implementation files are unchanged.
- All previous archived files are retained. ZIP integrity and SHA-256 are verified before delivery.

Testing used isolated browser fixtures, not live accounts or posts. No production data was reset or deleted. After deployment, please test the new logo on desktop/mobile and refresh the Facebook preview using the steps above.

## Official references

Meta's current guidance recommends 1200 × 630 images, image dimensions in Open Graph tags, a new image URL when replacing a cached image, and the Sharing Debugger to fetch/update previews [1]. Open Graph defines the correct website URL and structured image fields such as secure URL, MIME type, dimensions and alt text [2].

[1]: https://developers.facebook.com/documentation/sharing/webmasters/images "Meta — Images in Link Shares"
[2]: https://ogp.me/ "The Open Graph protocol"
