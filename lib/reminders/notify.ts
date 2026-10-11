import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { arkeselService } from "@/lib/arkesel-service";
import { toArkesel } from "@/lib/phone";
import { isDryRun } from "@/lib/reminders/dry-run";
import { reminderLogs, users, type PersonSnapshot } from "@/models/schema";

export const SYSTEM_SENDER: PersonSnapshot = {
  name: "Automatic reminders",
  email: "system",
};

/** Phone numbers of all admins, normalised for Arkesel. */
export async function getAdminPhones(): Promise<string[]> {
  const admins = await db
    .select({ phoneNumber: users.phoneNumber })
    .from(users)
    .where(eq(users.role, "admin"));
  return [
    ...new Set(
      admins.map((a) => toArkesel(a.phoneNumber)).filter((p): p is string => !!p)
    ),
  ];
}

/**
 * Sends an SMS through Arkesel and records it in reminder_logs.
 * Never throws: failures are logged and reported in the return value.
 */
export async function sendLoggedSms(params: {
  appointmentId: string;
  patientName: string;
  patientPhoneNumber: string;
  recipients: (string | null | undefined)[];
  message: string;
  sentBy?: PersonSnapshot;
}): Promise<{ success: boolean; error?: string }> {
  const recipients = params.recipients
    .map((r) => toArkesel(r))
    .filter((r): r is string => !!r);

  const result =
    recipients.length === 0
      ? { success: false, error: "No valid phone number", data: undefined }
      : isDryRun()
        ? { success: true, data: { dryRun: true, recipients } }
        : await arkeselService.sendSMS({ recipients, message: params.message });

  try {
    await db.insert(reminderLogs).values({
      appointmentId: params.appointmentId,
      patientName: params.patientName,
      patientPhoneNumber: params.patientPhoneNumber,
      reminderType: "sms",
      status: result.success ? "sent" : "failed",
      message: params.message,
      response: "data" in result ? (result.data ?? null) : null,
      error: result.success ? null : (result.error ?? "Unknown error"),
      sentBy: params.sentBy ?? SYSTEM_SENDER,
      sentAt: result.success ? new Date() : null,
    });
  } catch (error) {
    console.error("[reminders] Failed to log SMS:", error);
  }

  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}
