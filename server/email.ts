import nodemailer from "nodemailer";

// ─── Email helper ─────────────────────────────────────────────────────────────
// Uses SMTP credentials from environment variables.
// Falls back to Ethereal (fake SMTP) in development when no SMTP_HOST is set,
// so verification emails are captured at https://ethereal.email without any
// real mail server needed during local development.

let _transporter: nodemailer.Transporter | null = null;

export type EmailDeliveryConfig = {
  configured: boolean;
  provider: "smtp" | "development-test";
  from: string;
  host: string | null;
  port: number;
  secure: boolean;
};

function getConfiguredFromAddress(): string {
  const explicitlyConfigured = process.env.SMTP_FROM?.trim();
  if (explicitlyConfigured) return explicitlyConfigured;

  const smtpUser = process.env.SMTP_USER?.trim();
  // When Gmail is configured as SMTP_USER, Gmail requires the From address to
  // match that authenticated account unless a verified alias is configured.
  if (smtpUser) return `"FacingFace" <${smtpUser}>`;

  return '"FacingFace" <noreply@facingface.com>';
}

export function getEmailDeliveryConfig(): EmailDeliveryConfig {
  const host = process.env.SMTP_HOST?.trim() || null;
  const user = process.env.SMTP_USER?.trim() || null;
  const pass = process.env.SMTP_PASS?.trim() || null;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const configured = Boolean(host && user && pass && Number.isInteger(port) && port > 0);

  return {
    configured,
    provider: configured ? "smtp" : "development-test",
    from: getConfiguredFromAddress(),
    host,
    port,
    secure,
  };
}

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter) return _transporter;

  const config = getEmailDeliveryConfig();
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (config.configured && config.host && user && pass) {
    _transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user, pass },
    });
    return _transporter;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Production email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, and SMTP_FROM in Render before sending email.",
    );
  }

  // Local development only: do not silently send test messages in production.
  const testAccount = await nodemailer.createTestAccount();
  _transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log("[Email] Using local Ethereal test account:", testAccount.user);
  return _transporter;
}

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  verifyUrl: string;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = getConfiguredFromAddress();

  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: "Verify your FacingFace email address",
    text: `Hi ${opts.name},\n\nPlease verify your email address by visiting the link below:\n\n${opts.verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create a FacingFace account, you can safely ignore this email.\n\nThanks,\nThe FacingFace Team`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a5c,#1877f2);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="background:#e63329;width:44px;height:44px;border-radius:8px;display:inline-block;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#fff;">FF</div>
              <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span>
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 12px;font-size:22px;color:#1c1e21;">Verify your email address</h2>
            <p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;">Hi <strong>${opts.name}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b4f56;font-size:15px;line-height:1.6;">
              Thanks for signing up! Please click the button below to verify your email address and activate your account.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${opts.verifyUrl}"
                 style="display:inline-block;background:#1877f2;color:#fff;font-weight:700;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;">
                Verify Email Address
              </a>
            </div>
            <p style="margin:0 0 8px;color:#8a8d91;font-size:13px;line-height:1.6;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#1877f2;">${opts.verifyUrl}</p>
            <p style="margin:0;color:#8a8d91;font-size:13px;line-height:1.6;">
              This link expires in <strong>24 hours</strong>. If you did not create a FacingFace account, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;">
            <p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  // In development, log the Ethereal preview URL so devs can see the email
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Preview URL:", previewUrl);
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = getConfiguredFromAddress();
  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: "Reset your FacingFace password",
    text: `Hi ${opts.name},\n\nYou requested a password reset. Visit the link below to set a new password:\n\n${opts.resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, you can safely ignore this email.\n\nThanks,\nThe FacingFace Team`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a5c,#1877f2);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="background:#e63329;width:44px;height:44px;border-radius:8px;display:inline-block;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#fff;">FF</div>
              <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 12px;font-size:22px;color:#1c1e21;">Reset your password</h2>
            <p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;">Hi <strong>${opts.name}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b4f56;font-size:15px;line-height:1.6;">
              We received a request to reset your FacingFace password. Click the button below to choose a new password.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${opts.resetUrl}"
                 style="display:inline-block;background:#e63329;color:#fff;font-weight:700;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;">
                Reset Password
              </a>
            </div>
            <p style="margin:0 0 8px;color:#8a8d91;font-size:13px;line-height:1.6;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#1877f2;">${opts.resetUrl}</p>
            <p style="margin:0;color:#8a8d91;font-size:13px;line-height:1.6;">
              This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;">
            <p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Password reset preview URL:", previewUrl);
  }
}

export async function sendSupportMessageEmail(opts: {
  adminEmail: string;
  adminName: string;
  senderName: string;
  senderEmail: string;
  topic: string;
  message: string;
  phone?: string | null;
  whatsapp?: string | null;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = getConfiguredFromAddress();
  const info = await transporter.sendMail({
    from,
    to: opts.adminEmail,
    subject: `[FacingFace Support] New message: ${opts.topic}`,
    text: `Hi ${opts.adminName},\n\nA new support message has been submitted.\n\nFrom: ${opts.senderName} (${opts.senderEmail})\nTopic: ${opts.topic}\nMessage:\n${opts.message}\n${opts.phone ? `Phone: ${opts.phone}\n` : ""}${opts.whatsapp ? `WhatsApp: ${opts.whatsapp}\n` : ""}\nLog in to FacingFace to view and reply.\n\nThanks,\nFacingFace Support System`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="background:linear-gradient(135deg,#1a3a5c,#1877f2);padding:28px 40px;text-align:center;"><span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace Support</span></td></tr><tr><td style="padding:36px 40px 28px;"><h2 style="margin:0 0 8px;font-size:20px;color:#1c1e21;">New Support Message</h2><p style="margin:0 0 20px;color:#4b4f56;font-size:14px;">Hi <strong>${opts.adminName}</strong>, a user has submitted a support request.</p><table width="100%" cellpadding="8" cellspacing="0" style="background:#f7f8fa;border-radius:8px;margin-bottom:20px;"><tr><td style="color:#8a8d91;font-size:13px;width:90px;">From</td><td style="color:#1c1e21;font-size:13px;font-weight:600;">${opts.senderName} &lt;${opts.senderEmail}&gt;</td></tr><tr><td style="color:#8a8d91;font-size:13px;">Topic</td><td><span style="background:#1877f2;color:#fff;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;">${opts.topic}</span></td></tr>${opts.phone ? `<tr><td style="color:#8a8d91;font-size:13px;">Phone</td><td style="color:#1c1e21;font-size:13px;">${opts.phone}</td></tr>` : ""}${opts.whatsapp ? `<tr><td style="color:#8a8d91;font-size:13px;">WhatsApp</td><td style="color:#1c1e21;font-size:13px;">${opts.whatsapp}</td></tr>` : ""}</table><p style="margin:0 0 8px;color:#4b4f56;font-size:13px;font-weight:600;">Message:</p><div style="background:#f0f2f5;border-left:3px solid #1877f2;padding:14px 16px;border-radius:0 6px 6px 0;color:#1c1e21;font-size:14px;line-height:1.7;white-space:pre-wrap;">${opts.message}</div><div style="text-align:center;margin-top:28px;"><a href="https://facingface-com.manus.space/contact-support" style="display:inline-block;background:#1877f2;color:#fff;font-weight:700;font-size:15px;padding:12px 32px;border-radius:8px;text-decoration:none;">View &amp; Reply in Admin Inbox</a></div></td></tr><tr><td style="background:#f7f8fa;padding:16px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Support notification preview URL:", previewUrl);
  }
}

export async function sendLoginLockoutEmail(opts: {
  to: string;
  name: string;
  ipAddress: string;
  retryAfterSeconds: number;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = getConfiguredFromAddress();
  const retryMinutes = Math.ceil(opts.retryAfterSeconds / 60);
  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: "FacingFace: Unusual login activity detected",
    text: `Hi ${opts.name},\n\nWe noticed multiple failed login attempts on your FacingFace account from IP address ${opts.ipAddress}.\n\nFor security, login attempts from this IP have been temporarily blocked. You can try again in ${retryMinutes} minute${retryMinutes !== 1 ? "s" : ""}.\n\nIf this was NOT you, change your password immediately at https://facingface-com.manus.space/forgot-password\n\nThanks,\nThe FacingFace Security Team`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="background:linear-gradient(135deg,#7f0000,#c0392b);padding:32px 40px;text-align:center;"><div style="display:inline-flex;align-items:center;gap:10px;"><div style="background:#e63329;width:44px;height:44px;border-radius:8px;display:inline-block;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#fff;">FF</div><span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span></div></td></tr><tr><td style="padding:40px 40px 32px;"><h2 style="margin:0 0 12px;font-size:22px;color:#c0392b;">&#9888;&#65039; Unusual Login Activity</h2><p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;">Hi <strong>${opts.name}</strong>,</p><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;">We detected multiple failed login attempts on your account from:</p><div style="background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center;"><span style="font-family:monospace;font-size:16px;font-weight:700;color:#c0392b;">${opts.ipAddress}</span></div><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;">Login attempts from this IP are blocked for <strong>${retryMinutes} minute${retryMinutes !== 1 ? "s" : ""}</strong>.</p><div style="text-align:center;margin:20px 0;"><a href="https://facingface-com.manus.space/forgot-password" style="display:inline-block;background:#c0392b;color:#fff;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Reset My Password</a></div><p style="margin:0;color:#8a8d91;font-size:13px;line-height:1.6;">If this was you, wait ${retryMinutes} minute${retryMinutes !== 1 ? "s" : ""} and try again.</p></td></tr><tr><td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">&#169; 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Login lockout preview URL:", previewUrl);
  }
}

export async function sendReportEmail(opts: {
  reporterName: string;
  reporterEmail: string;
  contentType: "post" | "comment";
  contentId: number;
  reason: string;
  description?: string;
  reportedUserName: string;
  contentPreview?: string;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = getConfiguredFromAddress();
  const adminEmail = "direct.letter@gmail.com";

  const reasonLabels: Record<string, string> = {
    spam: "Spam",
    harassment: "Harassment",
    misinformation: "Misinformation",
    nudity_sexual: "Nudity / Sexual Content",
    violence: "Violence",
    hate_speech: "Hate Speech",
    other: "Other",
  };
  const reasonLabel = reasonLabels[opts.reason] ?? opts.reason;
  const subject = `[FacingFace Report] ${opts.contentType === "post" ? "Post" : "Comment"} reported — ${reasonLabel}`;

  const info = await transporter.sendMail({
    from,
    to: adminEmail,
    subject,
    text: `New ${opts.contentType} report on FacingFace\n\nReporter: ${opts.reporterName} (${opts.reporterEmail})\nReported user: ${opts.reportedUserName}\nContent type: ${opts.contentType}\nContent ID: ${opts.contentId}\nReason: ${reasonLabel}\n${opts.description ? `Description: ${opts.description}\n` : ""}${opts.contentPreview ? `Content preview: ${opts.contentPreview}\n` : ""}\nReview in admin panel: https://www.facingface.com/admin`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="background:linear-gradient(135deg,#7f0000,#c0392b);padding:28px 40px;text-align:center;"><div style="display:inline-flex;align-items:center;gap:10px;"><div style="background:#e63329;width:40px;height:40px;border-radius:8px;display:inline-block;text-align:center;line-height:40px;font-weight:900;font-size:15px;color:#fff;">FF</div><span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span></div><p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Content Report Notification</p></td></tr><tr><td style="padding:32px 40px;"><h2 style="margin:0 0 16px;font-size:20px;color:#c0392b;">&#9888; New ${opts.contentType === "post" ? "Post" : "Comment"} Report</h2><table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;color:#8a8d91;font-size:13px;width:140px;">Reporter</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;color:#1c1e21;font-size:13px;"><strong>${opts.reporterName}</strong> (${opts.reporterEmail})</td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;color:#8a8d91;font-size:13px;">Reported User</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;color:#1c1e21;font-size:13px;"><strong>${opts.reportedUserName}</strong></td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;color:#8a8d91;font-size:13px;">Content Type</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;color:#1c1e21;font-size:13px;">${opts.contentType === "post" ? "Post" : "Comment"} #${opts.contentId}</td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;color:#8a8d91;font-size:13px;">Reason</td><td style="padding:8px 0;border-bottom:1px solid #f0f2f5;"><span style="background:#c0392b;color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;">${reasonLabel}</span></td></tr>${opts.description ? `<tr><td style="padding:8px 0;color:#8a8d91;font-size:13px;vertical-align:top;">Description</td><td style="padding:8px 0;color:#4b4f56;font-size:13px;line-height:1.6;">${opts.description}</td></tr>` : ""}</table>${opts.contentPreview ? `<div style="margin-top:20px;background:#f7f8fa;border-left:3px solid #c0392b;padding:12px 16px;border-radius:0 6px 6px 0;color:#4b4f56;font-size:13px;line-height:1.6;"><strong>Content preview:</strong><br>${opts.contentPreview}</div>` : ""}<div style="text-align:center;margin-top:28px;"><a href="https://www.facingface.com/admin" style="display:inline-block;background:#c0392b;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Review in Admin Panel</a></div></td></tr><tr><td style="background:#f7f8fa;padding:16px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Report notification preview URL:", previewUrl);
  }
}


export type EmailDeliveryReceipt = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  from: string;
};

function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sends an administrator's written response to the member who submitted a report. */
export async function sendReportResponseEmail(opts: {
  to: string;
  reporterName: string | null;
  message: string;
  reportId: number;
}): Promise<EmailDeliveryReceipt> {
  const transporter = await getTransporter();
  const from = getConfiguredFromAddress();
  const siteUrl = (process.env.PUBLIC_APP_URL ?? "https://www.facingface.com").replace(/\/+$/, "");
  const recipientName = opts.reporterName?.trim() || "there";
  const responseText = opts.message.trim();
  const safeName = escapeEmailHtml(recipientName);
  const safeResponse = escapeEmailHtml(responseText).replace(/\n/g, "<br>");
  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: "FacingFace: update on your content report",
    text: `Hi ${recipientName},\n\nA FacingFace administrator has responded to your report (#${opts.reportId}):\n\n${responseText}\n\nVisit FacingFace: ${siteUrl}\n\nThanks,\nThe FacingFace Team`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#f0f2f5;"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;"><tr><td style="padding:24px 32px;background:#1a3a5c;color:#ffffff;font-weight:700;font-size:22px;">FacingFace</td></tr><tr><td style="padding:32px;color:#1c1e21;font-size:15px;line-height:1.6;"><p style="margin:0 0 16px;">Hi <strong>${safeName}</strong>,</p><p style="margin:0 0 16px;">A FacingFace administrator has responded to your content report.</p><div style="margin:20px 0;padding:16px;border-left:4px solid #1877f2;background:#f7f8fa;white-space:normal;">${safeResponse}</div><p style="margin:24px 0 0;"><a href="${siteUrl}" style="display:inline-block;padding:11px 20px;background:#1877f2;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">Open FacingFace</a></p></td></tr></table></td></tr></table></body></html>`,
  });
  return {
    messageId: info.messageId,
    accepted: info.accepted.map(String),
    rejected: info.rejected.map(String),
    from,
  };
}

export async function sendInactiveUserReminderEmail(opts: {
  to: string;
  name: string;
  isTest?: boolean;
}): Promise<EmailDeliveryReceipt> {
  const transporter = await getTransporter();
  const from = getConfiguredFromAddress();
  const siteUrl = (process.env.PUBLIC_APP_URL ?? "https://www.facingface.com").replace(/\/+$/, "");
  const greeting = opts.isTest ? "This is a test of the FacingFace reminder-email service." : "We noticed you haven't been active on FacingFace for a while. We'd love to see you back!";
  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.isTest ? "FacingFace reminder email test" : "We miss you! Come back to FacingFace",
    text: `Hi ${opts.name},\n\n${greeting}\n\nVisit FacingFace to catch up with friends, share updates, and stay connected.\n\n${siteUrl}\n\nThanks,\nThe FacingFace Team`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a5c,#1877f2);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="background:#e63329;width:44px;height:44px;border-radius:8px;display:inline-block;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#fff;">FF</div>
              <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span>
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 12px;font-size:22px;color:#1c1e21;">We miss you!</h2>
            <p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;">Hi <strong>${opts.name}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b4f56;font-size:15px;line-height:1.6;">
              ${opts.isTest ? "This is a test of the FacingFace reminder-email service. If you can read this message, the sender configuration is working." : "We noticed you haven't been active on FacingFace for a while. Your friends are sharing updates, and we'd love to see you back in the community!"}
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${siteUrl}"
                 style="display:inline-block;background:#1877f2;color:#fff;font-weight:700;font-size:16px;padding:14px 36px;border-radius:8px;text-decoration:none;">
                Come Back to FacingFace
              </a>
            </div>
            <p style="margin:0;color:#8a8d91;font-size:13px;line-height:1.6;">
              Stay connected with friends, share your moments, and be part of the FacingFace community.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;">
            <p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Inactive user reminder preview URL:", previewUrl);
  }

  return {
    messageId: info.messageId,
    accepted: info.accepted.map(String),
    rejected: info.rejected.map(String),
    from,
  };
}
