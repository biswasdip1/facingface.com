import nodemailer from "nodemailer";

// Email helper
// Uses SMTP credentials from environment variables.
// Falls back to Ethereal (fake SMTP) in development when no SMTP HOST is set,
// so verification emails are captured at https://ethereal.email without any
// real mail server needed during local development.

let _transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (host && user && pass) {
    // Production SMTP (e.g., Gmail, SendGrid, Mailgun, etc.)
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  } else {
    // Development fallback = Ethereal (fake SMTP)
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  return _transporter;
}

export async function sendVerificationEmail(opts: {
  to: string;
  name: string;
  verificationLink: string;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM ?? '"FacingFace" <noreply@facingface.com>';

  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: "Verify your FacingFace email",
    text: `Hi ${opts.name},\n\nPlease verify your email by clicking this link:\n${opts.verificationLink}\n\nThanks,\nThe FacingFace Team`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="background:linear-gradient(135deg,#0a7ea4,#0a8fc4);padding:32px 40px;text-align:center;"><div style="display:inline-flex;align-items:center;gap:10px;"><div style="background:#0a7ea4;width:44px;height:44px;border-radius:8px;display:inline-block;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#fff;">FF</div><span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span></div></td></tr><tr><td style="padding:40px 40px 32px;"><h2 style="margin:0 0 12px;font-size:22px;color:#0a7ea4;">Verify Your Email</h2><p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;">Hi <strong>${opts.name}</strong>,</p><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;">Please verify your email address to complete your FacingFace registration.</p><div style="text-align:center;margin:20px 0;"><a href="${opts.verificationLink}" style="display:inline-block;background:#0a7ea4;color:#fff;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Verify Email</a></div><p style="margin:0;color:#8a8d91;font-size:13px;line-height:1.6;">This link expires in 24 hours.</p></td></tr><tr><td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Verification email preview URL:", previewUrl);
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  name: string;
  resetLink: string;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM ?? '"FacingFace" <noreply@facingface.com>';

  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: "Reset your FacingFace password",
    text: `Hi ${opts.name},\n\nClick this link to reset your password:\n${opts.resetLink}\n\nIf you didn't request this, ignore this email.\n\nThanks,\nThe FacingFace Team`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="background:linear-gradient(135deg,#0a7ea4,#0a8fc4);padding:32px 40px;text-align:center;"><div style="display:inline-flex;align-items:center;gap:10px;"><div style="background:#0a7ea4;width:44px;height:44px;border-radius:8px;display:inline-block;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#fff;">FF</div><span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span></div></td></tr><tr><td style="padding:40px 40px 32px;"><h2 style="margin:0 0 12px;font-size:22px;color:#0a7ea4;">Reset Your Password</h2><p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;">Hi <strong>${opts.name}</strong>,</p><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;">We received a request to reset your password.</p><div style="text-align:center;margin:20px 0;"><a href="${opts.resetLink}" style="display:inline-block;background:#0a7ea4;color:#fff;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Reset Password</a></div><p style="margin:0;color:#8a8d91;font-size:13px;line-height:1.6;">This link expires in 1 hour. If you didn't request this, ignore this email.</p></td></tr><tr><td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Password reset preview URL:", previewUrl);
  }
}

export async function sendSupportNotificationEmail(opts: {
  adminEmail: string;
  reporterName: string;
  reporterEmail: string;
  subject: string;
  message: string;
}): Promise<void> {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM ?? '"FacingFace" <noreply@facingface.com>';

  const info = await transporter.sendMail({
    from,
    to: opts.adminEmail,
    subject: `[Support] ${opts.subject}`,
    text: `New support message from ${opts.reporterName} (${opts.reporterEmail}):\n\n${opts.message}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="padding:40px 40px 32px;"><h2 style="margin:0 0 12px;font-size:22px;color:#0a7ea4;">New Support Message</h2><p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;"><strong>From:</strong> ${opts.reporterName}</p><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;"><strong>Email:</strong> ${opts.reporterEmail}</p><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;"><strong>Subject:</strong> ${opts.subject}</p><div style="background:#f7f8fa;border:1px solid #e4e6ea;border-radius:8px;padding:14px 20px;margin-bottom:20px;"><p style="margin:0;color:#4b4f56;font-size:14px;line-height:1.6;">${opts.message}</p></div></td></tr><tr><td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
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
  const from = process.env.SMTP_FROM ?? '"FacingFace" <noreply@facingface.com>';
  const retryMinutes = Math.ceil(opts.retryAfterSeconds / 60);

  const info = await transporter.sendMail({
    from,
    to: opts.to,
    subject: "FacingFace: Unusual login activity detected",
    text: `Hi ${opts.name},\n\nWe noticed multiple failed login attempts on your FacingFace account from IP address ${opts.ipAddress}.\n\nFor security, login attempts from this IP have been temporarily blocked. You can try again in ${retryMinutes} minute${retryMinutes !== 1 ? "s" : ""}.\n\nIf this was NOT you, change your password immediately at https://facingface.com/forgot-password\n\nThanks,\nThe FacingFace Security Team`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="background:linear-gradient(135deg,#7f0000,#c0392b);padding:32px 40px;text-align:center;"><div style="display:inline-flex;align-items:center;gap:10px;"><div style="background:#e63329;width:44px;height:44px;border-radius:8px;display:inline-block;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#fff;">FF</div><span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;">FacingFace</span></div></td></tr><tr><td style="padding:40px 40px 32px;"><h2 style="margin:0 0 12px;font-size:22px;color:#c0392b;">Unusual Login Activity</h2><p style="margin:0 0 8px;color:#4b4f56;font-size:15px;line-height:1.6;">Hi <strong>${opts.name}</strong>,</p><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;">We detected multiple failed login attempts on your account from:</p><div style="background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center;"><span style="font-family:monospace;font-size:16px;font-weight:700;color:#c0392b;">${opts.ipAddress}</span></div><p style="margin:0 0 20px;color:#4b4f56;font-size:15px;line-height:1.6;">Login attempts from this IP are blocked for <strong>${retryMinutes} minute${retryMinutes !== 1 ? "s" : ""}</strong>.</p><div style="text-align:center;margin:20px 0;"><a href="https://facingface.com/forgot-password" style="display:inline-block;background:#c0392b;color:#fff;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Reset My Password</a></div><p style="margin:0;color:#8a8d91;font-size:13px;line-height:1.6;">If this was you, wait ${retryMinutes} minute${retryMinutes !== 1 ? "s" : ""} and try again.</p></td></tr><tr><td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
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
  const from = process.env.SMTP_FROM ?? '"FacingFace" <noreply@facingface.com>';
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
    text: `Report from ${opts.reporterName} (${opts.reporterEmail})\n\nType: ${opts.contentType}\nID: ${opts.contentId}\nReason: ${reasonLabel}\nReported User: ${opts.reportedUserName}\n\nDescription: ${opts.description || "N/A"}\n\nPreview: ${opts.contentPreview || "N/A"}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 0;"><tr><td align="center"><table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);"><tr><td style="padding:40px 40px 32px;"><h2 style="margin:0 0 12px;font-size:22px;color:#c0392b;">New Report</h2><p><strong>Reporter:</strong> ${opts.reporterName} (${opts.reporterEmail})</p><p><strong>Type:</strong> ${opts.contentType}</p><p><strong>ID:</strong> ${opts.contentId}</p><p><strong>Reason:</strong> ${reasonLabel}</p><p><strong>Reported User:</strong> ${opts.reportedUserName}</p><p><strong>Description:</strong> ${opts.description || "N/A"}</p><p><strong>Preview:</strong> ${opts.contentPreview || "N/A"}</p></td></tr><tr><td style="background:#f7f8fa;padding:20px 40px;text-align:center;border-top:1px solid #e4e6ea;"><p style="margin:0;color:#bec3c9;font-size:12px;">© 2026 FacingFace. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Email] Report preview URL:", previewUrl);
  }
}
