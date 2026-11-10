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
        <h3 className="mt-4 mb-2 font-bold">Optional For You Recommendations</h3>
        <p>Home opens in Latest (newest first). If you choose For You, we use your private interest choices, followed accounts and topic labels from public Pages/Groups you follow to rank eligible recent wall posts. Learning from reactions and comments is off by default. If you explicitly enable it in Interests &amp; controls, your positive reactions and unflagged comments after enabling, within the last 30 days, may help identify related topics. We do not use messages, calls, search history, private-group membership or outside browsing for this feature, and do not infer sensitive personal traits. Not interested hides a post only from your For You selection. Reset recommendations clears chosen interests and hidden recommendations and turns activity learning off; it does not delete your posts, reactions, comments or follows. Previously recorded activity is not reused if you later enable learning again. Preferences and hidden-post choices are stored privately against your account and removed when the account is deleted.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">3. Sharing Your Information</h2>
        <p>
          We do not sell your personal data. We may share information with trusted third-party service providers (such as Stripe for payments and cloud infrastructure providers) solely to operate our platform. We may also disclose information when required by law.
        </p>
        <h3 className="mt-4 mb-2 font-bold">Optional Digital Member Cards</h3>
        <p>You may choose to create a promotional FacingFace member card. Public sharing is off by default, and the profile photo is not included initially. If you enable sharing, anyone with the card link or QR can see the selected display name, optional photo, random member number and card design. Your card does not include your email, phone, birthday, address, posts or messages, and does not verify real-world identity. You can disable sharing or replace the link in My Member Card. This stops access through the old link, but images and screenshots already downloaded by you or others cannot be recalled. Viewing a full profile or sending a friend request continues to require sign-in.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">4. Data Retention</h2>
        <p>
          We retain personal data while your account is active or needed to provide services. You can initiate irreversible account deletion in Security → Delete your account. See our <a href="/delete-account" className="text-[var(--its-red)] hover:underline">account-deletion instructions</a>. You must confirm your password or verified-email code and, if enabled, two-factor authentication.
        </p>
        <p className="mt-3">Successful deletion removes authentication credentials and sessions, erases personal profile fields, and removes or redacts authored content. We retain a minimal non-login tombstone identifier and a one-way hash of the former login identity to preserve other members' records and prevent stale credentials from restoring the deleted account. Account-owned files are purged; a failed storage purge remains pending for operator retry. Existing backups, payment-provider records, other members' messages and independently saved copies are not erased by this action. Contact <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">direct.letter@gmail.com</a> if you cannot sign in or need additional deletion assistance.</p>
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
