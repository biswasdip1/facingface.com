import { useState } from "react";
import { trpc } from "@/lib/trpc";

// Shown after successful registration.
// Passes email via sessionStorage so the resend button works.

export default function CheckYourEmail() {
  const email = sessionStorage.getItem("ff_pending_email") ?? "";
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const resendMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => setResent(true),
    onError: (e) => setError(e.message),
  });

  const handleResend = () => {
    setResent(false);
    setError("");
    resendMutation.mutate({ email, origin: window.location.origin });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg,#1a3a5c 0%,#1877f2 60%,#0d2a4a 100%)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-center"
        style={{ background: "#fff" }}
      >
        {/* Header */}
        <div
          className="px-8 py-8"
          style={{ background: "linear-gradient(135deg,#1a3a5c,#1877f2)" }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl text-white mx-auto mb-3"
            style={{ background: "#e63329" }}
          >
            FF
          </div>
          <span className="text-2xl font-black text-white" style={{ letterSpacing: "-1px" }}>
            FacingFace
          </span>
        </div>

        {/* Body */}
        <div className="px-8 py-10">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold mb-3" style={{ color: "#1c1e21" }}>
            Check your email
          </h2>
          <p className="text-sm mb-2" style={{ color: "#4b4f56", lineHeight: 1.6 }}>
            We sent a verification link to:
          </p>
          <p className="font-semibold mb-6 text-base" style={{ color: "#1877f2" }}>
            {email || "your email address"}
          </p>
          <p className="text-sm mb-8" style={{ color: "#65676b", lineHeight: 1.6 }}>
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>

          {resent && (
            <div
              className="text-sm px-4 py-3 rounded-lg mb-4"
              style={{ background: "#f0fff4", color: "#276749", border: "1px solid #c6f6d5" }}
            >
              Verification email resent! Check your inbox.
            </div>
          )}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg mb-4"
              style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #fcc" }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resendMutation.isPending || !email}
            className="w-full py-3 rounded-lg font-bold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60 mb-3"
            style={{ background: "#1877f2" }}
          >
            {resendMutation.isPending ? "Sending…" : "Resend verification email"}
          </button>

          <a
            href="/"
            className="block text-sm font-medium"
            style={{ color: "#65676b", textDecoration: "none" }}
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
