import { describe, expect, it } from "vitest";
import { callerInteracted, classifyEndedCall, detectLanguage } from "@/lib/calls/classify";

const handoff = (name: string) => ({
  role: "tool_calls",
  toolCalls: [{ function: { name } }],
});
const user = (message: string) => ({ role: "user", message });
const bot = (message: string) => ({ role: "bot", message });

const base = { startedAt: new Date(), durationSeconds: 60 };

describe("detectLanguage", () => {
  it("reads the branch from the handoff tool call", () => {
    expect(detectLanguage([handoff("handoff_to_twi")])).toBe("twi");
    expect(detectLanguage([handoff("handoff_to_english")])).toBe("english");
    expect(detectLanguage([bot("hello")])).toBeNull();
  });

  it("uses the last handoff when there are several", () => {
    expect(detectLanguage([handoff("handoff_to_twi"), handoff("handoff_to_english")])).toBe("english");
  });
});

describe("callerInteracted", () => {
  it("is true only for non-empty caller speech or keypad input", () => {
    expect(callerInteracted([bot("menu"), user("1")])).toBe(true);
    expect(callerInteracted([bot("menu"), user("   ")])).toBe(false);
    expect(callerInteracted([bot("menu")])).toBe(false);
  });
});

describe("classifyEndedCall", () => {
  it("counts a caller who pressed 1 for Twi as reached", () => {
    const r = classifyEndedCall({
      ...base,
      endedReason: "assistant-ended-call",
      messages: [bot("menu"), user("1"), handoff("handoff_to_twi")],
    });
    expect(r).toMatchObject({ connected: true, language: "twi", reached: true, dialFailed: false });
  });

  it("does NOT count silence that defaulted to Twi as reached (answering machine / empty room)", () => {
    const r = classifyEndedCall({
      ...base,
      endedReason: "assistant-ended-call",
      messages: [bot("menu"), bot("For Twi press 1"), handoff("handoff_to_twi")],
    });
    expect(r.connected).toBe(true);
    expect(r.language).toBe("twi");
    expect(r.reached).toBe(false);
  });

  it("uses the AI outcome for English calls", () => {
    const messages = [user("2"), handoff("handoff_to_english"), user("hello")];
    expect(
      classifyEndedCall({ ...base, endedReason: "customer-ended-call", messages, reachedPatient: true }).reached
    ).toBe(true);
    // A relative answered: the AI says the patient herself was not reached.
    expect(
      classifyEndedCall({ ...base, endedReason: "customer-ended-call", messages, reachedPatient: false }).reached
    ).toBe(false);
  });

  it("treats unanswered calls as not connected and not a dial failure", () => {
    const r = classifyEndedCall({
      endedReason: "customer-did-not-answer",
      startedAt: null,
      durationSeconds: 0,
      messages: [],
    });
    expect(r).toMatchObject({ connected: false, dialFailed: false, reached: false });
  });

  it("flags provider / dialling errors so the Arkesel fallback can run", () => {
    for (const endedReason of [
      "call.start.error-get-transport",
      "twilio-failed-to-connect-call",
      "phone-call-provider-closed-websocket",
    ]) {
      const r = classifyEndedCall({ endedReason, startedAt: null, durationSeconds: 0, messages: [] });
      expect(r.dialFailed, endedReason).toBe(true);
      expect(r.reached).toBe(false);
    }
  });

  it("treats a call that never started as a dial failure", () => {
    const r = classifyEndedCall({ endedReason: "unknown-error", startedAt: null, durationSeconds: 0, messages: [] });
    expect(r.dialFailed).toBe(true);
  });

  it("requires at least 5 seconds of connection", () => {
    const r = classifyEndedCall({
      ...base,
      durationSeconds: 3,
      endedReason: "customer-ended-call",
      messages: [user("1"), handoff("handoff_to_twi")],
    });
    expect(r.connected).toBe(false);
    expect(r.reached).toBe(false);
  });
});
