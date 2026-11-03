import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getInactiveReminderSummary: vi.fn(),
  getInactiveUsers: vi.fn(),
  hasRecentReminder: vi.fn(),
  recordInactiveUserReminder: vi.fn(),
  getEmailDeliveryConfig: vi.fn(),
  sendInactiveUserReminderEmail: vi.fn(),
}));

vi.mock("./db", () => ({
  INACTIVE_REMINDER_DAYS: 14,
  INACTIVE_REMINDER_REPEAT_DAYS: 30,
  getInactiveReminderSummary: mocks.getInactiveReminderSummary,
  getInactiveUsers: mocks.getInactiveUsers,
  hasRecentReminder: mocks.hasRecentReminder,
  recordInactiveUserReminder: mocks.recordInactiveUserReminder,
}));

vi.mock("./email", () => ({
  getEmailDeliveryConfig: mocks.getEmailDeliveryConfig,
  sendInactiveUserReminderEmail: mocks.sendInactiveUserReminderEmail,
}));

import { sendInactiveUserReminders } from "./inactiveUserReminder";

const summary = {
  inactiveUsers: 3,
  eligibleUsers: 1,
  remindersSentLast30Days: 2,
  latestReminderAt: null,
  batchLimit: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getInactiveReminderSummary.mockResolvedValue(summary);
  mocks.getInactiveUsers.mockResolvedValue([]);
  mocks.hasRecentReminder.mockResolvedValue(false);
  mocks.recordInactiveUserReminder.mockResolvedValue(undefined);
  mocks.getEmailDeliveryConfig.mockReturnValue({
    configured: true,
    provider: "smtp",
    from: '"FacingFace" <direct.letter@gmail.com>',
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
  });
});

describe("sendInactiveUserReminders", () => {
  it("does not pretend to send when production SMTP is not configured", async () => {
    mocks.getEmailDeliveryConfig.mockReturnValue({
      configured: false,
      provider: "development-test",
      from: '"FacingFace" <direct.letter@gmail.com>',
      host: null,
      port: 587,
      secure: false,
    });

    const result = await sendInactiveUserReminders();

    expect(result).toMatchObject({ emailConfigured: false, attempted: 0, sent: 0, failed: 1 });
    expect(result.errors[0]).toContain("SMTP is not configured");
    expect(mocks.getInactiveUsers).not.toHaveBeenCalled();
    expect(mocks.sendInactiveUserReminderEmail).not.toHaveBeenCalled();
  });

  it("records an activity-based reminder only after SMTP accepts it", async () => {
    const lastSeenAt = new Date("2026-07-01T12:00:00.000Z");
    mocks.getInactiveUsers.mockResolvedValue([{ id: 44, name: "Inactive Member", email: "member@example.com", lastSeenAt }]);
    mocks.sendInactiveUserReminderEmail.mockResolvedValue({
      messageId: "message-1",
      accepted: ["member@example.com"],
      rejected: [],
      from: '"FacingFace" <direct.letter@gmail.com>',
    });

    const result = await sendInactiveUserReminders();

    expect(mocks.sendInactiveUserReminderEmail).toHaveBeenCalledWith({ to: "member@example.com", name: "Inactive Member" });
    expect(mocks.recordInactiveUserReminder).toHaveBeenCalledWith(44, lastSeenAt);
    expect(result).toMatchObject({ attempted: 1, sent: 1, skipped: 0, failed: 0 });
  });

  it("skips a user whose repeat window changed after the candidate query", async () => {
    mocks.getInactiveUsers.mockResolvedValue([{ id: 45, name: "Recent Member", email: "recent@example.com", lastSeenAt: new Date() }]);
    mocks.hasRecentReminder.mockResolvedValue(true);

    const result = await sendInactiveUserReminders();

    expect(result).toMatchObject({ attempted: 0, sent: 0, skipped: 1, failed: 0 });
    expect(mocks.sendInactiveUserReminderEmail).not.toHaveBeenCalled();
  });

  it("does not record a reminder when SMTP rejects the recipient", async () => {
    mocks.getInactiveUsers.mockResolvedValue([{ id: 46, name: "Rejected Member", email: "rejected@example.com", lastSeenAt: new Date() }]);
    mocks.sendInactiveUserReminderEmail.mockResolvedValue({
      messageId: "message-2",
      accepted: [],
      rejected: ["rejected@example.com"],
      from: '"FacingFace" <direct.letter@gmail.com>',
    });

    const result = await sendInactiveUserReminders();

    expect(result).toMatchObject({ attempted: 1, sent: 0, failed: 1 });
    expect(mocks.recordInactiveUserReminder).not.toHaveBeenCalled();
  });
});
