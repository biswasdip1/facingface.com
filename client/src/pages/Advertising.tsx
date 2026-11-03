import LegalPage from "@/components/LegalPage";

export default function AdvertisingPage() {
  return (
    <LegalPage title="Advertising">
      <section>
        <h2 className="text-lg font-bold mb-2">Advertise on FacingFace</h2>
        <p>
          FacingFace.com offers advertising opportunities to help businesses and creators reach our growing community. Whether you are a small business, a brand, or an individual creator, we can help you connect with the right audience.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Our Advertising Principles</h2>
        <p>
          We are committed to maintaining a positive experience for our members. All advertising on FacingFace must comply with our community standards. We do not allow ads that are misleading, harmful, or that target minors.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Advertising Options</h2>
        <p>
          We currently offer the following advertising formats:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
          <li><strong>Sponsored Posts</strong> — promoted content appearing in member feeds</li>
          <li><strong>Banner Placements</strong> — display advertising across the platform</li>
          <li><strong>Community Sponsorships</strong> — sponsoring specific groups or topics</li>
        </ul>
        <p className="mt-3">
          Advertising products are currently in development. To express interest or enquire about early access, please contact us.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Ad Targeting</h2>
        <p>
          FacingFace uses limited, privacy-respecting targeting based on general interests and platform activity. We do not sell your personal data to advertisers. For details on how advertising data is handled, see our{" "}
          <a href="/privacy" className="text-[var(--its-red)] hover:underline">Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Get in Touch</h2>
        <p>
          To enquire about advertising on FacingFace, please email us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">
            direct.letter@gmail.com
          </a>{" "}
          with the subject line "Advertising Enquiry". We will respond within 3 business days.
        </p>
      </section>
    </LegalPage>
  );
}
