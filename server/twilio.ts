import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpSms(toPhone: string, otp: string): Promise<void> {
  if (!accountSid || !authToken || !fromPhone) {
    throw new Error("Twilio credentials not configured");
  }
  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body: `Your FacingFace verification code is: ${otp}. It expires in 10 minutes.`,
    from: fromPhone,
    to: toPhone,
  });
}

export async function validateTwilioCredentials(): Promise<boolean> {
  if (!accountSid || !authToken) return false;
  try {
    const client = twilio(accountSid, authToken);
    await client.api.accounts(accountSid).fetch();
    return true;
  } catch {
    return false;
  }
}
