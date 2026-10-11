import cron, { ScheduledTask } from "node-cron";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { appointments, users, type Appointment } from "@/models/schema";
import { sendMissedAppointmentSMS } from "./sms-service";
import {
  makeAdminNotificationCall,
  makePatientReminderCall,
} from "./vapi-service";
// import { sendMissedAppointmentSMS } from "./sms-service";
// import {
//   makeAdminNotificationCall,
//   makePatientReminderCall,
// } from "./vapi-service";

let schedulerRunning = false;
let cronJob: ScheduledTask | null = null;

export async function startAppointmentScheduler(): Promise<void> {
  if (schedulerRunning) {
    console.log("⏳ Appointment scheduler already running");
    return;
  }

  schedulerRunning = true;
  console.log("🚀 Starting appointment scheduler...");

  // Run every minute to check for missed appointments
  cronJob = cron.schedule("* * * * *", async () => {
    try {
      await checkMissedAppointments();
    } catch (error: any) {
      console.error("❌ Scheduler error:", error.message);
    }
  });

  console.log("✅ Appointment scheduler started successfully");
}

/**
 * Core logic to check and process missed appointments (non-blocking).
 */
async function checkMissedAppointments(): Promise<void> {
  try {
    const now = new Date();
    const gracePeriodMinutes = 5;
    const graceCutoff = new Date(
      now.getTime() - gracePeriodMinutes * 60 * 1000
    );

    // Find appointments using combined appointmentDateTime field
    const missedAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, "scheduled"),
          lt(appointments.appointmentDateTime, graceCutoff),
          eq(appointments.missedNotificationSent, false)
        )
      );

    if (missedAppointments.length === 0) {
      console.log("⏱ No missed appointments found this minute");
      return;
    }

    console.log(`⚠️ Found ${missedAppointments.length} missed appointment(s)`);

    // Fetch all admin phone numbers once
    const admins = await db
      .select({ phoneNumber: users.phoneNumber })
      .from(users)
      .where(eq(users.role, "admin"));
    const adminPhones = admins
      .map((a) => a.phoneNumber)
      .filter((phone): phone is string => typeof phone === "string");

    // Process all appointments concurrently (non-blocking)
    missedAppointments.forEach((appointment) => {
      processAppointmentAsync(appointment, adminPhones).catch((error) => {
        console.error(
          `❌ Error processing appointment ${appointment.id}:`,
          error.message
        );
      });
    });

    console.log("✅ All missed appointments dispatched for processing");
  } catch (error: any) {
    console.error("❌ Error checking missed appointments:", error.message);
  }
}

/**
 * Process a single appointment asynchronously with delayed retries.
 * This function returns immediately and schedules tasks in the background.
 */
async function processAppointmentAsync(
  appointment: Appointment,
  adminPhones: string[]
): Promise<void> {
  try {
    // 1. Mark appointment as missed immediately (atomic update)
    await db
      .update(appointments)
      .set({ status: "missed", missedNotificationSent: true })
      .where(eq(appointments.id, appointment.id));

    console.log(
      `📅 Marked appointment ${appointment.id} as missed for ${appointment.patientName}`
    );

    // 2. Send SMS notifications immediately (non-blocking)
    sendMissedAppointmentSMS(
      appointment.patientPhoneNumber,
      appointment.patientName,
      adminPhones
    ).catch((error) => {
      console.error(
        `❌ SMS failed for ${appointment.patientName}:`,
        error.message
      );
    });

    // 3. Schedule first call attempt (5 minutes delay, non-blocking)
    setTimeout(() => {
      attemptPatientCall(appointment, 1, adminPhones);
    }, 5 * 60 * 1000);
  } catch (error: any) {
    console.error(
      `❌ Error initiating process for appointment ${appointment.id}:`,
      error.message
    );
  }
}

/**
 * Attempt a patient reminder call with retry logic.
 */
async function attemptPatientCall(
  appointment: Appointment,
  attemptNumber: number,
  adminPhones: string[]
): Promise<void> {
  try {
    console.log(
      `📞 Attempting call #${attemptNumber} to ${appointment.patientPhoneNumber}`
    );

    await makePatientReminderCall(
      appointment.patientPhoneNumber,
      appointment.patientName
    );

    // Update call attempts atomically
    await db
      .update(appointments)
      .set({
        voiceCallAttempts: sql`${appointments.voiceCallAttempts} + 1`,
        lastCallAttempt: new Date(),
      })
      .where(eq(appointments.id, appointment.id));

    console.log(
      `✅ Call #${attemptNumber} completed for ${appointment.patientName}`
    );

    // Schedule second attempt if this was the first call
    if (attemptNumber === 1) {
      setTimeout(() => {
        attemptPatientCall(appointment, 2, adminPhones);
      }, 5 * 60 * 1000);
    }
  } catch (error: any) {
    console.error(
      `⚠️ Call #${attemptNumber} failed for ${appointment.patientName}:`,
      error.message
    );

    // If second call fails, escalate to admins
    if (attemptNumber === 2) {
      console.log(`🚨 Escalating to admins for ${appointment.patientName}`);
      escalateToAdmins(
        adminPhones,
        appointment.patientName,
        appointment.patientPhoneNumber
      );
    } else {
      // Schedule second attempt after first failure
      setTimeout(() => {
        attemptPatientCall(appointment, 2, adminPhones);
      }, 5 * 60 * 1000);
    }
  }
}

/**
 * Notify all admins about failed patient contact (non-blocking).
 */
function escalateToAdmins(
  adminPhones: string[],
  patientName: string,
  patientPhone: string
): void {
  adminPhones.forEach((adminPhone) => {
    makeAdminNotificationCall(adminPhone, patientName, patientPhone).catch(
      (error) => {
        console.error(
          `❌ Failed to notify admin (${adminPhone}):`,
          error.message
        );
      }
    );
  });
}

/**
 * Stop the scheduler gracefully.
 */
export function stopAppointmentScheduler(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  schedulerRunning = false;
  console.log("🛑 Appointment scheduler stopped");
}
