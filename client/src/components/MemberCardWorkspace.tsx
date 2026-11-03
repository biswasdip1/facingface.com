import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  IdCard,
  Link2,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import DigitalMemberCard from "./DigitalMemberCard";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import type {
  MemberCardAppearance,
  MemberCardDisplay,
} from "@shared/memberCard";

export type MemberCardSettings = {
  enabled: boolean;
  showName: boolean;
  showPhoto: boolean;
  appearance: MemberCardAppearance;
};
export type OwnerMemberCardData = {
  settings: MemberCardSettings;
  card: MemberCardDisplay;
  profileName: string;
  profileAvatar: string | null;
};

export default function MemberCardWorkspace({
  data,
  onSave,
  onReplace,
  busy = false,
}: {
  data: OwnerMemberCardData;
  onSave: (settings: MemberCardSettings) => Promise<void>;
  onReplace: () => Promise<void>;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState<MemberCardSettings>(data.settings);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setDraft(data.settings);
  }, [data]);
  const dirty =
    draft.enabled !== data.settings.enabled ||
    draft.showName !== data.settings.showName ||
    draft.showPhoto !== data.settings.showPhoto ||
    draft.appearance !== data.settings.appearance;
  const shareReady =
    data.settings.enabled && draft.enabled && !dirty && !!data.card.sharePath;
  const preview: MemberCardDisplay = {
    ...data.card,
    displayName: draft.showName ? data.profileName : "FacingFace member",
    avatar: draft.showPhoto ? data.profileAvatar : null,
    appearance: draft.appearance,
    sharePath: shareReady ? data.card.sharePath : null,
  };
  const shareUrl = shareReady
    ? new URL(data.card.sharePath!, window.location.origin).href
    : "";

  async function copyLink() {
    if (!shareReady) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(
        "Your member-card link is copied. Share it wherever you like."
      );
    } catch {
      toast.error(
        "Copy is not supported here. Select and copy the link shown below."
      );
    }
  }

  async function shareCard() {
    if (!shareReady) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.card.displayName} on FacingFace`,
          text: "Connect with me on FacingFace — people meet people.",
          url: shareUrl,
        });
      } catch (error: any) {
        if (error?.name !== "AbortError") await copyLink();
      }
    } else await copyLink();
  }

  async function downloadCard() {
    if (
      !shareReady ||
      !cardRef.current ||
      !cardRef.current.querySelector('[data-card-qr="ready"]')
    ) {
      toast.info(
        "Save and enable sharing first. Please allow a moment for the QR code to appear."
      );
      return;
    }
    setDownloading(true);
    try {
      const node =
        cardRef.current.querySelector<HTMLElement>(".ff-member-card")!;
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        backgroundColor: draft.appearance === "dark" ? "#17171b" : "#fffafb",
      });
      const anchor = document.createElement("a");
      anchor.download = `FacingFace-${data.card.memberNumber ?? "member"}.png`;
      anchor.href = dataUrl;
      anchor.click();
      toast.success(
        "Your card is downloaded. The QR opens only your shared member card."
      );
    } catch {
      toast.error(
        "The card image could not be downloaded. Try switching off the photo, save, and download again."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 text-foreground">
      <Link
        href="/profile"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to my profile
      </Link>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-[.2em] uppercase text-[var(--its-red)]">
            A new way to connect
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Your Digital Member Card
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            One card. Your community. Share your FacingFace profile with a QR
            code—only when you choose.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">
          <LockKeyhole size={14} />
          Optional · You control sharing
        </span>
      </div>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <section className="min-w-0" aria-label="Member card preview">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {dirty ? "Unsaved preview" : "Your card preview"}
            </span>
            <span
              className={
                shareReady
                  ? "text-green-700 dark:text-green-400"
                  : "text-muted-foreground"
              }
            >
              {shareReady ? "Sharing enabled" : "Private preview"}
            </span>
          </div>
          <div ref={cardRef}>
            <DigitalMemberCard card={preview} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={shareCard}
              disabled={!shareReady || busy}
              className="gap-2 bg-[var(--its-red)] text-white hover:opacity-90"
            >
              <Share2 size={16} />
              Share card
            </Button>
            <Button
              variant="outline"
              onClick={copyLink}
              disabled={!shareReady || busy}
              className="gap-2 bg-card"
            >
              <Copy size={16} />
              Copy link
            </Button>
            <Button
              variant="outline"
              onClick={downloadCard}
              disabled={!shareReady || busy || downloading}
              className="gap-2 bg-card"
            >
              {downloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Download PNG
            </Button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {dirty
              ? "Save your changes before sharing or downloading."
              : shareReady
                ? "Use your card in messages, at community events, or on your other social profiles."
                : "Sharing is off. Choose your options, enable sharing, then save to create a QR code."}
          </p>
          {shareReady && (
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <label
                htmlFor="member-card-url"
                className="mb-2 flex items-center gap-2 text-xs font-bold"
              >
                <Link2 size={14} />
                Your sharing link
              </label>
              <input
                id="member-card-url"
                readOnly
                value={shareUrl}
                onFocus={e => e.currentTarget.select()}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Anyone with this link can view only the card information you
                selected.
              </p>
            </div>
          )}
          <div className="mt-6 flex gap-3 rounded-xl border border-border bg-card p-4">
            <ShieldCheck size={20} className="shrink-0 text-[var(--its-red)]" />
            <div>
              <h2 className="text-sm font-bold">
                A social card, not an identity document
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Your card never includes your email, phone, birthday, address,
                posts, or messages. A valid card does not verify a person's
                real-world identity. Copies and screenshots can still be shared
                by others.
              </p>
            </div>
          </div>
        </section>
        <aside
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
          aria-label="Member card settings"
        >
          <div className="mb-5 flex items-center gap-2">
            <IdCard size={19} className="text-[var(--its-red)]" />
            <h2 className="text-lg font-bold">Card settings</h2>
          </div>
          <div className="border-b border-border pb-5">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="member-card-enabled"
                className="text-sm font-bold"
              >
                Enable public sharing
              </label>
              <Switch
                id="member-card-enabled"
                checked={draft.enabled}
                disabled={busy}
                onCheckedChange={enabled =>
                  setDraft(current => ({ ...current, enabled }))
                }
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Off by default. Turning it off and saving makes the existing QR
              and link unavailable.
            </p>
          </div>
          <fieldset disabled={busy} className="mt-5 space-y-4">
            <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              What your card shows
            </legend>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showName}
                onChange={e =>
                  setDraft(current => ({
                    ...current,
                    showName: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 accent-[var(--its-red)]"
              />
              <span>
                <span className="text-sm font-semibold">
                  Profile display name
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  If hidden, the card says “FacingFace member”.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showPhoto}
                onChange={e =>
                  setDraft(current => ({
                    ...current,
                    showPhoto: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4 accent-[var(--its-red)]"
              />
              <span>
                <span className="text-sm font-semibold">Profile photo</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Off initially. Initials are used instead.
                </span>
              </span>
            </label>
          </fieldset>
          <fieldset disabled={busy} className="mt-6">
            <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Card appearance
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["classic", "dark"] as const).map(appearance => (
                <label
                  key={appearance}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold ${draft.appearance === appearance ? "border-[var(--its-red)] bg-[var(--its-red)]/5" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="member-card-appearance"
                    value={appearance}
                    checked={draft.appearance === appearance}
                    onChange={() =>
                      setDraft(current => ({ ...current, appearance }))
                    }
                    className="accent-[var(--its-red)]"
                  />
                  {appearance === "classic" ? "Classic" : "Dark"}
                </label>
              ))}
            </div>
          </fieldset>
          <Button
            onClick={() => onSave(draft)}
            disabled={busy || (!dirty && !!data.card.memberNumber)}
            className="mt-6 w-full gap-2 bg-[var(--its-red)] text-white hover:opacity-90"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Save card settings
          </Button>
          {data.card.memberNumber && (
            <Button
              variant="outline"
              className="mt-3 w-full gap-2 bg-card"
              disabled={busy || dirty}
              onClick={() => {
                if (
                  window.confirm(
                    "Replace your sharing link? Existing QR codes and links will stop working. Download and share the updated card afterwards."
                  )
                )
                  void onReplace();
              }}
            >
              <RefreshCw size={14} />
              Replace QR / sharing link
            </Button>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            A replacement link does not change your member number or account.
            Saved images cannot be recalled, but their old link stops working.
          </p>
        </aside>
      </div>
    </div>
  );
}
