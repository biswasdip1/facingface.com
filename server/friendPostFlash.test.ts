import { describe, expect, it } from "vitest";
import { getFriendPostAlertRecipients } from "./callSignaling";

describe("friend post flash recipients", () => {
  it("includes only the other party from accepted friendship rows", () => {
    expect(getFriendPostAlertRecipients(10, [
      { userId1: 10, userId2: 20 },
      { userId1: 30, userId2: 10 },
    ]).sort((a, b) => a - b)).toEqual([20, 30]);
  });

  it("removes duplicate, invalid, and self recipients", () => {
    expect(getFriendPostAlertRecipients(10, [
      { userId1: 10, userId2: 20 },
      { userId1: 10, userId2: 20 },
      { userId1: 10, userId2: 10 },
      { userId1: 10, userId2: 0 },
      { userId1: 99, userId2: 98 },
    ])).toEqual([20]);
  });
});
