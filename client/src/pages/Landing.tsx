import { useState, useRef } from "react";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { trpc } from "@/lib/trpc";

// ─── Facebook-style Landing Page ─────────────────────────────────────────────
// Left column: branding + tagline
// Right column: Log In form (default) with "Create new account" toggle
// Auth is fully self-contained: email + password only.

type View = "login" | "signup";

export default function Landing() {
  const [view, setView] = useState<View>("login");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: "linear-gradient(160deg,#1a6fb5 0%,#1877f2 50%,#0d5aa7 100%)",
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
      }}
    >
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-20">

        {/* ── LEFT — Branding ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center text-white text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-5">
            <div
              className="w-14 h-14 flex items-center justify-center font-black text-2xl text-white rounded-lg flex-shrink-0"
              style={{ background: "#b91c1c" }}
            >
              FF
            </div>
            <span className="text-4xl lg:text-5xl font-black" style={{ letterSpacing: "-2px" }}>
              FacingFace
            </span>
          </div>
          <p className="text-xl lg:text-2xl font-semibold leading-snug max-w-sm mx-auto lg:mx-0" style={{ opacity: 0.95 }}>
            Connect with friends and the world around you.
          </p>
          <p className="text-base lg:text-lg font-medium leading-snug max-w-sm mx-auto lg:mx-0 mt-1" style={{ opacity: 0.8, fontStyle: "italic" }}>
            साथीहरू र तपाईंको वरपरको संसारसँग जोडिनुहोस्।
          </p>
          <ul className="mt-8 space-y-3 text-sm hidden lg:block" style={{ opacity: 0.85 }}>
            {[
              "Share photos, videos, polls and live streams",
              "Follow people who matter to you",
              "Real-time notifications for likes & comments",
              "AI-powered content moderation",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#e63329" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── RIGHT — Auth Forms ───────────────────────────────────────── */}
        <div className="w-full lg:w-[400px] flex-shrink-0">
          {view === "login"
            ? <LoginForm onSwitchToSignup={() => setView("signup")} />
            : <SignupForm onSwitchToLogin={() => setView("login")} />
          }
        </div>
      </div>

      <footer className="mt-12 text-center text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-2">
          {[
            { label: "About", href: "/about" },
            { label: "Help", href: "/help" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Advertising", href: "/advertising" },
            { label: "Cookies", href: "/cookies" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              {label}
            </a>
          ))}
        </div>
        <p>FacingFace.com · <a href="mailto:direct.letter@gmail.com" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>direct.letter@gmail.com</a></p>
        <p className="mt-0.5">© 2026 FacingFace.com. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ─── Log In Form ─────────────────────────────────────────────────────────────
function LoginForm({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isUnverifiedError, setIsUnverifiedError] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const resendMutation = trpc.auth.resendVerification.useMutation({
    onSuccess: () => setResendSent(true),
  });
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.emailLogin.useMutation({
    onSuccess: async (data) => {
      if (data.needs2FA && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setNeeds2FA(true);
        setError("");
      } else {
        try {
          if (data.user) {
            utils.auth.me.setData(undefined, data.user);
          }

          const user = await utils.auth.me.fetch().catch((err: any) => {
            console.warn("[Login] Session readback failed after successful password login; using login response user if available:", err);
            return data.user ?? null;
          });

          if (user || data.user) {
            window.location.href = "/";
            return;
          }
          setError("Login was accepted, but your session could not be opened. Please refresh the page and try again.");
        } catch (err: any) {
          console.error("[Login] Session setup failed after successful password login:", err);
          setError(err?.message ? `Login was accepted, but session loading failed: ${err.message}` : "Login was accepted, but session loading failed. Please try again.");
        }
      }
    },
    onError: (e) => {
      setError(e.message);
      const msg = e.message.toLowerCase();
      setIsUnverifiedError(
        msg.includes("verify") || msg.includes("not verified") || msg.includes("verification")
      );
    },
  });

  const totpLoginMutation = trpc.auth.totpLogin.useMutation({
    onSuccess: () => { window.location.reload(); },
    onError: (e) => { setError(e.message); setTotpCode(""); },
  });

  const passkeyAuthOptionsMutation = trpc.auth.passkeyAuthOptions.useMutation();
  const verifyPasskeyMutation = trpc.auth.verifyPasskeyAuth.useMutation({
    onSuccess: () => { window.location.reload(); },
    onError: (e) => setError(e.message),
  });

  const handlePasskeyLogin = async () => {
    if (!browserSupportsWebAuthn()) {
      setError("Your browser does not support passkeys.");
      return;
    }
    setError("");
    try {
      const { options, challengeId } = await passkeyAuthOptionsMutation.mutateAsync();
      const response = await startAuthentication({ optionsJSON: options });
      await verifyPasskeyMutation.mutateAsync({ challengeId, response });
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setError("Passkey sign-in was cancelled.");
      } else {
        setError(err?.message ?? "Passkey sign-in failed.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    loginMutation.mutate({ email, password });
  };

  // 2FA step
  if (needs2FA) {
    return (
      <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ background: "#fff" }}>
        <div className="px-8 pt-8 pb-2 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white mx-auto mb-4" style={{ background: "#e63329" }}>FF</div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "#1c1e21" }}>Two-Factor Authentication</h2>
          <p className="text-sm" style={{ color: "#65676b" }}>Enter the 6-digit code from your authenticator app, or a backup code.</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (totpCode.trim()) totpLoginMutation.mutate({ pendingToken, code: totpCode.trim() }); }}
          className="px-8 pb-6 flex flex-col gap-3 mt-4"
        >
          {error && (
            <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #fcc" }}>{error}</div>
          )}
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            autoFocus
            autoComplete="one-time-code"
            className="w-full px-4 py-3 rounded-lg border text-center text-2xl font-mono tracking-widest outline-none"
            style={{ borderColor: "#dadde1", color: "#1c1e21", letterSpacing: "0.3em" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1877f2")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#dadde1")}
          />
          <button
            type="submit"
            disabled={totpLoginMutation.isPending || totpCode.length < 6}
            className="w-full py-3 rounded-lg font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "#1877f2" }}
          >
            {totpLoginMutation.isPending ? "Verifying…" : "Verify"}
          </button>
          <button type="button" onClick={() => { setNeeds2FA(false); setPendingToken(""); setTotpCode(""); setError(""); }} className="text-sm text-center" style={{ color: "#65676b" }}>
            ← Back to login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ background: "#fff" }}>
      <div className="px-8 pt-8 pb-2 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white mx-auto mb-4"
          style={{ background: "#e63329" }}
        >
          FF
        </div>
         <h2 className="text-xl font-bold mb-1" style={{ color: "#1c1e21" }}>Log in to FacingFace</h2>
        <p className="text-sm" style={{ color: "#65676b" }}>Enter your email and password below.</p>
      </div>
      <form onSubmit={handleSubmit} className="px-8 pb-6 flex flex-col gap-3 mt-4">
        {error && (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #fcc" }}>
            {error}
            {isUnverifiedError && !resendSent && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => resendMutation.mutate({ email, origin: window.location.origin })}
                  disabled={resendMutation.isPending || !email}
                  className="text-xs font-bold underline disabled:opacity-60"
                  style={{ color: "#1877f2", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {resendMutation.isPending ? "Sending…" : "Resend verification email"}
                </button>
              </div>
            )}
            {isUnverifiedError && resendSent && (
              <div className="mt-2 text-xs" style={{ color: "#27ae60" }}>
                ✓ Verification email sent — check your inbox.
              </div>
            )}
          </div>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
          style={{ borderColor: "#dadde1", color: "#1c1e21", fontSize: "16px" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1877f2")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#dadde1")}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
          style={{ borderColor: "#dadde1", color: "#1c1e21", fontSize: "16px" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1877f2")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#dadde1")}
        />

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full py-3 rounded-lg font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "#1877f2" }}
        >
          {loginMutation.isPending ? "Logging in…" : "Log in"}
        </button>

        <div className="text-center">
          <a href="/forgot-password" style={{ color: "#1877f2", fontSize: "14px" }}>
            Forgot password?
          </a>
        </div>
        <div className="relative flex items-center gap-3 my-1">
          <div className="flex-1 border-t" style={{ borderColor: "#dadde1" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8a8d91" }}>or</span>
          <div className="flex-1 border-t" style={{ borderColor: "#dadde1" }} />
        </div>
        <button
          type="button"
          onClick={handlePasskeyLogin}
          disabled={passkeyAuthOptionsMutation.isPending || verifyPasskeyMutation.isPending}
          className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
          style={{ borderColor: "#dadde1", color: "#1c1e21", background: "transparent" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
            <path d="M10 10v2a2 2 0 0 0 4 0v-2"/>
            <path d="M8 10a4 4 0 1 1 8 0"/>
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
          </svg>
          {passkeyAuthOptionsMutation.isPending || verifyPasskeyMutation.isPending
            ? "Verifying…"
            : "Sign in with Passkey / Biometrics"}
        </button>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px" style={{ background: "#dadde1" }} />
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="px-6 py-3 rounded-lg font-bold text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: "#42b72a" }}
          >
            Create new account
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Sign Up Form ─────────────────────────────────────────────────────────────
function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      sessionStorage.setItem("ff_pending_email", email);
      window.location.href = "/check-your-email";
    },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || !confirm) { setError("Please fill in all fields."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    registerMutation.mutate({ name, email, password, origin: window.location.origin });
  };

  const inputStyle = {
    borderColor: "#dadde1",
    color: "#1c1e21",
    fontSize: "16px",
  };

  return (
    <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ background: "#fff" }}>
      <div className="px-8 pt-8 pb-2 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white mx-auto mb-4"
          style={{ background: "#e63329" }}
        >
          FF
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "#1c1e21" }}>Create a new account</h2>
        <p className="text-sm" style={{ color: "#65676b" }}>It's quick and easy.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-8 pb-6 flex flex-col gap-3 mt-4">
        {error && (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #fcc" }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1877f2")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#dadde1")}
        />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1877f2")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#dadde1")}
        />

        <input
          type="password"
          placeholder="New password (min. 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1877f2")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#dadde1")}
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1877f2")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#dadde1")}
        />

        <p className="text-xs" style={{ color: "#8a8d91" }}>
          By clicking Sign Up, you agree to our Terms and Privacy Policy.
        </p>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full py-3 rounded-lg font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "#42b72a" }}
        >
          {registerMutation.isPending ? "Creating account…" : "Sign Up"}
        </button>

        <div className="text-center mt-1">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm font-medium"
            style={{ color: "#1877f2", background: "none", border: "none", cursor: "pointer" }}
          >
            Already have an account? Log in
          </button>
        </div>
      </form>
    </div>
  );
}
