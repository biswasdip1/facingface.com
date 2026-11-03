import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

// /verify-email?token=<hex>[&email=<encoded>]
// Called when the user clicks the link in their verification email.
// On success: marks email as verified, sets session cookie, and redirects to the feed.
// On failure: shows a clear error with a "Resend verification email" option.

export default function VerifyEmail() {
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [errorMsg, setErrorMsg] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);

  const resendMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => setResendSent(true),
  });

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: (e) => {
      setStatus("error");
      setErrorMsg(e.message);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    if (email) setResendEmail(decodeURIComponent(email));
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found in the link. Please check your email and try again.");
      return;
    }
    verifyMutation.mutate({ token });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown redirect after success
  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) { window.location.href = "/"; return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg,#1a3a5c 0%,#1877f2 60%,#0d2a4a 100%)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-center"
        style={{ background: "#fff" }}
      >
        {/* Header — colour changes with status */}
        <div
          className="px-8 py-8"
          style={{
            background:
              status === "success"
                ? "linear-gradient(135deg,#1a5c2a,#27ae60)"
                : status === "error"
                ? "linear-gradient(135deg,#7f0000,#c0392b)"
                : "linear-gradient(135deg,#1a3a5c,#1877f2)",
          }}
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

          {/* ── Pending ── */}
          {status === "pending" && (
            <>
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full border-4 animate-spin"
                  style={{ borderColor: "#1877f2", borderTopColor: "transparent" }}
                />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#1c1e21" }}>
                Verifying your email…
              </h2>
              <p className="text-sm" style={{ color: "#65676b" }}>
                Please wait a moment while we confirm your address.
              </p>
            </>
          )}

          {/* ── Success ── */}
          {status === "success" && (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl"
                style={{ background: "#e8f8ee" }}
              >
                ✅
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#1c1e21" }}>
                Email verified!
              </h2>
              <p className="text-sm mb-5" style={{ color: "#65676b" }}>
                Your account is now active. You are now logged in.
              </p>
              <div
                className="rounded-lg px-4 py-3 mb-6 text-sm"
                style={{ background: "#e8f8ee", color: "#1e7e34" }}
              >
                Redirecting to your feed in <strong>{countdown}</strong> second{countdown !== 1 ? "s" : ""}…
              </div>
              <a
                href="/"
                className="inline-block px-6 py-3 rounded-lg font-bold text-white text-sm"
                style={{ background: "#27ae60", textDecoration: "none" }}
              >
                Go to Feed Now
              </a>
            </>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl"
                style={{ background: "#fff0f0" }}
              >
                ❌
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#1c1e21" }}>
                Verification failed
              </h2>
              <p className="text-sm mb-6" style={{ color: "#65676b" }}>
                {errorMsg}
              </p>

              {/* Resend option */}
              {!resendSent ? (
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-3" style={{ color: "#1c1e21" }}>
                    Need a new verification link?
                  </p>
                  {resendEmail ? (
                    <button
                      onClick={() =>
                        resendMutation.mutate({ email: resendEmail, origin: window.location.origin })
                      }
                      disabled={resendMutation.isPending}
                      className="w-full py-3 rounded-lg font-bold text-white text-sm disabled:opacity-60"
                      style={{ background: "#1877f2", border: "none", cursor: "pointer" }}
                    >
                      {resendMutation.isPending ? "Sending…" : `Resend to ${resendEmail}`}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Your email address"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                        style={{ borderColor: "#dadde1", color: "#1c1e21" }}
                      />
                      <button
                        onClick={() =>
                          resendMutation.mutate({ email: resendEmail, origin: window.location.origin })
                        }
                        disabled={resendMutation.isPending || !resendEmail}
                        className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-60"
                        style={{ background: "#1877f2", border: "none", cursor: "pointer" }}
                      >
                        {resendMutation.isPending ? "…" : "Resend"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="rounded-lg px-4 py-3 mb-6 text-sm"
                  style={{ background: "#e8f8ee", color: "#1e7e34" }}
                >
                  ✓ A new verification email has been sent — check your inbox.
                </div>
              )}

              <a
                href="/"
                className="inline-block px-6 py-3 rounded-lg font-bold text-sm"
                style={{
                  background: "transparent",
                  border: "1px solid #dadde1",
                  color: "#1c1e21",
                  textDecoration: "none",
                }}
              >
                ← Back to home
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
