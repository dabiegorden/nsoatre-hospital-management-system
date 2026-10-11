import "server-only";
import { vapiRequest } from "@/lib/vapi/client";
import { DANGER_SIGNS, DANGER_SIGN_LABELS, REASON_CATEGORIES } from "@/lib/labels";

export const CALL_OUTCOME_NAME = "Nsoatre ANC call outcome";

export { DANGER_SIGNS, DANGER_SIGN_LABELS, REASON_CATEGORIES };

export interface CallOutcome {
  reachedPatient: boolean;
  dangerSigns: string[];
  reasonForMissing?: string;
  reasonCategory?: (typeof REASON_CATEGORIES)[number];
  wantsToReschedule?: boolean;
  preferredReturnDate?: string;
  summary: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    reachedPatient: {
      type: "boolean",
      description:
        "True only if the pregnant patient herself spoke on the call (not a relative, voicemail, or silence).",
    },
    dangerSigns: {
      type: "array",
      description:
        "Pregnancy danger signs the patient said she currently has or had since her last visit. Empty if none were reported or the question was not answered.",
      items: { type: "string", enum: [...DANGER_SIGNS] },
    },
    reasonForMissing: {
      type: "string",
      description:
        "The patient's own explanation for missing the appointment, in one short sentence. Omit if not given.",
    },
    reasonCategory: {
      type: "string",
      enum: [...REASON_CATEGORIES],
      description: "Best category for the reason for missing the appointment.",
    },
    wantsToReschedule: {
      type: "boolean",
      description: "True if the patient agreed to come back to the clinic.",
    },
    preferredReturnDate: {
      type: "string",
      description:
        "The day the patient said she can come back, as she said it (e.g. 'next Monday', '15 October'). Omit if none.",
    },
    summary: {
      type: "string",
      description: "Two-sentence summary of the call for the clinic staff.",
    },
  },
  required: ["reachedPatient", "dangerSigns", "summary"],
};

let cachedId: Promise<string> | null = null;

/**
 * Returns the id of the saved structured output used to extract call
 * outcomes, creating it on first use. Safe to call repeatedly.
 */
export function getCallOutcomeOutputId(): Promise<string> {
  cachedId ??= (async () => {
    const found = await vapiRequest<any>(
      "GET",
      `/structured-output?name=${encodeURIComponent(CALL_OUTCOME_NAME)}&limit=10`
    );
    const list: any[] = Array.isArray(found) ? found : (found?.results ?? []);
    const existing = list.find((o) => o.name === CALL_OUTCOME_NAME);
    if (existing) return existing.id as string;

    const created = await vapiRequest<any>("POST", "/structured-output", {
      name: CALL_OUTCOME_NAME,
      type: "ai",
      description:
        "Outcome of a missed-antenatal-appointment follow-up call: whether the patient was reached, danger signs, reason for missing, and return plan.",
      schema: SCHEMA,
    });
    return created.id as string;
  })().catch((error) => {
    cachedId = null; // retry on the next call
    throw error;
  });
  return cachedId;
}

/** Reads and sanity-checks the outcome from a call's artifact. */
export function readCallOutcome(
  structuredOutputs: Record<string, { name?: string; result?: unknown }> | undefined,
  outputId?: string | null
): CallOutcome | null {
  if (!structuredOutputs) return null;
  const entry =
    (outputId && structuredOutputs[outputId]) ||
    Object.values(structuredOutputs).find((o) => o?.name === CALL_OUTCOME_NAME);
  const result = entry?.result as Partial<CallOutcome> | undefined;
  if (!result || typeof result !== "object") return null;

  return {
    reachedPatient: result.reachedPatient === true,
    dangerSigns: Array.isArray(result.dangerSigns)
      ? result.dangerSigns.filter((s) =>
          (DANGER_SIGNS as readonly string[]).includes(s)
        )
      : [],
    reasonForMissing: result.reasonForMissing || undefined,
    reasonCategory: (REASON_CATEGORIES as readonly string[]).includes(
      result.reasonCategory as string
    )
      ? result.reasonCategory
      : undefined,
    wantsToReschedule:
      typeof result.wantsToReschedule === "boolean"
        ? result.wantsToReschedule
        : undefined,
    preferredReturnDate: result.preferredReturnDate || undefined,
    summary: typeof result.summary === "string" ? result.summary : "",
  };
}
