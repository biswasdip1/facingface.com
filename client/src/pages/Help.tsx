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
    q: "How do I get the blue verification badge?",
    a: "Go to your profile dropdown and click 'Get Verified', or visit /subscription. Subscribe to the Blue Badge plan for £2.00/month. Your badge appears automatically after payment.",
  },
  {
    q: "How do I report a post or user?",
    a: "Click the three-dot menu on any post and select 'Report'. For user reports, visit their profile and use the report option. Our moderation team reviews all reports.",
  },
  {
    q: "How do I delete my account?",
    a: "Account deletion requests can be submitted by emailing direct.letter@gmail.com from your registered email address. We will process your request within 30 days.",
  },
  {
    q: "What are the daily posting limits?",
    a: "To ensure fair use, members can post up to 2 photos, 2 videos, 12 audio clips, 2 polls, 3 live streams, and 2 documents per day. Limits reset every 24 hours.",
  },
  {
    q: "How do I cancel my Blue Badge subscription?",
    a: "Go to /subscription and click the 'Cancel' button next to your active subscription. Your badge will be removed at the end of the current billing period.",
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
