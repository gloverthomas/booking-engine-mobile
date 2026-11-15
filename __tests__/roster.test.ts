import type { RosterDay } from "@/lib/api/schemas";
import {
  dayName,
  describeDay,
  elapsedMinutes,
  formatElapsed,
  formatMinute,
  formatRange,
  shiftWeek,
  weekLabel,
} from "@/lib/roster";

const day = (overrides: Partial<RosterDay> = {}): RosterDay => ({
  date: "2026-11-02",
  entries: [],
  off: null,
  ...overrides,
});

describe("formatMinute", () => {
  test.each([
    [0, "12am"],
    [540, "9am"],
    [570, "9:30am"],
    [720, "12pm"],
    [735, "12:15pm"],
    [1020, "5pm"],
    [1439, "11:59pm"],
    [1440, "12am"],
  ])("%i is %s", (minute, text) => expect(formatMinute(minute)).toBe(text));

  test("a range reads naturally", () => {
    expect(formatRange({ startMinute: 540, endMinute: 1020 })).toBe(
      "9am – 5pm",
    );
  });
});

describe("describeDay", () => {
  const weekly = (
    ranges: Array<[number, number]>,
    locationName = "Northcote",
    kind: "weekly" | "custom" = "weekly",
  ) => ({
    locationId: "L",
    locationName,
    kind,
    ranges: ranges.map(([startMinute, endMinute]) => ({
      startMinute,
      endMinute,
    })),
  });

  test("a working day shows the hours; split shifts are joined", () => {
    expect(
      describeDay(day({ entries: [weekly([[540, 1020]])] }), false),
    ).toEqual({ text: "9am – 5pm", detail: null, working: true });
    expect(
      describeDay(
        day({
          entries: [
            weekly([
              [540, 720],
              [780, 1020],
            ]),
          ],
        }),
        false,
      ).text,
    ).toBe("9am – 12pm, 1pm – 5pm");
  });

  test("the place is shown only when there is more than one, and changed hours are flagged", () => {
    const d = day({ entries: [weekly([[540, 1020]], "Fitzroy", "custom")] });
    expect(describeDay(d, true).detail).toBe("Fitzroy · changed hours");
    expect(describeDay(d, false).detail).toBe("changed hours");
  });

  test("a day off shows its note, or the places it covers", () => {
    const off = (o: Partial<NonNullable<RosterDay["off"]>>) =>
      day({ off: { note: null, everywhere: true, locationNames: [], ...o } });
    expect(describeDay(off({ note: "Holiday" }), false)).toEqual({
      text: "Day off",
      detail: "Holiday",
      working: false,
    });
    expect(
      describeDay(off({ everywhere: false, locationNames: ["Fitzroy"] }), false)
        .detail,
    ).toBe("Fitzroy");
    expect(describeDay(off({}), false).detail).toBeNull();
  });

  test("an empty day is simply not working", () => {
    expect(describeDay(day(), false)).toEqual({
      text: "Not working",
      detail: null,
      working: false,
    });
  });
});

describe("weeks", () => {
  test("labels one month and across a month", () => {
    expect(weekLabel("2026-11-02")).toBe("2 – 8 Nov");
    expect(weekLabel("2026-11-30")).toBe("30 Nov – 6 Dec");
  });

  test("moves by whole weeks in either direction, over a year end", () => {
    expect(shiftWeek("2026-11-02", 1)).toBe("2026-11-09");
    expect(shiftWeek("2026-11-02", -2)).toBe("2026-10-19");
    expect(shiftWeek("2026-12-28", 1)).toBe("2027-01-04");
  });

  test("names a day", () => {
    expect(dayName("2026-11-02")).toBe("Mon 2");
  });
});

describe("elapsedMinutes", () => {
  const since = "2026-11-24T22:00:00.000Z";
  test("counts from the server's clock, not the phone's", () => {
    // The phone thinks it is 2 hours earlier than the server, and that does not matter.
    expect(
      elapsedMinutes({
        since,
        serverNow: "2026-11-25T00:30:00.000Z",
        fetchedAtMs: 1_000,
        nowMs: 1_000,
      }),
    ).toBe(150);
  });

  test("keeps counting as the phone's own time moves on after the fetch", () => {
    expect(
      elapsedMinutes({
        since,
        serverNow: "2026-11-25T00:30:00.000Z",
        fetchedAtMs: 1_000,
        nowMs: 1_000 + 10 * 60_000,
      }),
    ).toBe(160);
  });

  test("a ticker value taken just before the data arrived does not shorten the shift", () => {
    expect(
      elapsedMinutes({
        since,
        serverNow: "2026-11-25T00:05:00.000Z",
        fetchedAtMs: 5_000,
        nowMs: 4_990,
      }),
    ).toBe(125);
  });

  test("never goes negative, and rounds down", () => {
    expect(
      elapsedMinutes({
        since,
        serverNow: "2026-11-24T21:00:00.000Z",
        fetchedAtMs: 0,
        nowMs: 0,
      }),
    ).toBe(0);
    expect(
      elapsedMinutes({
        since,
        serverNow: "2026-11-24T22:00:59.000Z",
        fetchedAtMs: 0,
        nowMs: 0,
      }),
    ).toBe(0);
  });
});

describe("formatElapsed", () => {
  test.each([
    [0, "0 min"],
    [42, "42 min"],
    [60, "1 hr"],
    [125, "2 hr 5 min"],
  ])("%i is %s", (m, text) => expect(formatElapsed(m)).toBe(text));
});
