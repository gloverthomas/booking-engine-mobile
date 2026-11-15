import { initialDay, isMove, isSameInstant, moveLabel } from "@/lib/reschedule";

const ZONE = "Australia/Melbourne";

describe("isSameInstant", () => {
  test("compares the moment, not the text", () => {
    expect(
      isSameInstant("2026-11-24T23:00:00.000Z", "2026-11-25T10:00:00+11:00"),
    ).toBe(true);
    expect(
      isSameInstant("2026-11-24T23:00:00Z", "2026-11-24T23:00:00.000Z"),
    ).toBe(true);
    expect(
      isSameInstant("2026-11-24T23:00:00.000Z", "2026-11-24T23:15:00.000Z"),
    ).toBe(false);
  });
});

describe("isMove", () => {
  const current = "2026-11-24T23:00:00.000Z";
  test("nothing chosen, or the same time, is not a move", () => {
    expect(isMove(current, null)).toBe(false);
    expect(isMove(current, "2026-11-25T10:00:00+11:00")).toBe(false);
  });
  test("a different time is", () => {
    expect(isMove(current, "2026-11-24T23:15:00.000Z")).toBe(true);
  });
});

describe("moveLabel", () => {
  test("says when, in the business's time zone", () => {
    const now = new Date("2026-11-24T02:30:00.000Z");
    expect(moveLabel("2026-11-25T03:30:00.000Z", ZONE, now)).toBe(
      "Move to Tomorrow, Wed 25 Nov at 2:30 pm",
    );
    expect(moveLabel("2026-11-30T23:00:00.000Z", ZONE, now)).toBe(
      "Move to Tuesday 1 December, Tue 1 Dec at 10:00 am",
    );
  });
});

describe("initialDay", () => {
  const days = [
    { date: "2026-11-24" },
    { date: "2026-11-25" },
    { date: "2026-11-26" },
  ];
  test("opens on the appointment's day when it is in the strip", () => {
    expect(initialDay("2026-11-25", days)).toBe("2026-11-25");
  });
  test("otherwise on the first day shown", () => {
    expect(initialDay("2027-01-01", days)).toBe("2026-11-24");
    expect(initialDay("2027-01-01", [])).toBe("2027-01-01");
  });
});
