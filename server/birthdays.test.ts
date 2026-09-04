import { describe, expect, it } from "vitest";
import { getBirthdayDaysUntil, isValidBirthdayDayMonth } from "./db";

describe("Birthday day-and-month privacy helpers", () => {
  it("accepts only real calendar day and month values", () => {
    expect(isValidBirthdayDayMonth(31, 1)).toBe(true);
    expect(isValidBirthdayDayMonth(29, 2)).toBe(true);
    expect(isValidBirthdayDayMonth(31, 4)).toBe(false);
    expect(isValidBirthdayDayMonth(null, 7)).toBe(false);
  });

  it("calculates the next birthday using only the day and month", () => {
    const result = getBirthdayDaysUntil(16, 1, new Date(2026, 0, 15, 8, 30));
    expect(result.daysUntil).toBe(1);
    expect(result.nextBirthdayAt.getFullYear()).toBe(2026);
    expect(result.nextBirthdayAt.getMonth()).toBe(0);
    expect(result.nextBirthdayAt.getDate()).toBe(16);
  });

  it("moves an already-passed day-and-month occurrence to the next year", () => {
    const result = getBirthdayDaysUntil(1, 1, new Date(2026, 0, 2, 8, 30));
    expect(result.nextBirthdayAt.getFullYear()).toBe(2027);
    expect(result.nextBirthdayAt.getMonth()).toBe(0);
    expect(result.nextBirthdayAt.getDate()).toBe(1);
  });

  it("observes 29 February on 28 February in a non-leap year", () => {
    const result = getBirthdayDaysUntil(29, 2, new Date(2025, 0, 1, 8, 30));
    expect(result.nextBirthdayAt.getFullYear()).toBe(2025);
    expect(result.nextBirthdayAt.getMonth()).toBe(1);
    expect(result.nextBirthdayAt.getDate()).toBe(28);
  });
});
