// hCaptcha server-side token verification
// Docs: https://docs.hcaptcha.com/#verify-the-user-response-server-side

const HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";

// hCaptcha test secret — always passes for the test sitekey (10000000-ffff-ffff-ffff-000000000001)
// In production, set HCAPTCHA_SECRET to your real secret from hcaptcha.com dashboard.
const TEST_SECRET = "0x0000000000000000000000000000000000000000";

export async function verifyHCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET ?? TEST_SECRET;

  // In development (no real secret configured), skip verification
  if (!process.env.HCAPTCHA_SECRET) {
    console.log("[hCaptcha] No HCAPTCHA_SECRET set — skipping verification in dev mode");
    return true;
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });
    const res = await fetch(HCAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      console.warn("[hCaptcha] Verification failed:", data["error-codes"]);
    }
    return data.success === true;
  } catch (err) {
    console.error("[hCaptcha] Verification request failed:", err);
    // Fail open in case of network error to avoid blocking legitimate users
    return true;
  }
}
