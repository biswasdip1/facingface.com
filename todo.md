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
