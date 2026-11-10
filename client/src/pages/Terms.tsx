import LegalPage from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p className="text-muted-foreground">
        By using FacingFace.com you agree to these Terms of Service. Please read them carefully.
      </p>

      <section>
        <h2 className="text-lg font-bold mb-2">1. Acceptance of Terms</h2>
        <p>
          By creating an account or using FacingFace.com, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">2. Eligibility</h2>
        <p>
          You must be at least 13 years old to use FacingFace. By registering, you confirm that you meet this age requirement. Users under 18 must have parental or guardian consent.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">3. Your Account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a>{" "}
          if you suspect unauthorised access.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
          <li>Post content that is illegal, harmful, threatening, abusive, or harassing</li>
          <li>Impersonate any person or entity</li>
          <li>Post spam, unsolicited advertising, or malicious links</li>
          <li>Upload malware or attempt to disrupt the platform</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Scrape or harvest data from the platform without permission</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">5. Content Ownership</h2>
        <p>
          You retain ownership of content you post. By posting, you grant FacingFace a non-exclusive, royalty-free licence to display and distribute your content on the platform. You are solely responsible for ensuring you have the rights to post any content.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">6. Subscriptions and Payments</h2>
        <p>
          The Blue Badge subscription is billed monthly at £2.00. Payments are processed by Stripe. You may cancel at any time; your badge remains active until the end of the current billing period. Refunds are not provided for partial months.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">7. Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time by contacting us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">8. Limitation of Liability</h2>
        <p>
          FacingFace.com is provided "as is". We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">9. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the new Terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">10. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
