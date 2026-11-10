# FacingFace data-only request link — deployment and handling

This complete source update adds a public `/delete-data` page separate from the working `/delete-account` account-deletion instructions. No native rebuild, database-schema change, automatic deletion, subscription cancellation or production submission was performed.

## Deploy before using the new URL

Deploy this latest complete ZIP through the same Render-connected repository/service using the preserved `npm ci && npm run build` build and `node dist/_core/index.js` start commands. Preserve database/disk/JWT/Stripe/SMTP/encryption settings. All earlier Home menu/header/scroll/login/self-deletion repairs are included.

Open `https://www.facingface.com/delete-data` in a private browser. It must show **Request deletion of your FacingFace data**, not the login page or a missing route. The page is public. Its email option is available without login or app installation. “Prepare email request” only opens a mail draft; the user must send it. The fallback instructions show `direct.letter@gmail.com` and the required request subject.

For signed-in users, the page calls the existing authenticated `support.submit` API to store a private support request under **Data deletion request — keep my account**. A successful response shows its request reference, not a deletion-completed claim. No anonymous deletion endpoint, new request table, timer or new administrative delete-all action was added.

Use a disposable test account and a clearly labelled NON-DESTRUCTIVE TEST request to verify receipt in **Contact & Support → Admin Inbox** and in the existing email notifications where configured. Do not ask for deletion of the owner's or a real member's records merely to test the link. Do not mark the test ticket as fulfilled without distinguishing it from an actual deletion request.

## Two different Google Play fields

For **account and associated data deletion**, retain:

```text
https://www.facingface.com/delete-account
```

For the optional question about deleting some/all data **without requiring account deletion**, select **Yes** only after the new page is live and your team genuinely accepts and fulfils these requests. Use:

```text
https://www.facingface.com/delete-data
```

Do not use the account-only URL in the optional data-only field. Do not select “data automatically deleted within 90 days”; no such universal rule was implemented. If you are not ready to deploy/handle data-only requests, select **No** for that optional question instead. Do not submit a currently missing URL simply because it exists in an undeployed ZIP.

## Actual request handling is mandatory

Monitor both the support inbox and the published support email. Verify identity, using the existing account/registered-email controls; never erase another member's data based solely on a provided email or content link. Do not ask users to email passwords or security codes. Confirm the selected data scope and consequences with the requester before an irreversible action.

Use the existing own-content controls or a reviewed, appropriately authorized administrative process to remove the confirmed records and their applicable account-owned uploaded files. Do not run account deletion to fulfil a keep-account request. Do not delete other members' copies/messages, unrelated Page/Group content or payment records. Do not detach the media disk, reset the database or enable the global migration flag.

Reply with the expected completion date and any retained categories, reason and actual retention period; confirm the outcome only after verification. A request ticket's “Resolve” action closes the support ticket and **does not perform data deletion**. Existing database deletion safety remains unchanged.

The code does not invent a response deadline, automatic purge schedule or backup expiry. Before making a public store declaration, document your real completion and backup/security/billing retention periods and make the resource/policy reflect them. The resource currently explains that support must provide those applicable periods; that is not a certification that all retention disclosures are complete or a guarantee of Play approval.

## Validation and official guidance

TypeScript and production build passed. Included suite: 335 passed, 11 opt-in database tests skipped in this latest run. Local compiled-browser tests with mocked accounts/API results passed public/no-login access, email draft content, saved-request acknowledgement, failed request handling and an unavailable auth service. These do not prove live support email delivery or actual human fulfilment. No live support request, data deletion or Play declaration was submitted by this task.

Google's account-deletion policy distinguishes account deletion and optional other-data controls: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en . Google's design guidance discusses a dedicated support page/request form when automation is not available, explaining consequences and confirming outcomes: https://android-developers.googleblog.com/2024/03/designing-your-account-deletion-experience-google-play.html .
