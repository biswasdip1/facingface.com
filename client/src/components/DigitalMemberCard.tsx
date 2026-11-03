import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Globe2, LockKeyhole, ScanLine } from "lucide-react";
import { memberCardInitials, type MemberCardDisplay } from "@shared/memberCard";
import { FACINGFACE_MARK } from "./BrandMark";
import "./digital-member-card.css";

export default function DigitalMemberCard({
  card,
  origin = window.location.origin,
}: {
  card: MemberCardDisplay;
  origin?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const url = card.sharePath ? new URL(card.sharePath, origin).href : null;

  useEffect(() => {
    setPhotoFailed(false);
  }, [card.avatar]);
  useEffect(() => {
    let cancelled = false;
    setQr(null);
    if (url)
      QRCode.toDataURL(url, {
        width: 300,
        margin: 4,
        errorCorrectionLevel: "M",
        color: { dark: "#171717", light: "#ffffff" },
      })
        .then(value => {
          if (!cancelled) setQr(value);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <article
      className="ff-member-card"
      data-look={card.appearance}
      aria-label={`${card.displayName}'s FacingFace Digital Member Card`}
    >
      <header className="ff-member-card__header">
        <div className="ff-member-card__brand">
          <span className="ff-member-card__mark" aria-hidden="true">
            <img
              src={FACINGFACE_MARK}
              alt=""
              style={{ width: "100%", height: "100%", borderRadius: "12px" }}
            />
          </span>
          <div>
            <span className="ff-member-card__wordmark">
              facing<span>Face</span>
            </span>
            <span className="ff-member-card__motto">PEOPLE MEET PEOPLE</span>
          </div>
        </div>
        <span className="ff-member-card__kind">
          DIGITAL <br />
          MEMBER CARD
        </span>
      </header>
      <div className="ff-member-card__body">
        <div className="ff-member-card__identity">
          <div className="ff-member-card__avatar">
            {card.avatar && !photoFailed ? (
              <img
                src={card.avatar}
                alt="Chosen profile photo"
                onError={() => setPhotoFailed(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{memberCardInitials(card.displayName)}</span>
            )}
          </div>
          <div className="ff-member-card__details">
            <h2>{card.displayName}</h2>
            <span className="ff-member-card__number-label">MEMBER NUMBER</span>
            <strong className="ff-member-card__number">
              {card.memberNumber ?? "Assigned when you save"}
            </strong>
            <p>
              Connecting people <br />
              and communities.
            </p>
          </div>
        </div>
        <div className="ff-member-card__qr-section">
          <div className="ff-member-card__qr">
            {url && qr ? (
              <img
                src={qr}
                alt="Scan to open this member's FacingFace card"
                data-card-qr="ready"
              />
            ) : (
              <div className="ff-member-card__locked">
                {url ? <ScanLine size={38} /> : <LockKeyhole size={30} />}
                <span>{url ? "Preparing QR…" : "Private preview"}</span>
              </div>
            )}
          </div>
          <span className="ff-member-card__scan-label">
            {url ? "SCAN TO CONNECT" : "SHARING IS OFF"}
          </span>
        </div>
      </div>
      <footer className="ff-member-card__footer">
        <span className="ff-member-card__site">
          <Globe2 size={16} />
          facingface.com
        </span>
        <span className="ff-member-card__disclaimer">
          Social profile only · Not official identification
        </span>
      </footer>
    </article>
  );
}
