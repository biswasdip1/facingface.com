import LegalPage from "@/components/LegalPage";

const FAQ = [
  {
    q: "How do I create an account?",
    a: "Click 'Create new account' on the login page. Enter your name, email address, and a secure password. You will receive a verification email — click the link to activate your account.",
  },
  {
    q: "How do I reset my password?",
    a: "On the login page, click 'Forgot password?' and enter your registered email address. You will receive a password reset link within a few minutes.",
  },
  {
    q: "How do digital member plans work?",
    a: "The browser website offers Green, Golden and Diamond plans in Get Verified. Review the current price and billing interval before purchasing; activation follows verified payment. Digital-plan purchases are not offered in the free FacingFace mobile release.",
  },
  {
    q: "How do I report a post or user?",
    a: "Click the three-dot menu on any post and select 'Report'. For user reports, visit their profile and use the report option. Our moderation team reviews all reports.",
  },
  {
    q: "How do I delete my account?",
    a: "Sign in, open Security, and use Delete your account. Confirm your current password or verified-email code, your authenticator or backup code if enabled, and type DELETE MY ACCOUNT. Cancel any recurring paid subscription and resolve owned Pages or Groups first. The action is irreversible. See /delete-account for data-retention details and help if you cannot sign in.",
  },
  {
    q: "Can I request deletion of selected data without deleting my account?",
    a: "Yes. Open /delete-data, describe the data and relevant links or dates, and submit to support while signed in or send an email without login. Support reviews identity and scope; the request does not automatically delete data, close your account or cancel a subscription. Ask for the completion date, retained-data exceptions and confirmation.",
  },
  {
    q: "What are the daily posting limits?",
    a: "To ensure fair use, members can post up to 2 photos, 2 videos, 12 audio clips, 2 polls, 3 live streams, and 2 documents per day. Limits reset every 24 hours.",
  },
  {
    q: "How do I cancel a recurring website plan?",
    a: "Use the cancellation action in the website plan settings if available, or contact support to cancel the recurring plan. Do not assume deleting the account cancels payment-provider charges. Account deletion requires successful cancellation first.",
  },
  {
    q: "How do I contact support?",
    a: "Email us at direct.letter@gmail.com with a description of your issue. We aim to respond within 2 business days.",
  },
];

export default function HelpPage() {
  return (
    <LegalPage title="Help Centre">
      <section>
        <p className="text-muted-foreground">
          Find answers to common questions below. If you need further assistance, contact us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">
            direct.letter@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Your data controls</h2>
        <p><a href="/delete-data" className="text-[var(--its-red)] underline">Request deletion of selected data while keeping your account</a>, or use the separate <a href="/delete-account" className="text-[var(--its-red)] underline">account-deletion instructions</a>.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Frequently Asked Questions</h2>
        {FAQ.map(({ q, a }) => (
          <div key={q} className="border border-border rounded-none p-4">
            <p className="font-semibold text-sm mb-1">{q}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Still Need Help?</h2>
        <p>
          Our support team is available Monday to Friday. Email us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">
            direct.letter@gmail.com
          </a>{" "}
          and we will get back to you as soon as possible.
        </p>
      </section>
    </LegalPage>
  );
}
