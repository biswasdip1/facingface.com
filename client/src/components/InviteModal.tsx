import { useState } from "react";
import { Copy, Mail, Share2, Link2, Users, X, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "user" | "group" | "event"; // Type of entity being invited to
  targetName: string; // Name of user/group/event
  targetId: number; // ID of the entity
}

export default function InviteModal({
  isOpen,
  onClose,
  targetType,
  targetName,
  targetId,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<"link" | "message" | "email">("link");

  // Generate invite link based on type
  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    switch (targetType) {
      case "user":
        return `${baseUrl}/profile/${targetId}?invite=true`;
      case "group":
        return `${baseUrl}/groups/${targetId}?invite=true`;
      case "event":
        return `${baseUrl}/events/${targetId}?invite=true`;
      default:
        return baseUrl;
    }
  };

  const inviteLink = generateInviteLink();
  const inviteCode = `FF${targetType.toUpperCase()}${targetId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied!");
  };

  const shareViaMessage = () => {
    const message = `Join me on FacingFace! ${inviteLink}`;
    window.location.href = `/messages?share=${encodeURIComponent(message)}`;
    onClose();
  };

  const shareViaEmail = () => {
    const subject = `Join me on FacingFace - ${targetName}`;
    const body = `I'd like to invite you to join me on FacingFace!\n\n${targetName}\n\nClick here to join: ${inviteLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareToSocial = () => {
    const text = `Check out this on FacingFace: ${targetName}`;
    const url = inviteLink;

    // Try to use Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: "FacingFace Invite",
          text: text,
          url: url,
        })
        .catch((err) => console.log("Error sharing:", err));
    } else {
      // Fallback: copy to clipboard
      copyToClipboard();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        style={{
          backgroundColor: "var(--its-surface)",
          color: "var(--its-text-primary)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--its-border)" }}
        >
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users size={20} />
            Invite to {targetName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-opacity-10 rounded"
            style={{ color: "var(--its-text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invite Link Section */}
          <div>
            <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color: "var(--its-text-muted)" }}>
              Share Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded"
                style={{
                  borderColor: "var(--its-border)",
                  backgroundColor: "var(--its-surface-alt)",
                  color: "var(--its-text-primary)",
                }}
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 border rounded font-bold text-xs tracking-widest uppercase transition-all flex items-center gap-1"
                style={{
                  borderColor: "var(--its-text-primary)",
                  color: copied ? "var(--its-surface)" : "var(--its-text-primary)",
                  backgroundColor: copied ? "var(--its-text-primary)" : "transparent",
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Invite Code Section */}
          <div>
            <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color: "var(--its-text-muted)" }}>
              Invite Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded font-mono"
                style={{
                  borderColor: "var(--its-border)",
                  backgroundColor: "var(--its-surface-alt)",
                  color: "var(--its-text-primary)",
                }}
              />
              <button
                onClick={copyInviteCode}
                className="px-3 py-2 border rounded font-bold text-xs tracking-widest uppercase transition-all"
                style={{
                  borderColor: "var(--its-text-primary)",
                  color: "var(--its-text-primary)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-text-primary)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--its-surface)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--its-text-primary)";
                }}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          {/* Share Methods */}
          <div>
            <label className="text-xs font-bold tracking-widest uppercase mb-3 block" style={{ color: "var(--its-text-muted)" }}>
              Share Via
            </label>
            <div className="space-y-2">
              {/* Share via Direct Message */}
              <button
                onClick={shareViaMessage}
                className="w-full px-4 py-3 border rounded text-left font-bold text-sm tracking-widest uppercase transition-all flex items-center gap-3"
                style={{
                  borderColor: "var(--its-border)",
                  color: "var(--its-text-primary)",
                  backgroundColor: "var(--its-surface-alt)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-surface-alt)";
                }}
              >
                <MessageCircle size={18} />
                <span>Send Direct Message</span>
              </button>

              {/* Share via Email */}
              <button
                onClick={shareViaEmail}
                className="w-full px-4 py-3 border rounded text-left font-bold text-sm tracking-widest uppercase transition-all flex items-center gap-3"
                style={{
                  borderColor: "var(--its-border)",
                  color: "var(--its-text-primary)",
                  backgroundColor: "var(--its-surface-alt)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-surface-alt)";
                }}
              >
                <Mail size={18} />
                <span>Send Email Invite</span>
              </button>

              {/* Share to Social */}
              <button
                onClick={shareToSocial}
                className="w-full px-4 py-3 border rounded text-left font-bold text-sm tracking-widest uppercase transition-all flex items-center gap-3"
                style={{
                  borderColor: "var(--its-border)",
                  color: "var(--its-text-primary)",
                  backgroundColor: "var(--its-surface-alt)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-surface-alt)";
                }}
              >
                <Share2 size={18} />
                <span>Share to Social Media</span>
              </button>
            </div>
          </div>

          {/* Info Text */}
          <div
            className="p-3 rounded text-xs"
            style={{
              backgroundColor: "var(--its-surface-alt)",
              color: "var(--its-text-muted)",
            }}
          >
            Share the invite link or code with friends. They can join by clicking the link or entering the code.
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 p-4 border-t"
          style={{ borderColor: "var(--its-border)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded font-bold text-sm tracking-widest uppercase transition-all"
            style={{
              borderColor: "var(--its-text-primary)",
              color: "var(--its-text-primary)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-text-primary)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--its-surface)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--its-text-primary)";
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
