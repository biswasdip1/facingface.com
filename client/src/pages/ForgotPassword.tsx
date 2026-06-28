import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    forgotPassword.mutate({ email: email.trim(), origin: window.location.origin });
  };

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
          {submitted ? (
            <div className="text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-lg font-black uppercase tracking-widest text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
              </p>
              <p className="text-xs text-muted-foreground mb-6">The link expires in 1 hour.</p>
              {/* Use plain <a> for full-page reload so the Router re-evaluates the path */}
              <a href="/" className="text-sm font-bold text-[#b91c1c] hover:underline flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back to login
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black uppercase tracking-widest text-foreground mb-1">Forgot password?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-foreground mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-9 pr-3 py-2.5 border border-border bg-background text-foreground text-sm focus:outline-none focus:border-[#b91c1c] transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={forgotPassword.isPending || !email.trim()}
                  className="w-full bg-[#b91c1c] text-white py-2.5 text-sm font-bold uppercase tracking-widest hover:bg-[#991b1b] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forgotPassword.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Send reset link
                </button>
              </form>
              <div className="mt-6 text-center">
                {/* Use plain <a> for full-page reload so the Router re-evaluates the path */}
                <a href="/" className="text-sm font-bold text-[#b91c1c] hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Back to login
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
