import LegalPage from "@/components/LegalPage";
import { Link } from "wouter";

export default function DeleteAccountInfo() {
  const query = new URLSearchParams(window.location.search);
  const completed = query.get("completed") === "1";
  return (
    <LegalPage title="Delete your FacingFace account">
      {completed && <section role="status" className="rounded-lg border border-border bg-card p-4 space-y-2">
        <h2 className="text-lg font-bold">Deletion confirmation complete</h2>
        <p>You have returned here after the account-deletion confirmation flow. The browser session and cached account data have been cleared.</p>
        {query.get("media") === "pending" && <p>Storage cleanup was queued for retry. Your account is not restored while this cleanup is pending.</p>}
      </section>}
      <section className="space-y-3">
        <p>You can delete your own FacingFace account from the browser website or from the FacingFace mobile app. You do not need to email support for an ordinary account that you can sign in to.</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Sign in to the account you want to delete.</li>
          <li>Open <strong>Security</strong> and find <strong>Delete your account</strong>.</li>
          <li>Review the consequences. Enter your current password, or verify a code sent to your verified email if your account has no password. If two-factor authentication is enabled, confirm with an authenticator or backup code.</li>
          <li>Type <strong>DELETE MY ACCOUNT</strong> and confirm the deletion. This is irreversible.</li>
        </ol>
        <Link href="/security#delete-account" className="inline-block rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-3">Open account security</Link>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">What happens to your data?</h2>
        <p>After a successful deletion, sign-in is disabled, sessions and authentication credentials are removed, personal profile fields are erased, and your authored content is removed or replaced with deleted-content placeholders. A minimal non-login account identifier is retained to preserve other members' conversations and related records without your profile information.</p>
        <p>Account-owned uploaded files are purged from the configured storage. If storage is temporarily unavailable, a pending purge is recorded for retry; the account is not restored. Other members' messages and independently saved copies, screenshots, payment-provider records and existing backups are not erased by this action.</p>
        <p>If you have a recurring paid website subscription, cancel it successfully before deleting the account so that deletion does not leave ongoing charges. If you own a Page or Group, resolve its ownership first to avoid removing other members' access. The free mobile app does not offer digital-subscription purchases.</p>
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Cannot sign in or need help?</h2>
        <p>Use password recovery first. If you cannot regain access or need help resolving ownership or a pending media purge, contact <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a> from your registered email address. See the <Link href="/privacy" className="text-[var(--its-red)] hover:underline">Privacy Policy</Link> for more information.</p>
      </section>
    </LegalPage>
  );
}
