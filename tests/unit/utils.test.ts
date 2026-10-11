import { describe, expect, it } from "vitest";
import { toArkesel, toE164 } from "@/lib/phone";
import { fillTemplate } from "@/lib/reminders/template-format";
import { readCallOutcome } from "@/lib/vapi/call-outcome";
import { ghanaHour, withinHours } from "@/lib/reminders/config";

describe("phone numbers", () => {
  it("normalises Ghana numbers to E.164", () => {
    expect(toE164("0244123456")).toBe("+233244123456");
    expect(toE164("233244123456")).toBe("+233244123456");
    expect(toE164("+233 24 412 3456")).toBe("+233244123456");
    expect(toE164("244123456")).toBe("+233244123456");
    expect(toE164("+1 877 329 4149")).toBe("+18773294149");
  });

  it("rejects non-numbers", () => {
    expect(toE164("")).toBeNull();
    expect(toE164("browser test")).toBeNull();
    expect(toE164(null)).toBeNull();
  });

  it("formats for Arkesel without the plus sign", () => {
    expect(toArkesel("0244123456")).toBe("233244123456");
  });
});

describe("fillTemplate", () => {
  it("fills known placeholders and leaves others", () => {
    expect(
      fillTemplate("Maakye {name}, {date} wɔ {location}. {unknown}", {
        name: "Ama",
        date: "Mon 13 Oct",
        location: "ANC",
      })
    ).toBe("Maakye Ama, Mon 13 Oct wɔ ANC. {unknown}");
  });

  it("keeps a placeholder with no value", () => {
    expect(fillTemplate("Due {dueDate}", {})).toBe("Due {dueDate}");
  });
});

describe("readCallOutcome", () => {
  const outputs = (result: unknown) => ({ id1: { name: "Nsoatre ANC call outcome", result } });

  it("reads and sanitises the AI outcome", () => {
    const outcome = readCallOutcome(
      outputs({
        reachedPatient: true,
        dangerSigns: ["fever", "made_up_sign"],
        reasonCategory: "cost",
        summary: "Reached.",
      }),
      "id1"
    );
    expect(outcome).toMatchObject({ reachedPatient: true, dangerSigns: ["fever"], reasonCategory: "cost" });
  });

  it("drops unknown reason categories and handles missing output", () => {
    expect(readCallOutcome(outputs({ reachedPatient: false, dangerSigns: [], summary: "", reasonCategory: "x" }))?.reasonCategory).toBeUndefined();
    expect(readCallOutcome(undefined)).toBeNull();
  });
});

describe("Ghana time windows", () => {
  it("uses Africa/Accra (UTC+0)", () => {
    expect(ghanaHour(new Date("2026-10-12T07:30:00Z"))).toBe(7);
    expect(withinHours({ start: 8, end: 19 }, new Date("2026-10-12T07:59:00Z"))).toBe(false);
    expect(withinHours({ start: 8, end: 19 }, new Date("2026-10-12T18:59:00Z"))).toBe(true);
    expect(withinHours({ start: 8, end: 19 }, new Date("2026-10-12T19:00:00Z"))).toBe(false);
  });
});
