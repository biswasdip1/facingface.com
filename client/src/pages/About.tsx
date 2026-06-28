import LegalPage from "@/components/LegalPage";

export default function AboutPage() {
  return (
    <LegalPage title="About FacingFace">
      <section>
        <h2 className="text-lg font-bold mb-2">Our Mission</h2>
        <p>
          FacingFace is a social platform built to help people connect, share, and communicate with friends, family, and communities around the world. We believe in giving everyone a voice and the tools to build meaningful relationships online.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">What We Offer</h2>
        <p>
          FacingFace provides a rich set of features designed for genuine human connection: photo and video sharing, live broadcasts, polls, group discussions, direct messaging, voice and video calls, and real-time notifications. Our AI-powered moderation system helps keep the community safe and respectful.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Verified Accounts</h2>
        <p>
          Members can obtain a blue verification badge by subscribing to our Blue Badge plan. Verification helps the community identify authentic accounts and builds trust across the platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Contact Us</h2>
        <p>
          We are always happy to hear from our community. For general enquiries, feedback, or support, please reach out to us at{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">
            direct.letter@gmail.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Company Information</h2>
        <p>
          FacingFace.com is operated by FacingFace. Registered correspondence can be directed to{" "}
          <a href="mailto:direct.letter@gmail.com" className="text-[var(--its-red)] hover:underline">
            direct.letter@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
