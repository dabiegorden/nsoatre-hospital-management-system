import "server-only";
import { and, eq, gt, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { placeReminderCall } from "@/lib/calls/place-call";
import { reconcilePendingCalls } from "@/lib/calls/outcome";
import { getPatientRisk } from "@/lib/patient-risk";
import { callPolicy, reminderConfig, withinHours } from "@/lib/reminders/config";
import { firstName, formatAppointment, messages } from "@/lib/reminders/messages";
import { composeSms, patientLanguage } from "@/lib/reminders/templates";
import type { SmsPurpose } from "@/lib/reminders/template-format";
import { getAdminPhones, sendLoggedSms } from "@/lib/reminders/notify";
import { appointments, pregnantWomen, schedulerLocks, type Appointment } from "@/models/schema";

const LOCK_NAME = "reminders";
const LOCK_LEASE_MS = 5 * 60_000;
const HOUR = 3_600_000;

/** Patient-facing SMS in her preferred language when a staff template exists. */
async function patientSms(purpose: SmsPurpose, a: Appointment, builtIn: string) {
  return composeSms(
    purpose,
    await patientLanguage(a.patientId),
    {
      name: firstName(a.patientName),
      date: formatAppointment(a.appointmentDateTime),
      location: a.appointmentLocation,
    },
    builtIn
  );
}

/** Appointments older than this are marked missed but not chased. */
const FOLLOW_UP_WINDOW = 72 * HOUR;
const MISSED_SMS_WINDOW = 48 * HOUR;

export interface TickResult {
  skipped?: "locked";
  dayBefore: number;
  sameDay: number;
  markedMissed: number;
  missedSms: number;
  callsPlaced: number;
  escalated: number;
  callsReconciled: number;
  deliveryReadiness: number;
  errors: string[];
  durationMs: number;
}

async function acquireLock(now: Date) {
  const [row] = await db
    .insert(schedulerLocks)
    .values({ name: LOCK_NAME, lockedUntil: new Date(now.getTime() + LOCK_LEASE_MS) })
    .onConflictDoUpdate({
      target: schedulerLocks.name,
      set: { lockedUntil: new Date(now.getTime() + LOCK_LEASE_MS) },
      setWhere: lt(schedulerLocks.lockedUntil, now),
    })
    .returning();
  return Boolean(row);
}

async function releaseLock(result: TickResult) {
  await db
    .update(schedulerLocks)
    .set({ lockedUntil: new Date(), lastRunAt: new Date(), lastResult: result })
    .where(eq(schedulerLocks.name, LOCK_NAME));
}

/**
 * One pass of the automatic reminder pipeline:
 *
 *   day-before SMS → same-day SMS → appointment missed → missed SMS
 *   → IVR call(s) → relative SMS + admin escalation
 *
 * plus call-outcome reconciliation and delivery-readiness SMS. Every step
 * claims its rows atomically before acting, so it is safe to run on several
 * instances and to repeat after a crash.
 */
export async function runReminderTick(now = new Date()): Promise<TickResult> {
  const started = Date.now();
  const result: TickResult = {
    dayBefore: 0,
    sameDay: 0,
    markedMissed: 0,
    missedSms: 0,
    callsPlaced: 0,
    escalated: 0,
    callsReconciled: 0,
    deliveryReadiness: 0,
    errors: [],
    durationMs: 0,
  };

  if (!(await acquireLock(now))) {
    return { ...result, skipped: "locked", durationMs: Date.now() - started };
  }

  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error) {
      console.error(`[reminders] Step "${name}" failed:`, error);
      result.errors.push(`${name}: ${(error as Error).message}`);
    }
  };

  const smsOpen = withinHours(reminderConfig.smsHours, now);
  const callsOpen = withinHours(reminderConfig.callHours, now);
  const { batchSize } = reminderConfig;
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

  try {
    // 1. Reminder SMS the day before.
    if (smsOpen) {
      await step("day-before", async () => {
        const due = db
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.status, "scheduled"),
              isNull(appointments.dayBeforeReminderAt),
              gt(appointments.appointmentDateTime, at(reminderConfig.sameDayLead)),
              lte(appointments.appointmentDateTime, at(reminderConfig.dayBeforeLead))
            )
          )
          .limit(batchSize);
        const claimed = await db
          .update(appointments)
          .set({ dayBeforeReminderAt: now })
          .where(and(inArray(appointments.id, due), isNull(appointments.dayBeforeReminderAt)))
          .returning();
        for (const a of claimed) {
          await sendLoggedSms({
            appointmentId: a.id,
            patientName: a.patientName,
            patientPhoneNumber: a.patientPhoneNumber,
            recipients: [a.patientPhoneNumber],
            message: await patientSms("dayBefore", a, messages.dayBefore(a)),
          });
          result.dayBefore++;
        }
      });

      // 2. Reminder SMS on the day.
      await step("same-day", async () => {
        const due = db
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.status, "scheduled"),
              isNull(appointments.sameDayReminderAt),
              gt(appointments.appointmentDateTime, now),
              lte(appointments.appointmentDateTime, at(reminderConfig.sameDayLead))
            )
          )
          .limit(batchSize);
        const claimed = await db
          .update(appointments)
          .set({ sameDayReminderAt: now })
          .where(and(inArray(appointments.id, due), isNull(appointments.sameDayReminderAt)))
          .returning();
        for (const a of claimed) {
          await sendLoggedSms({
            appointmentId: a.id,
            patientName: a.patientName,
            patientPhoneNumber: a.patientPhoneNumber,
            recipients: [a.patientPhoneNumber],
            message: await patientSms("sameDay", a, messages.sameDay(a)),
          });
          result.sameDay++;
        }
      });
    }

    // 3. Mark appointments missed once the grace period has passed.
    await step("mark-missed", async () => {
      const marked = await db
        .update(appointments)
        .set({
          status: "missed",
          missedAt: now,
          missedCheckProcessed: true,
          nextCallAt: at(reminderConfig.firstCallDelay),
        })
        .where(
          and(
            eq(appointments.status, "scheduled"),
            lte(appointments.appointmentDateTime, at(-reminderConfig.missedGrace))
          )
        )
        .returning({ id: appointments.id });
      result.markedMissed = marked.length;
    });

    // 4. Missed-appointment SMS to the patient and admins.
    if (smsOpen) {
      await step("missed-sms", async () => {
        const due = db
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.status, "missed"),
              eq(appointments.missedNotificationSent, false),
              isNull(appointments.followUpCompletedAt),
              gt(appointments.appointmentDateTime, at(-MISSED_SMS_WINDOW))
            )
          )
          .limit(batchSize);
        const claimed = await db
          .update(appointments)
          .set({ missedNotificationSent: true })
          .where(
            and(inArray(appointments.id, due), eq(appointments.missedNotificationSent, false))
          )
          .returning();
        if (claimed.length === 0) return;
        const adminPhones = await getAdminPhones();
        for (const a of claimed) {
          await sendLoggedSms({
            appointmentId: a.id,
            patientName: a.patientName,
            patientPhoneNumber: a.patientPhoneNumber,
            recipients: [a.patientPhoneNumber],
            message: await patientSms("missedPatient", a, messages.missedPatient(a)),
          });
          if (adminPhones.length) {
            await sendLoggedSms({
              appointmentId: a.id,
              patientName: a.patientName,
              patientPhoneNumber: a.patientPhoneNumber,
              recipients: adminPhones,
              message: messages.missedAdmin(a),
            });
          }
          result.missedSms++;
        }
      });
    }

    // 5. Follow-up calls (IVR), retried per the patient's risk level.
    if (callsOpen) {
      await step("calls", async () => {
        const candidates = await db
          .select()
          .from(appointments)
          .where(
            and(
              eq(appointments.status, "missed"),
              isNull(appointments.followUpCompletedAt),
              isNull(appointments.escalatedAt),
              lte(appointments.nextCallAt, now),
              gt(appointments.appointmentDateTime, at(-FOLLOW_UP_WINDOW))
            )
          )
          .orderBy(appointments.nextCallAt)
          .limit(5);

        for (const candidate of candidates) {
          const { risk } = await getPatientRisk(candidate.patientId);
          const { maxAttempts, retryDelay } = callPolicy(risk.level);
          if (candidate.voiceCallAttempts >= maxAttempts) continue; // escalation step

          const [claimed] = await db
            .update(appointments)
            .set({
              voiceCallAttempts: sql`${appointments.voiceCallAttempts} + 1`,
              nextCallAt: null,
              lastCallAttempt: now,
            })
            .where(
              and(
                eq(appointments.id, candidate.id),
                lte(appointments.nextCallAt, now),
                isNull(appointments.followUpCompletedAt)
              )
            )
            .returning();
          if (!claimed) continue;

          const call = await placeReminderCall({
            appointment: claimed,
            kind: "automatic",
            attempt: claimed.voiceCallAttempts,
          });
          result.callsPlaced++;

          // Arkesel (or a failed call) gives no outcome event; schedule the
          // next step now. Vapi calls reschedule when their outcome arrives.
          if (!call.awaitingOutcome) {
            await db
              .update(appointments)
              .set({ nextCallAt: at(retryDelay) })
              .where(and(eq(appointments.id, claimed.id), isNull(appointments.nextCallAt)));
          }
        }
      });
    }

    // 6. Escalate when all calls went unanswered: relative SMS + admin alert.
    if (smsOpen) {
      await step("escalate", async () => {
        const candidates = await db
          .select()
          .from(appointments)
          .where(
            and(
              eq(appointments.status, "missed"),
              isNull(appointments.followUpCompletedAt),
              isNull(appointments.escalatedAt),
              isNotNull(appointments.nextCallAt),
              lte(appointments.nextCallAt, now),
              gt(appointments.appointmentDateTime, at(-FOLLOW_UP_WINDOW))
            )
          )
          .limit(batchSize);

        const adminPhones = candidates.length ? await getAdminPhones() : [];
        for (const candidate of candidates) {
          const { risk } = await getPatientRisk(candidate.patientId);
          if (candidate.voiceCallAttempts < callPolicy(risk.level).maxAttempts) continue;

          const [claimed] = await db
            .update(appointments)
            .set({ escalatedAt: now, nextCallAt: null })
            .where(and(eq(appointments.id, candidate.id), isNull(appointments.escalatedAt)))
            .returning();
          if (!claimed) continue;

          let relativeNotified = false;
          if (claimed.relativePhoneNumber) {
            const sms = await sendLoggedSms({
              appointmentId: claimed.id,
              patientName: claimed.patientName,
              patientPhoneNumber: claimed.patientPhoneNumber,
              recipients: [claimed.relativePhoneNumber],
              message: await patientSms("relative", claimed, messages.relative(claimed)),
            });
            relativeNotified = sms.success;
            if (sms.success) {
              await db
                .update(appointments)
                .set({ relativeNotifiedAt: now })
                .where(eq(appointments.id, claimed.id));
            }
          }
          if (adminPhones.length) {
            await sendLoggedSms({
              appointmentId: claimed.id,
              patientName: claimed.patientName,
              patientPhoneNumber: claimed.patientPhoneNumber,
              recipients: adminPhones,
              message: messages.escalationAdmin(
                claimed,
                claimed.voiceCallAttempts,
                relativeNotified
              ),
            });
          }
          result.escalated++;
        }
      });
    }

    // 7. Pull outcomes for calls whose webhook hasn't arrived.
    await step("reconcile-calls", async () => {
      result.callsReconciled = await reconcilePendingCalls();
    });

    // 8. Delivery-readiness SMS about four weeks before the due date.
    if (smsOpen) {
      await step("delivery-readiness", async () => {
        const due = db
          .select({ id: pregnantWomen.id })
          .from(pregnantWomen)
          .where(
            and(
              isNull(pregnantWomen.deliveryReadinessSentAt),
              gt(pregnantWomen.expectedDeliveryDate, now),
              lte(
                pregnantWomen.expectedDeliveryDate,
                at(reminderConfig.deliveryReadinessLeadDays * 24 * HOUR)
              )
            )
          )
          .limit(batchSize);
        const claimed = await db
          .update(pregnantWomen)
          .set({ deliveryReadinessSentAt: now })
          .where(
            and(inArray(pregnantWomen.id, due), isNull(pregnantWomen.deliveryReadinessSentAt))
          )
          .returning();
        for (const woman of claimed) {
          await sendLoggedSms({
            appointmentId: `delivery-readiness:${woman.id}`,
            patientName: woman.fullName,
            patientPhoneNumber: woman.phoneNumber,
            recipients: [woman.phoneNumber],
            message: await composeSms(
              "deliveryReadiness",
              woman.preferredLanguage,
              {
                name: firstName(woman.fullName),
                dueDate: woman.expectedDeliveryDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  timeZone: "Africa/Accra",
                }),
              },
              messages.deliveryReadiness(woman.fullName, woman.expectedDeliveryDate)
            ),
          });
          result.deliveryReadiness++;
        }
      });
    }
  } finally {
    result.durationMs = Date.now() - started;
    await releaseLock(result).catch((error) =>
      console.error("[reminders] Failed to release lock:", error)
    );
  }

  return result;
}
