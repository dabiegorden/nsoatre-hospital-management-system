import { describe, expect, it } from "vitest";
import { classifyEndedCall } from "@/lib/calls/classify";
import { messages } from "@/lib/reminders/messages";

const appt = {
  patientName: "Ama Mensah",
  patientPhoneNumber: "0244123456",
  appointmentDateTime: new Date("2026-10-12T09:00:00Z"),
  appointmentLocation: "ANC Room 2",
};

describe("admin alert SMS", () => {
  it("includes the patient's and relative's numbers", () => {
    const withRelative = { ...appt, relativePhoneNumber: "0201112222" };
    for (const text of [
      messages.missedAdmin(withRelative),
      messages.escalationAdmin(withRelative, 2, true),
    ]) {
      expect(text).toContain("0244123456");
      expect(text).toContain("Relative: 0201112222");
    }
  });

  it("omits the relative when none is recorded", () => {
    expect(messages.missedAdmin(appt)).not.toContain("Relative");
    expect(messages.escalationAdmin({ ...appt, relativePhoneNumber: null }, 3, false)).not.toContain(
      "Relative"
    );
  });

  it("includes the number in danger-sign alerts", () => {
    expect(messages.dangerAdmin("Ama Mensah", "+233244123456", ["Bleeding"])).toContain(
      "+233244123456"
    );
  });
});

describe("Vapi start failures", () => {
  it("treats a transport error before connecting as a dial failure", () => {
    const result = classifyEndedCall({
      endedReason: "call.start.error-get-transport",
      startedAt: null,
      durationSeconds: 0,
      messages: [],
    });
    expect(result.dialFailed).toBe(true);
    expect(result.reached).toBe(false);
  });
});
