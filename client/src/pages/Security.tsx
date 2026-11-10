import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, Fingerprint, Key, ChevronRight, Check, X, Eye, EyeOff, Monitor, LogOut } from "lucide-react";
import { toast } from "sonner";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePasswordSection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPw.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    changePasswordMutation.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  return (
    <section className="border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Key size={18} className="text-primary" />
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Change Password</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Current password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3 py-2 pr-10 text-sm border border-border bg-background text-foreground outline-none focus:border-primary"
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            placeholder="New password (min 8 chars)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoComplete="new-password"
            className="w-full px-3 py-2 pr-10 text-sm border border-border bg-background text-foreground outline-none focus:border-primary"
          />
          <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          autoComplete="new-password"
          className="w-full px-3 py-2 text-sm border border-border bg-background text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={changePasswordMutation.isPending || !currentPw || !newPw || !confirmPw}
          className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-primary hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {changePasswordMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
          Update Password
        </button>
      </form>
    </section>
  );
}

// ─── TOTP 2FA ─────────────────────────────────────────────────────────────────
function TwoFactorSection() {
  const [step, setStep] = useState<"idle" | "setup" | "backup">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [error, setError] = useState("");

  const { data: statusData, refetch: refetchStatus } = trpc.auth.totpStatus.useQuery();
  const is2FAEnabled = statusData?.enabled ?? false;

  const setupMutation = trpc.auth.totpSetup.useMutation({
    onSuccess: (data) => { setQrCode(data.qrCode); setSecret(data.secret); setStep("setup"); setError(""); },
    onError: (e) => setError(e.message),
  });

  const verifySetupMutation = trpc.auth.totpVerifySetup.useMutation({
    onSuccess: (data) => { setBackupCodes(data.backupCodes); setStep("backup"); refetchStatus(); },
    onError: (e) => { setError(e.message); setCode(""); },
  });

  const disableMutation = trpc.auth.totpDisable.useMutation({
    onSuccess: () => { toast.success("2FA disabled."); setShowDisable(false); setDisableCode(""); refetchStatus(); },
    onError: (e) => setError(e.message),
  });

  if (step === "backup") {
    return (
      <section className="border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-green-600" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">2FA Enabled!</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Save these backup codes somewhere safe. Each code can only be used once to sign in if you lose access to your authenticator app.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4 p-4 bg-muted border border-border font-mono text-sm">
          {backupCodes.map((c, i) => (
            <span key={i} className="text-foreground font-bold tracking-widest">{c}</span>
          ))}
        </div>
        <button
          onClick={() => { setStep("idle"); setBackupCodes([]); setCode(""); }}
          className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-primary hover:opacity-90"
        >
          Done — I've saved my codes
        </button>
      </section>
    );
  }

  if (step === "setup") {
    return (
      <section className="border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Set Up Authenticator App</h2>
        </div>
        <ol className="text-sm text-muted-foreground space-y-3 mb-4">
          <li><strong className="text-foreground">1.</strong> Open Google Authenticator, Authy, or any TOTP app.</li>
          <li><strong className="text-foreground">2.</strong> Scan the QR code below (or enter the key manually).</li>
          <li><strong className="text-foreground">3.</strong> Enter the 6-digit code to confirm setup.</li>
        </ol>
        {qrCode && (
          <div className="flex flex-col items-center gap-3 mb-4">
            <img src={qrCode} alt="QR Code" className="border border-border" style={{ width: 200, height: 200 }} />
            <p className="text-xs text-muted-foreground">Manual key: <code className="font-mono text-foreground bg-muted px-1">{secret}</code></p>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex items-center gap-2 max-w-sm">
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoComplete="one-time-code"
            className="flex-1 px-3 py-2 text-sm border border-border bg-background text-foreground outline-none focus:border-primary font-mono tracking-widest text-center"
            maxLength={6}
          />
          <button
            onClick={() => { if (code.length === 6) verifySetupMutation.mutate({ code }); }}
            disabled={verifySetupMutation.isPending || code.length < 6}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-primary hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {verifySetupMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Verify
          </button>
        </div>
        <button type="button" onClick={() => { setStep("idle"); setCode(""); setError(""); }} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </section>
    );
  }

  return (
    <section className="border border-border p-6">
      <div className="flex items-center gap-3 mb-2">
        <Shield size={18} className={is2FAEnabled ? "text-green-600" : "text-primary"} />
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Two-Factor Authentication (2FA)</h2>
        {is2FAEnabled && (
          <span className="ml-auto text-xs font-bold text-green-600 flex items-center gap-1"><Check size={12} /> Enabled</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {is2FAEnabled
          ? "Your account is protected with an authenticator app. You'll be asked for a code every time you sign in."
          : "Add an extra layer of security. After enabling, you'll need your authenticator app to sign in."}
      </p>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {!is2FAEnabled ? (
        <button
          onClick={() => setupMutation.mutate()}
          disabled={setupMutation.isPending}
          className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-primary hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {setupMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
          Enable 2FA
        </button>
      ) : (
        <>
          {!showDisable ? (
            <button
              onClick={() => setShowDisable(true)}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 border border-red-300 hover:bg-red-50 flex items-center gap-2"
            >
              <X size={12} /> Disable 2FA
            </button>
          ) : (
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                inputMode="text"
                aria-label="Authenticator or backup code to disable two-factor authentication"
                placeholder="Authenticator or backup code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8))}
                maxLength={8}
                autoCapitalize="characters"
                spellCheck={false}
                className="flex-1 px-3 py-2 text-sm border border-border bg-background text-foreground outline-none focus:border-red-400 font-mono tracking-widest text-center"
              />
              <button
                onClick={() => { if (disableCode.length >= 6) disableMutation.mutate({ code: disableCode }); }}
                disabled={disableMutation.isPending || disableCode.length < 6}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-red-500 hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
              >
                {disableMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Confirm
              </button>
              <button type="button" onClick={() => { setShowDisable(false); setDisableCode(""); setError(""); }} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─── Passkeys ─────────────────────────────────────────────────────────────────
function PasskeysSection() {
  const [deviceName, setDeviceName] = useState("My Device");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const { data: passkeys, isLoading } = trpc.auth.listPasskeys.useQuery();
  const registrationOptionsMutation = trpc.auth.passkeyRegistrationOptions.useMutation();
  const verifyRegistrationMutation = trpc.auth.verifyPasskeyRegistration.useMutation({
    onSuccess: () => { toast.success("Passkey registered!"); setRegistering(false); utils.auth.listPasskeys.invalidate(); },
    onError: (e) => { setError(e.message); setRegistering(false); },
  });
  const deletePasskeyMutation = trpc.auth.deletePasskey.useMutation({
    onSuccess: () => utils.auth.listPasskeys.invalidate(),
    onError: (e) => setError(e.message),
  });

  const handleRegister = async () => {
    if (!browserSupportsWebAuthn()) { setError("Your browser does not support passkeys."); return; }
    setError(""); setRegistering(true);
    try {
      const { options, challengeId } = await registrationOptionsMutation.mutateAsync();
      const response = await startRegistration({ optionsJSON: options });
      await verifyRegistrationMutation.mutateAsync({ challengeId, response, deviceName });
    } catch (err: any) {
      setError(err?.name === "NotAllowedError" ? "Passkey registration was cancelled." : err?.message ?? "Failed.");
      setRegistering(false);
    }
  };

  return (
    <section className="border border-border p-6">
      <div className="flex items-center gap-3 mb-2">
        <Fingerprint size={18} className="text-primary" />
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Passkeys & Biometrics</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Sign in with Face ID, Touch ID, fingerprint, or Windows Hello — no password needed.</p>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {isLoading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        <>
          {passkeys && passkeys.length > 0 && (
            <div className="space-y-2 mb-4">
              {passkeys.map((pk) => (
                <div key={pk.id} className="flex items-center justify-between border border-border px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={14} className="text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{pk.deviceName}</p>
                      <p className="text-xs text-muted-foreground">Added {new Date(pk.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => deletePasskeyMutation.mutate({ id: pk.id })} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Device name"
              className="flex-1 px-3 py-2 text-sm border border-border bg-background text-foreground outline-none focus:border-primary"
              maxLength={100}
            />
            <button
              onClick={handleRegister}
              disabled={registering || !deviceName.trim()}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-primary hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {registering ? <Loader2 size={12} className="animate-spin" /> : <Fingerprint size={12} />}
              Add
            </button>
          </div>
        </>
      )}
    </section>
  );
}


// ─── Active Sessions ─────────────────────────────────────────────────────────
function ActiveSessionsSection() {
  const utils = trpc.useUtils();
  const { data: sessions, isLoading } = trpc.auth.listSessions.useQuery();

  const revokeMutation = trpc.auth.revokeSession.useMutation({
    onSuccess: () => utils.auth.listSessions.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const revokeAllMutation = trpc.auth.revokeAllOtherSessions.useMutation({
    onSuccess: () => { toast.success("All other sessions signed out."); utils.auth.listSessions.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const otherSessions = sessions?.filter((s) => !s.isCurrent) ?? [];

  function formatRelative(date: Date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(date).toLocaleDateString();
  }

  return (
    <section className="border border-border p-6">
      <div className="flex items-center gap-3 mb-2">
        <Monitor size={18} className="text-primary" />
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Active Sessions</h2>
        {otherSessions.length > 0 && (
          <button
            onClick={() => revokeAllMutation.mutate()}
            disabled={revokeAllMutation.isPending}
            className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
          >
            {revokeAllMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
            Sign out all other devices
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">Devices and browsers that are currently signed in to your account.</p>
      {isLoading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className={`flex items-center justify-between border px-4 py-3 ${
              s.isCurrent ? "border-primary bg-primary/5" : "border-border"
            }`}>
              <div className="flex items-center gap-3">
                <Monitor size={16} className={s.isCurrent ? "text-primary" : "text-muted-foreground"} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{s.device}</p>
                    {s.isCurrent && (
                      <span className="text-xs font-bold text-primary border border-primary px-1.5 py-0.5">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress} · Last active {formatRelative(s.lastSeenAt)}
                  </p>
                </div>
              </div>
              {!s.isCurrent && (
                <button
                  onClick={() => revokeMutation.mutate({ id: s.id })}
                  disabled={revokeMutation.isPending}
                  className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Sign out
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active sessions found. Sessions are tracked from your next login.</p>
      )}
    </section>
  );
}

function DeleteAccountSection() {
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [challengeId, setChallengeId] = useState<number>();
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const utils = trpc.useUtils();
  const { data: requirements } = trpc.auth.deletionRequirements.useQuery();
  const { data: totp } = trpc.auth.totpStatus.useQuery();
  const sendCode = trpc.auth.requestDeletionCode.useMutation({
    onSuccess: (data) => { setChallengeId(data.challengeId); setError(""); toast.success("Confirmation code sent to your verified email."); },
    onError: (e) => setError(e.message),
  });
  const deletion = trpc.auth.deleteAccount.useMutation({
    onSuccess: (data) => {
      setCompleted(true);
      // Do not clear unrelated origin data; only FacingFace-owned draft/auth keys.
      for (const storageName of ["localStorage", "sessionStorage"] as const) {
        try {
          const storage = window[storageName];
          for (const key of Object.keys(storage)) if (/^(facingface|ff[-_:]|post_draft_)/i.test(key)) storage.removeItem(key);
        } catch { /* Server deletion already succeeded; storage can be unavailable. */ }
      }
      try { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "accountDeleted" })); } catch { /* Browser state is already cleared. */ }
      utils.auth.me.setData(undefined, null);
      toast.success(data.mediaPurgePending ? "Account deleted. Media cleanup is queued for retry." : "Account deleted.");
      // A new document closes existing client sockets and discards cached account
      // data. The public page explains completion without retaining credentials.
      window.location.replace(`/delete-account?completed=1${data.mediaPurgePending ? "&media=pending" : ""}`);
    },
    onError: (e) => setError(e.message),
  });
  if (completed) return <section className="border border-border p-6" role="status"><h2 className="font-bold">Account deleted</h2><p className="text-sm mt-2">Your sign-in access and personal content have been removed or redacted. Other members' content and minimal safety/billing records may remain. <a href="/" className="underline">Return to sign in</a></p></section>;
  return <section id="delete-account" className="border border-red-300 p-6" aria-labelledby="delete-account-heading">
    <h2 id="delete-account-heading" className="font-bold text-red-600">Delete my account</h2>
    <p className="text-sm text-muted-foreground mt-2">This is permanent. Your profile, credentials and authored content are removed or redacted. Other members' messages/comments are not deleted. A non-login anonymous record and moderation/billing records may remain; backups follow the privacy retention policy. Cancel paid subscriptions first. If you own a Page or Group, contact support for ownership-transfer assistance before deleting your account so other members do not lose access. Personal media is purged from configured storage; failed cleanup is queued for retry.</p>
    <form className="space-y-3 mt-4" onSubmit={(e) => { e.preventDefault(); if (confirmation !== "DELETE MY ACCOUNT") return; deletion.mutate({ confirmation: "DELETE MY ACCOUNT", currentPassword: password || undefined, challengeId, emailCode: emailCode || undefined, twoFactorCode: twoFactorCode || undefined }); }}>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {requirements?.passwordRequired ? <label className="block text-sm">Current password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full border border-border bg-background p-2 mt-1" /></label> : <>
        <button type="button" disabled={!requirements?.emailConfirmationAvailable || sendCode.isPending} onClick={() => sendCode.mutate()} className="underline text-sm disabled:opacity-50">{sendCode.isPending ? "Sending…" : "Send deletion confirmation code to verified email"}</button>
        {requirements && !requirements.emailConfirmationAvailable && <p className="text-sm">Verify your email or contact support before deleting this account.</p>}
        <label className="block text-sm">Email confirmation code<input autoComplete="one-time-code" value={emailCode} maxLength={8} onChange={(e) => setEmailCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} className="block w-full border border-border bg-background p-2 mt-1" /></label>
      </>}
      {totp?.enabled && <label className="block text-sm">Authenticator or backup code<input value={twoFactorCode} maxLength={8} onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} className="block w-full border border-border bg-background p-2 mt-1" required /></label>}
      <label className="block text-sm">Type DELETE MY ACCOUNT to confirm<input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" className="block w-full border border-border bg-background p-2 mt-1" /></label>
      <button type="submit" disabled={deletion.isPending || confirmation !== "DELETE MY ACCOUNT" || !requirements || (requirements.passwordRequired ? !password : !challengeId || !emailCode) || Boolean(totp?.enabled && !twoFactorCode)} className="bg-red-600 text-white px-4 py-2 font-bold disabled:opacity-50">{deletion.isPending ? "Deleting…" : "Permanently delete my account"}</button>
    </form>
  </section>;
}

// ─── Main Security Page ───────────────────────────────────────────────────────
export default function Security() {
  const { user, loading: isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-foreground" size={24} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-8 text-center">
        <p className="text-muted-foreground text-sm">Please sign in to view security settings.</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="its-accent" />
          <Shield size={20} className="text-primary" />
          <h1 className="text-lg font-black uppercase tracking-widest text-foreground">Account Security</h1>
          <div className="flex-1 its-divider" />
        </div>

        <div className="space-y-4">
          <ChangePasswordSection />
          <TwoFactorSection />
          <PasskeysSection />
          <ActiveSessionsSection />
          <DeleteAccountSection />
        </div>
      </div>
      </div>
  );
}
