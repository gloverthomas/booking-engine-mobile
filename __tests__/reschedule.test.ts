import {
  initialDay,
  isMove,
  isSameInstant,
  manualTimes,
  moveLabel,
} from "@/lib/reschedule";

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

describe("manualTimes", () => {
  test("every 15 minutes from 6am to 9:45pm by default, in order", () => {
    const times = manualTimes("2026-11-25", ZONE);
    expect(times).toHaveLength(64);
    expect(times[0].label).toBe("6:00 am");
    expect(times[1].label).toBe("6:15 am");
    expect(times.at(-1)?.label).toBe("9:45 pm");
    // 6:00 am AEDT (UTC+11) is 19:00Z the day before.
    expect(times[0].start).toBe("2026-11-24T19:00:00.000Z");
  });

  test("respects the range and step", () => {
    const times = manualTimes("2026-11-25", ZONE, {
      fromMinute: 540,
      toMinute: 600,
      stepMin: 30,
    });
    expect(times.map((t) => t.label)).toEqual(["9:00 am", "9:30 am"]);
  });

  test("a day the clocks go forward has no invented or repeated times", () => {
    // 4 Oct 2026: 2:00 am becomes 3:00 am in Melbourne, so 2:00 to 2:45 do not exist.
    const labels = manualTimes("2026-10-04", ZONE, {
      fromMinute: 60,
      toMinute: 240,
    }).map((t) => t.label);
    expect(labels).toEqual([
      "1:00 am",
      "1:15 am",
      "1:30 am",
      "1:45 am",
      "3:00 am",
      "3:15 am",
      "3:30 am",
      "3:45 am",
    ]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("a day the clocks go back keeps each wall-clock time once", () => {
    // 4 Apr 2027: 3:00 am becomes 2:00 am, so 2:00 to 2:45 happen twice; we offer them once.
    const labels = manualTimes("2027-04-04", ZONE, {
      fromMinute: 60,
      toMinute: 240,
    }).map((t) => t.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("the times are valid, increasing instants", () => {
    const starts = manualTimes("2026-11-25", ZONE).map((t) =>
      Date.parse(t.start),
    );
    expect(starts.every((n) => Number.isFinite(n))).toBe(true);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});
