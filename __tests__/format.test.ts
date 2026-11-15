import {
  dayHeading,
  dayRange,
  duration,
  localDate,
  money,
  shortDate,
  time,
  totalDuration,
} from "@/lib/format";
import { upcomingDays } from "@/lib/days";
import { describeOutcome } from "@/lib/outcome";
import { statusStyle } from "@/lib/status";

const ZONE = "Australia/Melbourne";

describe("money", () => {
  test.each([
    [9500, "$95"],
    [9550, "$95.50"],
    [0, "$0"],
    [125050, "$1,250.50"],
  ])("%i cents is %s", (cents, text) => expect(money(cents)).toBe(text));
});

describe("times in the business zone", () => {
  // 02:30 UTC on 24 Nov is 1:30 pm in Melbourne (AEDT, UTC+11).
  const iso = "2026-11-24T02:30:00.000Z";
  test("clock time, short date, local date", () => {
    expect(time(iso, ZONE)).toBe("1:30 pm");
    expect(shortDate(iso, ZONE)).toBe("Tue 24 Nov");
    expect(localDate(iso, ZONE)).toBe("2026-11-24");
  });

  test("a time late at night in UTC is already tomorrow in Melbourne", () => {
    expect(localDate("2026-11-24T23:30:00.000Z", ZONE)).toBe("2026-11-25");
  });

  test("day headings are relative near today", () => {
    const now = new Date("2026-11-24T02:30:00.000Z");
    expect(dayHeading(iso, ZONE, now)).toBe("Today");
    expect(dayHeading("2026-11-25T02:30:00.000Z", ZONE, now)).toBe("Tomorrow");
    expect(dayHeading("2026-11-23T02:30:00.000Z", ZONE, now)).toBe("Yesterday");
    expect(dayHeading("2026-11-30T02:30:00.000Z", ZONE, now)).toBe(
      "Monday 30 November",
    );
  });
});

describe("dayRange", () => {
  test("a local day is 24 hours from local midnight, as UTC", () => {
    const r = dayRange(ZONE, new Date("2026-11-24T02:30:00.000Z"));
    expect(r).toEqual({
      from: "2026-11-23T13:00:00.000Z",
      to: "2026-11-24T13:00:00.000Z",
      date: "2026-11-24",
    });
  });

  test("offsets move whole local days, including across the daylight saving change", () => {
    const next = dayRange(ZONE, new Date("2026-04-04T02:30:00.000Z"), 1);
    expect(next.date).toBe("2026-04-05");
    // The clocks go back on 5 April, so that local day is 25 hours long.
    const length = Date.parse(next.to) - Date.parse(next.from);
    expect(length).toBe(25 * 3_600_000);
  });
});

describe("duration and totals", () => {
  test.each([
    [45, "45 min"],
    [60, "1 hr"],
    [90, "1 hr 30 min"],
  ])("%i minutes", (mins, text) => expect(duration(mins)).toBe(text));
  test("totalDuration adds up", () => {
    expect(totalDuration([{ durationMin: 45 }, { durationMin: 15 }])).toBe(60);
  });
});

describe("upcomingDays", () => {
  test("starts today and runs on in order", () => {
    const days = upcomingDays(ZONE, 3, new Date("2026-11-24T02:30:00.000Z"));
    expect(days).toEqual([
      { date: "2026-11-24", label: "Today" },
      { date: "2026-11-25", label: "Wed 25" },
      { date: "2026-11-26", label: "Thu 26" },
    ]);
  });
});

describe("describeOutcome", () => {
  test("says what happened to the deposit and any fee", () => {
    expect(describeOutcome({ depositAction: "refund", feeCents: 0 })).toBe(
      "The deposit is being refunded.",
    );
    expect(describeOutcome({ depositAction: "keep", feeCents: 0 })).toBe(
      "The deposit was kept.",
    );
    expect(describeOutcome({ depositAction: "none", feeCents: 0 })).toContain(
      "no deposit",
    );
    expect(
      describeOutcome({ depositAction: "keep", feeCents: 5000 }),
    ).toContain("$50 fee");
  });
});

describe("statusStyle", () => {
  test("every status has a label, and problems read as danger", () => {
    expect(statusStyle("confirmed")).toEqual({
      label: "Confirmed",
      tone: "info",
    });
    expect(statusStyle("no_show").tone).toBe("danger");
    expect(statusStyle("completed").tone).toBe("success");
  });
});
