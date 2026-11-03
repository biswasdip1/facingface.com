import { afterEach, describe, expect, it } from "vitest";
import { getEmailDeliveryConfig } from "./email";

const original = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
};

function restore(name: keyof typeof original, value: string | undefined) {
  const key = `SMTP_${name.toUpperCase() === "HOST" ? "HOST" : name.toUpperCase() === "PORT" ? "PORT" : name.toUpperCase() === "SECURE" ? "SECURE" : name.toUpperCase() === "USER" ? "USER" : name.toUpperCase() === "PASS" ? "PASS" : "FROM"}`;
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  restore("host", original.host);
  restore("port", original.port);
  restore("secure", original.secure);
  restore("user", original.user);
  restore("pass", original.pass);
  restore("from", original.from);
});

describe("getEmailDeliveryConfig", () => {
  it("uses direct.letter@gmail.com as the default FacingFace sender when Gmail SMTP authenticates as that account", () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "direct.letter@gmail.com";
    process.env.SMTP_PASS = "a-16-character-app-password";
    delete process.env.SMTP_FROM;

    expect(getEmailDeliveryConfig()).toMatchObject({
      configured: true,
      provider: "smtp",
      from: '"FacingFace" <direct.letter@gmail.com>',
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
    });
  });

  it("uses an explicitly configured sender display address", () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "direct.letter@gmail.com";
    process.env.SMTP_PASS = "a-16-character-app-password";
    process.env.SMTP_FROM = '"FacingFace" <direct.letter@gmail.com>';

    expect(getEmailDeliveryConfig().from).toBe('"FacingFace" <direct.letter@gmail.com>');
  });

  it("reports unconfigured delivery when SMTP credentials are incomplete", () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "direct.letter@gmail.com";
    delete process.env.SMTP_PASS;

    expect(getEmailDeliveryConfig().configured).toBe(false);
  });
});
