import LegalPage from "@/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="text-muted-foreground">
        This Privacy Policy explains how FacingFace.com ("we", "us", or "our") collects, uses, and protects your personal information when you use our platform.
      </p>

      <section>
        <h2 className="text-lg font-bold mb-2">1. Information We Collect</h2>
        <p>We collect information you provide directly to us, including:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
          <li>Account information (name, email address, password)</li>
          <li>Profile information (avatar, bio, location)</li>
          <li>Content you post (text, photos, videos, audio, documents)</li>
          <li>Communications you send through the platform</li>
          <li>Payment information (processed securely by Stripe; we do not store card details)</li>
          <li>Phone number (if provided for account security)</li>
        </ul>
        <p className="mt-3">We also collect information automatically, including device information, IP address, browser type, and usage data.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
          <li>Provide, maintain, and improve our services</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send you notifications and service-related communications</li>
          <li>Enforce our community guidelines and terms of service</li>
          <li>Detect and prevent fraud and abuse</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">3. Sharing Your Information</h2>
        <p>
          We do not sell your personal data. We may share information with trusted third-party service providers (such as Stripe for payments and cloud infrastructure providers) solely to operate our platform. We may also disclose information when required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">4. Data Retention</h2>
        <p>
          We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">5. Cookies</h2>
        <p>
          We use cookies and similar technologies to maintain your session, remember your preferences, and analyse usage. See our <a href="/cookies" className="text-[var(--its-red)] hover:underline">Cookies Policy</a> for details.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">6. Your Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or restrict processing of your personal data. To exercise these rights, contact us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">7. Security</h2>
        <p>
          We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and secure session management. No system is completely secure; please use a strong, unique password.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">8. Contact</h2>
        <p>
          For privacy-related enquiries, contact us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a>.
        </p>
      </section>
    </LegalPage>
  );
}
