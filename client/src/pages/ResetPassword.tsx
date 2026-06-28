import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    // Use full-page redirect so Router() re-evaluates the path correctly
    if (!t) window.location.href = "/";
    else setToken(t);
  }, []);

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setValidationError("Passwords do not match.");
      return;
    }
    resetPassword.mutate({ token, password });
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-[#b91c1c] flex items-center justify-center">
            <span className="text-white font-black text-lg tracking-tight">FF</span>
          </div>
          <span className="text-xl font-black tracking-tight text-foreground uppercase">FacingFace</span>
        </div>

        <div className="border border-border bg-card p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-lg font-black uppercase tracking-widest text-foreground mb-2">Password reset!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been updated. You can now log in with your new password.
              </p>
              {/* Plain <a> forces a full-page reload so Router() re-evaluates the path */}
              <a
                href="/"
                className="w-full block bg-[#b91c1c] text-white py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-[#991b1b] transition-colors text-center"
              >
                Go to login
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black uppercase tracking-widest text-foreground mb-1">Set new password</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Choose a strong password for your FacingFace account.
              </p>
              {resetPassword.error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-3 text-xs mb-4">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {resetPassword.error.message}
                </div>
              )}
              {validationError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-3 text-xs mb-4">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {validationError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground mb-1">
                    New password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      className="w-full pl-9 pr-10 py-2.5 border border-border bg-background text-foreground text-sm focus:outline-none focus:border-[#b91c1c] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground mb-1">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      className="w-full pl-9 pr-3 py-2.5 border border-border bg-background text-foreground text-sm focus:outline-none focus:border-[#b91c1c] transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetPassword.isPending || !password || !confirm}
                  className="w-full bg-[#b91c1c] text-white py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-[#991b1b] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetPassword.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Reset password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
