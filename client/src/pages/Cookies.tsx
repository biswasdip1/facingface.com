import LegalPage from "@/components/LegalPage";

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies Policy">
      <p className="text-muted-foreground">
        This Cookies Policy explains how FacingFace.com uses cookies and similar technologies when you visit our platform.
      </p>

      <section>
        <h2 className="text-lg font-bold mb-2">1. What Are Cookies?</h2>
        <p>
          Cookies are small text files stored on your device by your browser when you visit a website. They allow the website to remember your actions and preferences over time.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">2. Cookies We Use</h2>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold">Cookie</th>
                <th className="text-left py-2 pr-4 font-semibold">Type</th>
                <th className="text-left py-2 font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-mono text-xs">app_session_id</td>
                <td className="py-2 pr-4">Essential</td>
                <td className="py-2">Keeps you logged in to your account</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-mono text-xs">theme_preference</td>
                <td className="py-2 pr-4">Functional</td>
                <td className="py-2">Remembers your light/dark theme choice</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4 font-mono text-xs">analytics_*</td>
                <td className="py-2 pr-4">Analytics</td>
                <td className="py-2">Helps us understand how the platform is used (anonymised)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">3. Essential Cookies</h2>
        <p>
          Essential cookies are required for the platform to function. Without them, you cannot log in or use core features. These cookies cannot be disabled.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">4. Functional Cookies</h2>
        <p>
          Functional cookies remember your preferences (such as theme) to improve your experience. You can clear these by clearing your browser's cookies.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">5. Analytics Cookies</h2>
        <p>
          We use privacy-respecting analytics to understand how members use FacingFace. Data is anonymised and not shared with third parties for advertising purposes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">6. Managing Cookies</h2>
        <p>
          You can control and delete cookies through your browser settings. Please note that disabling essential cookies will prevent you from using FacingFace. For guidance on managing cookies in your browser, visit your browser's help documentation.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">7. Contact</h2>
        <p>
          For questions about our use of cookies, contact us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">
            direct.letter@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
