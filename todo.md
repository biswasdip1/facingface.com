# FacingFace Render login repair — 10 November 2026

Based on the exact uploaded `FacingFace-Website-2026-11-04-Self-Delete-Deploy.zip`, with every original file retained and all amendments accumulated into the complete updated ZIP. No live deployment, database mutation, account deletion or subscription action was performed by this task.

- [x] Reproduced the code/database mismatch in an isolated PostgreSQL database; supplied logs confirm skipped migrations and missing account_media_purge_jobs.
- [x] Added a fixed transactional startup compatibility step for missing shipped 0015/0016 schema, independent of the global migration flag.
- [x] Preserved existing account/password/billing data and tombstone/hash/purge progress; verified repeat/concurrent runs and rollback on incompatible definitions.
- [x] Prevented production internal SQL/query parameters from being exposed on the login screen; kept normal authentication feedback.
- [x] Final TypeScript and frontend/server production build passed using unchanged package dependencies/npm lockfile.
- [x] Included ordinary regression suite: 321 passed; 11 opt-in SQL tests skipped in that run.
- [x] Final targeted SQL run: 7 real PostgreSQL schema tests plus 3 error/order tests passed.
- [x] Real compiled-server/browser test passed: legacy startup, account/paid subscription preservation, password login, public deletion page, paid-deletion blocking, disposable self-delete/sign-out, personal-file purge and peer preservation. No physical-device certification claimed.
- [x] Updated deployment/SQL documentation; package will exclude dependencies, compiled output, test fixtures, logs, credentials and screenshots while retaining all original source files.
- [ ] User backs up the existing database/media, deploys ZIP contents through the existing repository/Render service and verifies live login, subscriptions and account deletion. No mobile binary rebuild or public rollout is required for this backend repair.

## 10 November — header and existing TestFlight scrolling update

- [x] Identified the cropped label after Saved from the supplied screenshot; replaced clipped primary navigation with responsive whole-item layout and accessible settings-menu overflow routes.
- [x] Added Settings → Delete my account shortcut to the existing protected Security confirmation page; no deletion executed.
- [x] Disabled the custom document-wide non-passive pull-to-refresh handler only in explicitly marked native sessions; browser behavior retained. Native Home remains the reload action.
- [x] Coalesced feed load-more layout reads into animation frames with a duplicate-request guard; removed loaded full-size blurred image placeholders and added asynchronous image decoding.
- [x] Final TypeScript check and production build passed. Latest included suite: 327 passed; 11 opt-in database tests skipped (prior isolated repair SQL/browser tests remain recorded above).
- [x] Chromium synthetic-user layout tests passed at 640,768,820,1024,1280,1366,1434,1536,1920. Simulated native feed: zero document-wide non-passive pull listeners; browser feed: one. No actual iPhone performance measurement claimed.
- [x] Complete clean ZIP preserves every original file, earlier login repair/deletion safeguards, dependency lockfile and Render settings; no signing credentials or generated output included.
- [ ] User deploys the latest complete source to the existing Render service, verifies the new commit/health, closes/reopens TestFlight and compares same-feed scrolling on the actual iPhone. No new IPA/AAB or store submission performed for these website changes.

## 10 November — Home-only shortcut menu adjustment and location audit

- [x] Kept the organization Page layout/shared header unchanged; balanced the Home menu/feed/news columns only.
- [x] Added theme-aware Explore FacingFace menu; desktop remains open, mobile/tablet starts collapsed with accessible Menu toggle and focus styles.
- [x] Retained existing shortcut routes, posts/ads, native-free purchase exclusions and prior scroll/deletion/login repairs.
- [x] TypeScript and production build passed; included suite: 330 passed, 11 opt-in database tests skipped in this latest run.
- [x] Synthetic-browser Home interaction/geometry tests passed at 375,390,640,768,1024,1280,1401,1434,1536,1920; existing header/listener checks also passed. Theme text/background differentiation and native-free purchase restriction checked.
- [x] Read-only location audit: manual public profile city/location, typed check-ins; People You May Know uses mutual friends, not distance. No GPS/proximity collection added or enabled.
- [x] Complete new ZIP accumulates every previous repair file; credentials, generated output and test fixtures excluded.
- [ ] User deploys newest ZIP through same existing Render-connected repository and reloads Home. No production action performed here.
- [ ] Optional future feature: confirm city/area vs foreground approximate GPS, audience/age safeguards and retention/disable semantics before implementing Nearby discovery or changing store privacy declarations.
