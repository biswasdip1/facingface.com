// TOTP 2FA helper using otpauth library
// Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import crypto from "crypto";

const APP_NAME = process.env.VITE_APP_TITLE ?? "FacingFace";

/** Generate a new TOTP secret (base32 encoded, 20 bytes = 160 bits) */
export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/** Build an otpauth:// URI for QR code scanning */
export function buildTotpUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/** Generate a QR code as a base64 data URL */
export async function generateQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { width: 200, margin: 2 });
}

/** Verify a 6-digit TOTP code (allows ±1 window for clock drift) */
export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
  return delta !== null;
}

/** Generate 8 single-use backup codes */
export function generateBackupCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
    plain.push(code);
    hashed.push(crypto.createHash("sha256").update(code).digest("hex"));
  }
  return { plain, hashed };
}

/** Verify and consume a backup code (returns remaining hashed codes or null if invalid) */
export function consumeBackupCode(
  hashedCodes: string[],
  inputCode: string
): string[] | null {
  const inputHash = crypto
    .createHash("sha256")
    .update(inputCode.replace(/\s/g, "").toUpperCase())
    .digest("hex");
  const idx = hashedCodes.indexOf(inputHash);
  if (idx === -1) return null;
  const remaining = [...hashedCodes];
  remaining.splice(idx, 1);
  return remaining;
}
