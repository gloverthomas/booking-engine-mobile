import type { OfferableSlot, WaitlistEntry } from "@/lib/api/schemas";
import {
  conflictWarning,
  describeException,
  exceptionKey,
  hourOptions,
  hoursProblem,
  indexExceptions,
} from "@/lib/roster-edit";
import { differenceLabel, entryStatusLabel, hoursLabel } from "@/lib/hours";
import {
  dateWindow,
  entryStatus,
  groupSlotsByDay,
  slotLabel,
  windowLabel,
} from "@/lib/waitlist";

const ZONE = "Australia/Melbourne";

describe("waitlist wording", () => {
  test("date windows", () => {
    expect(dateWindow("2026-11-25", "2026-12-05")).toBe("25 Nov – 5 Dec");
    expect(dateWindow("2026-11-25", "2026-11-25")).toBe("25 Nov");
  });

  test("the whole window in one line: dates, days, hours", () => {
    expect(
      windowLabel({
        earliestDate: "2026-11-25",
        latestDate: "2026-12-05",
        weekdays: [3, 1],
        fromMinute: 540,
        toMinute: 1020,
      }),
    ).toBe("25 Nov – 5 Dec · Mon, Wed · 9am – 5pm");
  });

  test("no day or time limit reads as any day, any time; all seven days is also any day", () => {
    expect(
      windowLabel({
        earliestDate: "2026-11-25",
        latestDate: "2026-11-25",
        weekdays: null,
        fromMinute: null,
        toMinute: null,
      }),
    ).toBe("25 Nov · Any day · Any time");
    expect(
      windowLabel({
        earliestDate: "2026-11-25",
        latestDate: "2026-11-26",
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        fromMinute: 600,
        toMinute: 600 + 60,
      }),
    ).toContain("Any day");
  });

  const entry = (
    status: WaitlistEntry["status"],
    sent = 0,
  ): Pick<WaitlistEntry, "status" | "offers"> => ({
    status,
    offers: Array.from({ length: sent }, (_, i) => ({
      id: String(i),
      status: "sent" as const,
      start: "",
      end: "",
      staffName: "",
      offeredBy: "",
      expiresAt: "",
    })),
  });
  test("status labels say how many offers are out", () => {
    expect(entryStatus(entry("waiting"))).toEqual({
      label: "Waiting",
      tone: "info",
    });
    expect(entryStatus(entry("offered", 1)).label).toBe("Offer sent");
    expect(entryStatus(entry("offered", 2)).label).toBe("2 offers out");
    expect(entryStatus(entry("booked")).tone).toBe("success");
    expect(entryStatus(entry("cancelled")).label).toBe("Removed");
  });
});

describe("groupSlotsByDay", () => {
  const slot = (start: string, staffName = "Ryan"): OfferableSlot => ({
    staffId: staffName,
    staffName,
    start,
    end: start,
  });
  const now = new Date("2026-11-24T02:30:00.000Z");

  test("groups by local day, soonest first, whatever order they arrive in", () => {
    const groups = groupSlotsByDay(
      [
        slot("2026-11-26T23:00:00.000Z"),
        slot("2026-11-24T23:00:00.000Z"),
        slot("2026-11-25T01:00:00.000Z"),
      ],
      ZONE,
      now,
    );
    expect(groups.map((g) => g.date)).toEqual(["2026-11-25", "2026-11-27"]);
    expect(groups[0].slots).toHaveLength(2);
    expect(groups[0].heading).toBe("Tomorrow, Wed 25 Nov");
  });

  test("a late-evening UTC time lands on the next local day", () => {
    expect(
      groupSlotsByDay([slot("2026-11-24T23:30:00.000Z")], ZONE, now)[0].date,
    ).toBe("2026-11-25");
  });

  test("labels show the stylist only when it matters", () => {
    const s = slot("2026-11-24T23:00:00.000Z", "Alex");
    expect(slotLabel(s, ZONE, false)).toBe("10:00 am");
    expect(slotLabel(s, ZONE, true)).toBe("10:00 am · Alex");
  });

  test("nothing in, nothing out", () => {
    expect(groupSlotsByDay([], ZONE)).toEqual([]);
  });
});

describe("roster editing helpers", () => {
  test("hour options run from 5am to 11pm in half hours", () => {
    const options = hourOptions();
    expect(options[0]).toEqual({ minute: 300, label: "5am" });
    expect(options[1].label).toBe("5:30am");
    expect(options.at(-1)).toEqual({ minute: 1380, label: "11pm" });
    expect(options).toHaveLength(37);
  });

  test("hours that cannot work are explained before anything is sent", () => {
    expect(hoursProblem(null, 600)).toBe("Choose when they start and finish.");
    expect(hoursProblem(600, null)).toBe("Choose when they start and finish.");
    expect(hoursProblem(600, 600)).toBe("They must finish after they start.");
    expect(hoursProblem(900, 600)).toBe("They must finish after they start.");
    expect(hoursProblem(600, 900)).toBeNull();
  });

  test("exceptions are found by stylist and day", () => {
    const e = {
      id: "e1",
      staffId: "S1",
      staffName: "Ryan",
      date: "2026-11-25",
      kind: "off" as const,
      locationId: null,
      locationName: null,
      startMinute: null,
      endMinute: null,
      note: null,
    };
    const index = indexExceptions([e, { ...e, id: "e2", staffId: "S2" }]);
    expect(index.get(exceptionKey("S1", "2026-11-25"))).toEqual([e]);
    expect(index.get(exceptionKey("S1", "2026-11-26"))).toBeUndefined();
  });

  test("an exception reads as a sentence", () => {
    const base = {
      kind: "off" as const,
      startMinute: null,
      endMinute: null,
      locationName: null,
      note: null,
    };
    expect(describeException(base)).toBe("Day off");
    expect(describeException({ ...base, note: "Holiday" })).toBe(
      "Day off (Holiday)",
    );
    expect(describeException({ ...base, locationName: "Fitzroy" })).toBe(
      "Day off at Fitzroy",
    );
    expect(
      describeException({
        kind: "custom",
        startMinute: 600,
        endMinute: 900,
        locationName: "Northcote",
        note: null,
      }),
    ).toBe("10am – 3pm at Northcote");
  });

  test("the warning counts the appointments and says they were not moved", () => {
    expect(conflictWarning(0)).toBeNull();
    expect(conflictWarning(1)).toContain(
      "1 existing appointment now falls outside",
    );
    expect(conflictWarning(3)).toContain(
      "3 existing appointments now fall outside",
    );
    expect(conflictWarning(3)).toContain("not been moved");
  });
});

describe("hours wording", () => {
  test("worked against rostered", () => {
    expect(differenceLabel(null)).toBeNull();
    expect(differenceLabel(0)).toBe("on time");
    expect(differenceLabel(65)).toBe("+1 hr 5 min");
    expect(differenceLabel(-30)).toBe("-30 min");
  });
  test("durations and statuses", () => {
    expect(hoursLabel(0)).toBe("0 min");
    expect(hoursLabel(480)).toBe("8 hr");
    expect(entryStatusLabel("open")).toBe("In progress");
    expect(entryStatusLabel("pending")).toBe("Awaiting approval");
    expect(entryStatusLabel("approved")).toBe("Approved");
  });
});
