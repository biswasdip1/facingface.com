import { useState } from "react";
import { Link } from "wouter";
import LegalPage from "@/components/LegalPage";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildDataDeletionRequest, dataDeletionEmailHref, DATA_DELETION_TOPIC } from "@/lib/dataDeletionRequest";

export default function DeleteDataInfo() {
  const { user, loading } = useAuth();
  const [details, setDetails] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const request = trpc.support.submit.useMutation({
    onSuccess: result => {
      if (result.ok && Number.isSafeInteger(result.msgId) && result.msgId > 0) {
        setRequestId(result.msgId);
        setDetails("");
        setError("");
      } else setError("We could not confirm that your request was saved. Please use the email option below.");
    },
    onError: () => setError("We could not confirm that your request was saved. Please try again or send an email. Your data has not been deleted."),
  });
  const submit = () => {
    if (!user || request.isPending) return;
    try {
      const message = buildDataDeletionRequest(details);
      setError("");
      request.mutate({ topic: DATA_DELETION_TOPIC, message });
    } catch {
      setError("Describe the data you want removed in 10 to 3,000 characters. Do not include passwords or verification codes.");
    }
  };
  return (
    <LegalPage title="Request deletion of your FacingFace data" lastUpdated="10 November 2026">
      <section className="space-y-3">
        <p><strong>Keep your account, request removal of selected data.</strong> This page is for FacingFace website, Android and iOS users. It does not delete your account or cancel a subscription. To delete the entire account and its associated data instead, use our <Link href="/delete-account" className="text-[var(--its-red)] underline">account-deletion page</Link>.</p>
        <p>Tell us which personal profile information or content you want removed. You can specify posts, comments, uploaded photos/videos/audio/documents, or recommendation preferences. Include relevant links or dates so support can identify the data. A request is not proof of ownership or permission to erase another person's content.</p>
      </section>
      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-bold">Send a data-deletion request</h2>
        <p>No app installation is required. You can always use the email option below without signing in. If you are signed in, you can also send the request directly to FacingFace's private support inbox.</p>
        {requestId !== null && <div role="status" className="border border-border rounded p-3 space-y-2"><p className="font-bold">Request received — reference #{requestId}</p><p>Support must review your identity and the requested scope. Your account is still active; no data was deleted by this submission. Keep the reference number and contact support if you need to follow up.</p></div>}
        <div className="space-y-2">
          <Label htmlFor="delete-data-details">Which data would you like removed?</Label>
          <Textarea id="delete-data-details" value={details} maxLength={3000} rows={5} onChange={event => { setDetails(event.target.value); setError(""); }} placeholder="For example: remove my old profile location and the photo post at [link], while keeping my account." aria-describedby="delete-data-warning" />
          <p id="delete-data-warning" className="text-sm text-muted-foreground">Do not include a password, two-factor/verification code, payment-card number or identity-document attachment. This request is private support correspondence, not a public post.</p>
        </div>
        {error && <p role="alert" className="text-sm text-[var(--its-red)]">{error}</p>}
        {user ? <Button type="button" onClick={submit} disabled={request.isPending || details.trim().length < 10 || details.trim().length > 3000}>{request.isPending ? "Sending request…" : "Submit request to support"}</Button> : <p className="text-sm text-muted-foreground">{loading ? "Checking whether you are signed in. The email option remains available." : "You are not signed in. Use email below, or sign in to submit through the support inbox."}</p>}
        <div className="border-t border-border pt-4 space-y-2">
          <a href={dataDeletionEmailHref(details)} className="inline-block rounded-lg border border-border px-4 py-3 font-semibold text-foreground">Prepare email request</a>
          <p className="text-sm">This opens a draft in your email app; <strong>you must send it</strong>. A draft is not a submitted request. If no email app opens, write to <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] underline">direct.letter@gmail.com</a> with subject <strong>{DATA_DELETION_TOPIC}</strong>, identify your FacingFace account and describe what to remove. Send from your registered email where possible. Do not include credentials.</p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">What is deleted, and what stays?</h2>
        <p>Support handles requests manually after confirming account ownership and the exact scope. Ask for the expected completion date and a written confirmation of the data removed and any exceptions. Sending this request alone does not immediately remove profile fields, content or uploaded files.</p>
        <p>With data-only deletion, the account identifier, sign-in information and any data you did not ask to remove stay while the account remains active. Existing subscription and payment records are not automatically cancelled or erased. If removing requested data would prevent an account feature from working, support should explain that before proceeding.</p>
        <p>Other members' content and messages, independently saved copies or screenshots, and payment-provider records may not be removable through this request. Security, fraud-prevention or legally required records may need to remain. Existing backups are not selectively erased by this request; ask support for the applicable backup expiry and any additional retention period. The request correspondence is retained while needed to verify and handle your request and document its outcome.</p>
        <p>This page does not promise that all data is automatically deleted within 90 days. You can follow up with the support email or, when signed in, <Link href="/contact-support" className="text-[var(--its-red)] underline">Contact &amp; Support</Link>. For broader practices, read the <Link href="/privacy" className="text-[var(--its-red)] underline">Privacy Policy</Link>.</p>
      </section>
    </LegalPage>
  );
}
