import "server-only";
import { and, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { classifyEndedCall } from "@/lib/calls/classify";
import { sendTwiVoiceFallback } from "@/lib/calls/place-call";
import { dangerLabel } from "@/lib/labels";
import { getPatientRisk } from "@/lib/patient-risk";
import { callPolicy, reminderConfig } from "@/lib/reminders/config";
import { messages } from "@/lib/reminders/messages";
import { getAdminPhones, sendLoggedSms } from "@/lib/reminders/notify";
import { vapiRequest, VapiError, type VapiCall } from "@/lib/vapi/client";
import { getCallOutcomeOutputId, readCallOutcome, type CallOutcome } from "@/lib/vapi/call-outcome";
import { appointments, callLogs, pregnantWomen } from "@/models/schema";

type CallLog = typeof callLogs.$inferSelect;

/** How long to wait for Vapi's post-call analysis before finalising without it. */
const OUTCOME_GRACE_MS = 5 * 60_000;

function mapStatus(status?: string): CallLog["status"] {
  switch (status) {
    case "ringing":
      return "ringing";
    case "in-progress":
    case "forwarding":
      return "in-progress";
    case "ended":
      return "ended";
    default:
      return "queued";
  }
}

async function findLog(call: VapiCall) {
  const metaId = typeof call.metadata?.callLogId === "string" ? call.metadata.callLogId : null;
  const [log] = await db
    .select()
    .from(callLogs)
    .where(
      metaId
        ? or(eq(callLogs.providerCallId, call.id), eq(callLogs.id, metaId))
        : eq(callLogs.providerCallId, call.id)
    );
  return log ?? null;
}

/**
 * Records a live status change (ringing, in progress, ended). Never finalises:
 * a status event carries no transcript or analysis, so the outcome waits for
 * the end-of-call report or the next poll.
 */
export async function applyVapiStatus(call: VapiCall) {
  const log = await findLog(call);
  if (!log || log.outcomeProcessedAt) return;
  await db
    .update(callLogs)
    .set({
      status: mapStatus(call.status),
      providerCallId: log.providerCallId ?? call.id,
      startedAt: call.startedAt ? new Date(call.startedAt) : log.startedAt,
    })
    .where(eq(callLogs.id, log.id));
}

/**
 * Applies a complete Vapi call object (end-of-call report, or GET /call) to
 * its call log and finalises the outcome exactly once.
 */
export async function applyVapiCall(call: VapiCall): Promise<void> {
  const log = await findLog(call);
  if (!log || log.outcomeProcessedAt) return;

  if (mapStatus(call.status) !== "ended") {
    await applyVapiStatus(call);
    return;
  }

  const startedAt = call.startedAt ? new Date(call.startedAt) : null;
  const endedAt = call.endedAt ? new Date(call.endedAt) : new Date();
  const durationSeconds = startedAt
    ? Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 1000)
    : 0;
  const callMessages = (call.artifact?.messages ?? call.messages ?? []) as unknown[];

  let outputId: string | null = null;
  try {
    outputId = await getCallOutcomeOutputId();
  } catch {
    // fall back to matching the output by name
  }
  const outcome = readCallOutcome(call.artifact?.structuredOutputs, outputId);

  // Without an ended reason the payload is incomplete; let the poll fetch the full call.
  if (!call.endedReason && Date.now() - endedAt.getTime() < OUTCOME_GRACE_MS) return;

  const result = classifyEndedCall({
    endedReason: call.endedReason,
    startedAt,
    durationSeconds,
    messages: callMessages,
    presetLanguage: log.language,
    reachedPatient: outcome?.reachedPatient ?? null,
  });

  await db
    .update(callLogs)
    .set({
      status: "ended",
      providerCallId: log.providerCallId ?? call.id,
      endedReason: call.endedReason ?? "ended",
      answered: result.connected,
      language: result.language,
      durationSeconds,
      cost: typeof call.cost === "number" ? call.cost : null,
      transcript: call.artifact?.transcript ?? null,
      recordingUrl:
        call.artifact?.recordingUrl ?? call.artifact?.recording?.mono?.combinedUrl ?? null,
      startedAt,
      endedAt,
      ...(outcome
        ? {
            summary: outcome.summary || null,
            reasonForMissing: outcome.reasonForMissing ?? null,
            reasonCategory: outcome.reasonCategory ?? null,
            dangerSigns: outcome.dangerSigns,
            wantsToReschedule: outcome.wantsToReschedule ?? null,
            preferredReturnDate: outcome.preferredReturnDate ?? null,
          }
        : {}),
    })
    .where(eq(callLogs.id, log.id));

  // Wait for the AI analysis of answered calls, up to the grace period.
  const waitForAnalysis =
    result.connected && !outcome && Date.now() - endedAt.getTime() < OUTCOME_GRACE_MS;
  if (waitForAnalysis) return;

  await finalizeCall(log.id, {
    reached: result.reached,
    language: result.reached ? result.language : null,
    outcome,
    dialFailed: result.dialFailed,
  });
}

/**
 * Marks a call's outcome as processed and runs its side effects once:
 * remember the language, stop or reschedule the call chain, fall back to the
 * Arkesel Twi message when the call never connected, alert on danger signs.
 * Test calls never change patient data or alert staff.
 */
export async function finalizeCall(
  callLogId: string,
  result: {
    reached: boolean;
    language: "twi" | "english" | null;
    outcome: CallOutcome | null;
    dialFailed?: boolean;
  }
) {
  const [log] = await db
    .update(callLogs)
    .set({ outcomeProcessedAt: new Date() })
    .where(and(eq(callLogs.id, callLogId), isNull(callLogs.outcomeProcessedAt)))
    .returning();
  if (!log) return; // already processed

  const isTest = log.kind === "test";

  if (!isTest && result.reached && result.language && log.pregnantWomanId) {
    await db
      .update(pregnantWomen)
      .set({ preferredLanguage: result.language })
      .where(eq(pregnantWomen.id, log.pregnantWomanId));
  }

  // The Vapi call never got through (e.g. the number can't dial this
  // country): deliver the Twi message through Arkesel instead — unless the
  // failure surfaced so late that a call now would come out of the blue.
  let fallbackSent = false;
  const stillTimely = Date.now() - log.createdAt.getTime() < reminderConfig.callTimeout;
  if (
    result.dialFailed &&
    stillTimely &&
    log.provider === "vapi" &&
    log.phoneNumber?.startsWith("+")
  ) {
    const fallback = await sendTwiVoiceFallback({
      target: {
        appointmentId: log.appointmentId,
        patientId: log.pregnantWomanId,
        patientName: log.patientName ?? "Patient",
        phone: log.phoneNumber,
      },
      kind: log.kind,
      attempt: log.attempt,
      reason: `Vapi call did not connect (${log.endedReason ?? "unknown"})`,
      initiatedBy: log.initiatedBy ?? undefined,
    });
    fallbackSent = fallback.success;
  }

  if (log.appointmentId && !isTest) {
    if (result.reached) {
      await db
        .update(appointments)
        .set({ followUpCompletedAt: new Date(), nextCallAt: null })
        .where(
          and(eq(appointments.id, log.appointmentId), isNull(appointments.followUpCompletedAt))
        );
    } else if (log.kind === "automatic") {
      const [appointment] = await db
        .select({ patientId: appointments.patientId })
        .from(appointments)
        .where(eq(appointments.id, log.appointmentId));
      const { risk } = await getPatientRisk(appointment?.patientId);
      const { retryDelay } = callPolicy(risk.level);
      await db
        .update(appointments)
        .set({ nextCallAt: new Date(Date.now() + retryDelay) })
        .where(
          and(
            eq(appointments.id, log.appointmentId),
            eq(appointments.status, "missed"),
            isNull(appointments.followUpCompletedAt),
            isNull(appointments.nextCallAt)
          )
        );
    }
  }

  const signs = result.outcome?.dangerSigns ?? [];
  if (signs.length > 0 && !isTest) await sendDangerAlert(log, signs);
  if (fallbackSent) console.log(`[calls] Twi fallback sent after failed Vapi call ${log.id}`);
}

async function sendDangerAlert(log: CallLog, signs: string[]) {
  const [claimed] = await db
    .update(callLogs)
    .set({ dangerAlertSentAt: new Date() })
    .where(and(eq(callLogs.id, log.id), isNull(callLogs.dangerAlertSentAt)))
    .returning({ id: callLogs.id });
  if (!claimed) return;

  const adminPhones = await getAdminPhones();
  await sendLoggedSms({
    appointmentId: log.appointmentId ?? "unlinked-call",
    patientName: log.patientName ?? "Unknown patient",
    patientPhoneNumber: log.phoneNumber ?? "",
    recipients: adminPhones,
    message: messages.dangerAdmin(
      log.patientName ?? "A patient",
      log.phoneNumber ?? "unknown number",
      signs.map(dangerLabel)
    ),
  });
}

/**
 * Polls Vapi for calls whose outcome hasn't arrived by webhook (or when the
 * app has no public URL), and times out calls that never resolve.
 */
export async function reconcilePendingCalls(limit = 10) {
  const pending = await db
    .select()
    .from(callLogs)
    .where(
      and(
        eq(callLogs.provider, "vapi"),
        isNull(callLogs.outcomeProcessedAt),
        isNotNull(callLogs.providerCallId),
        lt(callLogs.createdAt, sql`now() - interval '90 seconds'`)
      )
    )
    .orderBy(callLogs.createdAt)
    .limit(limit);

  let processed = 0;
  for (const log of pending) {
    try {
      const call = await vapiRequest<VapiCall>("GET", `/call/${log.providerCallId}`);
      await applyVapiCall(call);
      processed++;
    } catch (error) {
      const gone = error instanceof VapiError && error.status === 404;
      const expired = Date.now() - log.createdAt.getTime() > reminderConfig.callTimeout;
      if (gone || expired) {
        await db
          .update(callLogs)
          .set({
            status: "failed",
            error: gone ? "Call not found at Vapi" : "No call result received",
          })
          .where(eq(callLogs.id, log.id));
        await finalizeCall(log.id, { reached: false, language: null, outcome: null });
      } else {
        console.error(`[calls] Could not refresh call ${log.providerCallId}:`, error);
      }
    }
  }
  return processed;
}
