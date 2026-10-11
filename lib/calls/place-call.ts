import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { arkeselService } from "@/lib/arkesel-service";
import { getPatientRisk } from "@/lib/patient-risk";
import { currentGestationalWeeks } from "@/lib/risk";
import { toE164 } from "@/lib/phone";
import { isDryRun } from "@/lib/reminders/dry-run";
import { isVapiConfigured, vapiRequest, VapiError } from "@/lib/vapi/client";
import { buildReminderSquad, type CallLanguage, type IvrContext } from "@/lib/vapi/ivr";
import { getCallOutcomeOutputId } from "@/lib/vapi/call-outcome";
import {
  callLogs,
  reminderLogs,
  type Appointment,
  type PersonSnapshot,
} from "@/models/schema";

export type CallKind = "automatic" | "manual" | "test";

const SYSTEM: PersonSnapshot = { name: "Automatic reminders", email: "system" };

export function twiAudioUrl() {
  return process.env.TWI_AUDIO_URL || process.env.ARKESEL_VOICE_URL || "";
}

/** Webhook config for Vapi, or null when the app isn't publicly reachable. */
export function vapiServerConfig() {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!appUrl || !secret || /localhost|127\.0\.0\.1/.test(appUrl)) return null;
  return {
    url: `${appUrl}/api/vapi/webhook`,
    headers: { "x-vapi-secret": secret },
  };
}

async function squadFor(ctx: IvrContext, includeServer: boolean) {
  let structuredOutputId: string | null = null;
  try {
    structuredOutputId = await getCallOutcomeOutputId();
  } catch (error) {
    // The call still works; only the AI outcome extraction is lost.
    console.error("[calls] Could not load call outcome definition:", error);
  }
  return buildReminderSquad(ctx, {
    twiAudioUrl: twiAudioUrl(),
    menuAudioUrl: process.env.MENU_AUDIO_URL || null,
    structuredOutputId,
    server: includeServer ? vapiServerConfig() : null,
  });
}

/** Builds the IVR squad for an appointment's patient. */
export async function buildSquadForAppointment(
  appointment: Pick<
    Appointment,
    "patientId" | "patientName" | "appointmentDateTime" | "appointmentTime" | "appointmentLocation"
  >,
  options: { includeServer: boolean }
) {
  const { patient, risk } = await getPatientRisk(appointment.patientId);
  const language: CallLanguage | null = patient?.preferredLanguage ?? null;
  const squad = await squadFor(
    {
      patientName: patient?.fullName ?? appointment.patientName,
      appointmentDate: appointment.appointmentDateTime,
      appointmentTime: appointment.appointmentTime,
      appointmentLocation: appointment.appointmentLocation,
      gestationalWeeks: patient
        ? currentGestationalWeeks(patient.expectedDeliveryDate, patient.gestationalAge)
        : null,
      highRisk: risk.level === "high",
      language,
    },
    options.includeServer
  );
  // The call starts in English only for English patients; Twi patients hear the menu.
  return { squad, language: language === "english" ? language : null };
}

export interface PlaceCallResult {
  callLogId: string;
  provider: "vapi" | "arkesel";
  success: boolean;
  /** True when a Vapi outcome (webhook or poll) will follow for this call. */
  awaitingOutcome: boolean;
  error?: string;
}

interface CallTarget {
  appointmentId: string | null;
  patientId: string | null;
  patientName: string;
  phone: string;
}

async function logReminder(
  target: CallTarget,
  status: "sent" | "failed",
  error: string | null,
  response: unknown,
  sentBy?: PersonSnapshot
) {
  await db.insert(reminderLogs).values({
    appointmentId: target.appointmentId ?? "phone-test",
    patientName: target.patientName,
    patientPhoneNumber: target.phone,
    reminderType: "voice",
    status,
    error,
    response: response ?? null,
    sentBy: sentBy ?? SYSTEM,
    sentAt: status === "sent" ? new Date() : null,
  });
}

/**
 * Arkesel voice call playing the recorded Twi message. Used when Vapi can't
 * place a call, and after a Vapi call fails to connect. Arkesel reports no
 * answer status, so the call log is closed straight away.
 */
export async function sendTwiVoiceFallback(params: {
  target: CallTarget;
  kind: CallKind;
  attempt: number;
  reason: string;
  initiatedBy?: PersonSnapshot;
  existingLogId?: string;
}): Promise<PlaceCallResult> {
  const { target, kind, attempt, reason, initiatedBy } = params;
  const phone = toE164(target.phone);
  const audio = twiAudioUrl();

  const fallback = !phone
    ? { success: false as const, error: "Invalid phone number" }
    : !audio
      ? { success: false as const, error: "No Twi audio URL configured" }
      : isDryRun()
        ? { success: true as const, data: { dryRun: true } }
        : await arkeselService.sendVoiceCall({ recipients: [phone], voiceFileUrl: audio });

  const values = {
    provider: "arkesel" as const,
    status: fallback.success ? ("ended" as const) : ("failed" as const),
    language: "twi" as const,
    endedReason: fallback.success ? "arkesel-voice-sent" : "arkesel-voice-failed",
    error: [reason, !fallback.success && `Arkesel: ${fallback.error}`].filter(Boolean).join(" | "),
    outcomeProcessedAt: new Date(),
    endedAt: new Date(),
  };

  let logId = params.existingLogId;
  if (logId) {
    await db.update(callLogs).set(values).where(eq(callLogs.id, logId));
  } else {
    const [row] = await db
      .insert(callLogs)
      .values({
        appointmentId: target.appointmentId,
        pregnantWomanId: target.patientId,
        patientName: target.patientName,
        phoneNumber: phone ?? target.phone,
        kind,
        attempt,
        initiatedBy,
        ...values,
      })
      .returning({ id: callLogs.id });
    logId = row.id;
  }

  await logReminder(
    target,
    fallback.success ? "sent" : "failed",
    fallback.success ? null : (fallback.error ?? "Voice call failed"),
    "data" in fallback ? fallback.data : null,
    initiatedBy
  );

  return {
    callLogId: logId,
    provider: "arkesel",
    success: fallback.success,
    awaitingOutcome: false,
    error: fallback.success ? undefined : fallback.error,
  };
}

/**
 * Places an IVR call: Vapi (Twi/English menu) when possible, otherwise the
 * Arkesel Twi voice fallback. Every attempt is recorded in call_logs and
 * reminder_logs.
 */
async function startCall(params: {
  target: CallTarget;
  buildSquad: () => Promise<{ squad: unknown; language: CallLanguage | null }>;
  kind: CallKind;
  attempt: number;
  initiatedBy?: PersonSnapshot;
}): Promise<PlaceCallResult> {
  const { target, buildSquad, kind, attempt, initiatedBy } = params;
  const phone = toE164(target.phone);

  const [log] = await db
    .insert(callLogs)
    .values({
      appointmentId: target.appointmentId,
      pregnantWomanId: target.patientId,
      patientName: target.patientName,
      phoneNumber: phone ?? target.phone,
      provider: "vapi",
      kind,
      attempt,
      initiatedBy,
    })
    .returning({ id: callLogs.id });

  if (!phone) {
    const error = "Invalid phone number";
    await db
      .update(callLogs)
      .set({ status: "failed", error, outcomeProcessedAt: new Date(), endedAt: new Date() })
      .where(eq(callLogs.id, log.id));
    await logReminder(target, "failed", error, null, initiatedBy);
    return { callLogId: log.id, provider: "vapi", success: false, awaitingOutcome: false, error };
  }

  if (isDryRun()) {
    // Exercise the full IVR configuration without dialling anyone.
    const { language } = await buildSquad();
    await db
      .update(callLogs)
      .set({
        status: "ended",
        endedReason: "dry-run",
        language,
        outcomeProcessedAt: new Date(),
        endedAt: new Date(),
      })
      .where(eq(callLogs.id, log.id));
    await logReminder(target, "sent", null, { dryRun: true }, initiatedBy);
    return { callLogId: log.id, provider: "vapi", success: true, awaitingOutcome: false };
  }

  let vapiError: string;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (isVapiConfigured() && phoneNumberId) {
    try {
      const { squad, language } = await buildSquad();
      const call = await vapiRequest<{ id: string; status?: string }>("POST", "/call", {
        phoneNumberId,
        customer: { number: phone, name: target.patientName.slice(0, 40) },
        squad,
        metadata: {
          callLogId: log.id,
          appointmentId: target.appointmentId,
          kind,
          language: language ?? "menu",
        },
      });
      await db
        .update(callLogs)
        .set({
          providerCallId: call.id,
          status: call.status === "ringing" ? "ringing" : "queued",
          language,
        })
        .where(eq(callLogs.id, log.id));
      await logReminder(target, "sent", null, { vapiCallId: call.id }, initiatedBy);
      return { callLogId: log.id, provider: "vapi", success: true, awaitingOutcome: true };
    } catch (error) {
      vapiError =
        error instanceof VapiError ? error.message : (error as Error)?.message || "Vapi call failed";
      console.error(`[calls] Vapi call failed for ${target.patientName}:`, vapiError);
    }
  } else {
    vapiError = "Vapi is not configured (VAPI_PRIVATE_API_KEY / VAPI_PHONE_NUMBER_ID)";
  }

  return sendTwiVoiceFallback({
    target,
    kind,
    attempt,
    reason: `Vapi: ${vapiError}`,
    initiatedBy,
    existingLogId: log.id,
  });
}

/** Reminder call for an appointment (automatic follow-up or manual button). */
export function placeReminderCall(params: {
  appointment: Appointment;
  kind: CallKind;
  attempt: number;
  initiatedBy?: PersonSnapshot;
}) {
  const { appointment } = params;
  return startCall({
    target: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      phone: appointment.patientPhoneNumber,
    },
    buildSquad: () => buildSquadForAppointment(appointment, { includeServer: true }),
    kind: params.kind,
    attempt: params.attempt,
    initiatedBy: params.initiatedBy,
  });
}

/** A real test call to a staff member's own phone, using a demo patient. */
export function placeTestPhoneCall(params: {
  phone: string;
  name: string;
  initiatedBy: PersonSnapshot;
}) {
  return startCall({
    target: { appointmentId: null, patientId: null, patientName: params.name, phone: params.phone },
    buildSquad: async () => ({
      squad: await squadFor(
        {
          patientName: params.name,
          appointmentDate: new Date(),
          appointmentTime: "09:00",
          appointmentLocation: "the antenatal clinic",
        },
        true
      ),
      language: null,
    }),
    kind: "test",
    attempt: 1,
    initiatedBy: params.initiatedBy,
  });
}
