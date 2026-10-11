import { describe, expect, it } from "vitest";
import { assessRisk, currentGestationalWeeks } from "@/lib/risk";
import { nextAncContact, WHO_CONTACT_WEEKS } from "@/lib/anc-schedule";

const DAY = 86_400_000;
const now = new Date("2026-10-12T10:00:00Z"); // a Monday

describe("assessRisk", () => {
  it("is low with no risk factors", () => {
    expect(assessRisk({ age: 25, bloodPressure: "110/70", hb: "12.5" }, now)).toMatchObject({
      level: "low",
      reasons: [],
    });
  });

  it("makes high blood pressure alone high risk", () => {
    const r = assessRisk({ bloodPressure: "145/92" }, now);
    expect(r.level).toBe("high");
    expect(r.reasons[0]).toMatch(/High blood pressure/);
  });

  it("flags severe anaemia and severe hypertension", () => {
    expect(assessRisk({ hb: "6.5" }, now).reasons).toContain("Severe anaemia (Hb < 7)");
    expect(assessRisk({ bloodPressure: "165/112" }, now).reasons).toContain("Severe hypertension");
  });

  it("adds up moderate factors", () => {
    expect(assessRisk({ age: 17 }, now).level).toBe("moderate");
    expect(assessRisk({ age: 17, hb: "9.8" }, now).level).toBe("high");
    expect(assessRisk({ missedAppointments: 2 }, now).level).toBe("moderate");
  });

  it("ignores unparseable values", () => {
    expect(assessRisk({ bloodPressure: "not taken", hb: "" }, now).level).toBe("low");
  });
});

describe("currentGestationalWeeks", () => {
  it("derives weeks from the due date", () => {
    const edd = new Date(now.getTime() + 12 * 7 * DAY);
    expect(currentGestationalWeeks(edd, null, now)).toBe(28);
  });

  it("falls back to the recorded gestational age", () => {
    expect(currentGestationalWeeks(null, 20, now)).toBe(20);
  });
});

describe("nextAncContact", () => {
  it("books the next WHO contact from the due date", () => {
    const edd = new Date(now.getTime() + 12 * 7 * DAY); // 28 weeks now
    const next = nextAncContact(edd, now)!;
    expect(next.week).toBe(30);
    expect(next.contactNumber).toBe(WHO_CONTACT_WEEKS.indexOf(30) + 1);
  });

  it("never books on a weekend", () => {
    for (let offset = 0; offset < 14; offset++) {
      const edd = new Date(now.getTime() + (10 * 7 + offset) * DAY);
      const day = nextAncContact(edd, now)!.date.getUTCDay();
      expect(day === 0 || day === 6).toBe(false);
    }
  });

  it("leaves at least a few days before the next contact", () => {
    // 29.6 weeks: the 30-week contact is too close, so 34 weeks is booked.
    const edd = new Date(now.getTime() + 10.4 * 7 * DAY);
    expect(nextAncContact(edd, now)!.week).toBe(34);
  });

  it("returns null after the last contact", () => {
    expect(nextAncContact(new Date(now.getTime() - 2 * DAY), now)).toBeNull();
  });
});
