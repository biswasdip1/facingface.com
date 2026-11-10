type PasskeyEnvironment = Partial<Record<"NODE_ENV" | "PUBLIC_APP_URL" | "WEBAUTHN_RP_ID" | "WEBAUTHN_ORIGINS", string>>;

/** OAuth hosts and caller-provided URLs are not WebAuthn relying parties. */
export function getPasskeyConfig(env: PasskeyEnvironment = process.env) {
  const production = env.NODE_ENV === "production";
  const appUrl = new URL(env.PUBLIC_APP_URL || (production ? "https://www.facingface.com" : "http://localhost:3000"));
  const rpID = env.WEBAUTHN_RP_ID || appUrl.hostname.replace(/^www\./, "");
  if (!rpID || rpID.includes(":") || rpID.includes("/") || (production && rpID === "localhost")) {
    throw new Error("Invalid passkey relying-party ID.");
  }
  const defaultOrigins = rpID === "facingface.com"
    ? ["https://facingface.com", "https://www.facingface.com"]
    : [appUrl.origin];
  const expectedOrigin = env.WEBAUTHN_ORIGINS
    ? env.WEBAUTHN_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
    : defaultOrigins;
  if (expectedOrigin.length === 0) throw new Error("Passkey origins are required.");
  for (const origin of expectedOrigin) {
    const url = new URL(origin);
    const localHttp = !production && rpID === "localhost" && url.hostname === "localhost" && url.protocol === "http:";
    if (url.origin !== origin || url.username || url.password || (url.protocol !== "https:" && !localHttp) ||
        !(url.hostname === rpID || url.hostname.endsWith(`.${rpID}`))) {
      throw new Error("Passkey origin must be an HTTPS origin within the relying-party domain.");
    }
  }
  return { rpID, expectedOrigin };
}
