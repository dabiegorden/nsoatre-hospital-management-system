import { describe, expect, it } from "vitest";
import { buildReminderSquad, HANDOFF_TOOL_NAMES, MEMBER_NAMES } from "@/lib/vapi/ivr";

const opts = { twiAudioUrl: "https://example.com/twi.mp3" };
const ctx = { patientName: "Akosua Mensah", appointmentDate: new Date("2026-10-13T09:00:00Z") };
const names = (squad: ReturnType<typeof buildReminderSquad>) =>
  squad.members.map((m) => (m.assistant as { name: string }).name);

describe("buildReminderSquad", () => {
  it("starts with the language menu when the language is unknown", () => {
    expect(names(buildReminderSquad(ctx, opts))).toEqual([
      MEMBER_NAMES.menu,
      MEMBER_NAMES.twi,
      MEMBER_NAMES.english,
    ]);
  });

  it("keeps the menu for Twi patients (pressing 1 confirms a person answered)", () => {
    expect(names(buildReminderSquad({ ...ctx, language: "twi" }, opts))[0]).toBe(MEMBER_NAMES.menu);
  });

  it("goes straight to the AI nurse for English patients", () => {
    expect(names(buildReminderSquad({ ...ctx, language: "english" }, opts))).toEqual([MEMBER_NAMES.english]);
  });

  it("plays the recorded audio uninterrupted in the Twi branch", () => {
    const twi = buildReminderSquad(ctx, opts).members[1].assistant as any;
    expect(twi.firstMessage).toBe(opts.twiAudioUrl);
    expect(twi.firstMessageInterruptionsEnabled).toBe(false);
    // Hang-up timer starts after the recording ends (Vapi quiet-period semantics).
    expect(twi.hooks[0]).toMatchObject({ on: "customer.speech.timeout" });
    expect(twi.hooks[0].do[0].tool.type).toBe("endCall");
  });

  it("menu offers both handoffs, keypad input, and defaults to Twi on silence", () => {
    const menu = buildReminderSquad(ctx, opts).members[0].assistant as any;
    expect(menu.keypadInputPlan.enabled).toBe(true);
    const tools = menu.model.tools.map((t: any) => t.function.name);
    expect(tools).toEqual([HANDOFF_TOOL_NAMES.twi, HANDOFF_TOOL_NAMES.english]);
    const silenceHandoff = menu.hooks.find((h: any) => h.do[0].type === "tool");
    expect(silenceHandoff.do[0].tool.destinations[0].assistantName).toBe(MEMBER_NAMES.twi);
  });

  it("includes the webhook and outcome extraction only when configured", () => {
    const plain = buildReminderSquad(ctx, opts).members[0].assistant as any;
    expect(plain.server).toBeUndefined();
    expect(plain.artifactPlan).toBeUndefined();

    const full = buildReminderSquad(ctx, {
      ...opts,
      structuredOutputId: "so-1",
      server: { url: "https://app.example/api/vapi/webhook", headers: { "x-vapi-secret": "s" } },
    }).members[2].assistant as any;
    expect(full.artifactPlan.structuredOutputIds).toEqual(["so-1"]);
    expect(full.serverMessages).toEqual(["status-update", "end-of-call-report"]);
  });

  it("personalises the English nurse with the patient's details", () => {
    const english = buildReminderSquad({ ...ctx, highRisk: true }, opts).members[2].assistant as any;
    expect(english.firstMessage).toContain("Akosua");
    expect(english.model.messages[0].content).toContain("HIGH RISK");
    expect(english.model.tools).toEqual([{ type: "endCall" }]);
  });
});
