/**
 * Pure rules that turn an ended Vapi call into an outcome. Kept free of I/O
 * so they can be unit-tested (see tests/unit/classify.test.ts).
 */
import { HANDOFF_TOOL_NAMES } from "@/lib/vapi/ivr";

/** The call rang but nobody (or a machine) answered. */
const NO_ANSWER = /did-not-answer|busy|voicemail|no-answer|rejected|unavailable/i;

/** The call never got through: provider, routing or number problems. */
const DIAL_FAILED =
  /call\.start\.error|failed-to-connect|could-not-connect|phone-call-provider|provider-fault|providerfault|sip|international|not-allowed|forbidden|invalid-number|number-not|twilio-|telnyx-|vonage-|transport-never-connected/i;

export type Language = "twi" | "english";

export interface EndedCallFacts {
  endedReason?: string | null;
  startedAt?: string | Date | null;
  durationSeconds: number;
  messages: unknown[];
  /** Language the call started in when the menu was skipped. */
  presetLanguage?: Language | null;
  /** AI-extracted outcome, when available. */
  reachedPatient?: boolean | null;
}

export interface CallClassification {
  connected: boolean;
  dialFailed: boolean;
  language: Language | null;
  callerInteracted: boolean;
  reached: boolean;
}

/** The language branch the caller ended up in, from the handoff tool calls. */
export function detectLanguage(messages: unknown[]): Language | null {
  const text = JSON.stringify(messages ?? []);
  const twi = text.lastIndexOf(HANDOFF_TOOL_NAMES.twi);
  const english = text.lastIndexOf(HANDOFF_TOOL_NAMES.english);
  if (twi === -1 && english === -1) return null;
  return twi > english ? "twi" : "english";
}

/** True when the caller spoke or pressed a key at any point in the call. */
export function callerInteracted(messages: unknown[]): boolean {
  return (messages ?? []).some((m) => {
    const msg = m as { role?: string; message?: unknown; content?: unknown };
    const text = msg.message ?? msg.content;
    return msg.role === "user" && typeof text === "string" && text.trim().length > 0;
  });
}

export function classifyEndedCall(facts: EndedCallFacts): CallClassification {
  const reason = facts.endedReason ?? "";
  const noAnswer = NO_ANSWER.test(reason);
  const dialFailed = !noAnswer && (DIAL_FAILED.test(reason) || !facts.startedAt);
  const connected = !noAnswer && !dialFailed && facts.durationSeconds >= 5;
  const interacted = callerInteracted(facts.messages);
  const language = detectLanguage(facts.messages) ?? facts.presetLanguage ?? null;

  // A person must have been on the line. Silence at the menu still plays the
  // Twi message (in case someone is listening) but does not count as reached,
  // so the follow-up continues.
  let reached = false;
  if (connected) {
    if (language === "english") {
      reached = facts.reachedPatient ?? interacted;
    } else if (language === "twi") {
      reached = interacted;
    }
  }

  return { connected, dialFailed, language, callerInteracted: interacted, reached };
}
