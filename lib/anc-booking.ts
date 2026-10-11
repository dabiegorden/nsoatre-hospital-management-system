import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { nextAncContact } from "@/lib/anc-schedule";
import { combineDateTime } from "@/lib/appointments";
import { appointments, pregnantWomen, type Appointment } from "@/models/schema";

/**
 * After a visit is completed, books the patient's next WHO antenatal contact
 * (same time and location) unless she already has a future appointment.
 */
export async function bookNextAncContact(completed: Appointment) {
  if (!completed.patientId) return null;

  const [patient] = await db
    .select()
    .from(pregnantWomen)
    .where(eq(pregnantWomen.id, completed.patientId));
  if (!patient) return null;

  const upcoming = await db.$count(
    appointments,
    and(
      eq(appointments.patientId, patient.id),
      eq(appointments.status, "scheduled"),
      gt(appointments.appointmentDateTime, new Date())
    )
  );
  if (upcoming > 0) return null;

  const next = nextAncContact(patient.expectedDeliveryDate);
  if (!next) return null;

  const appointmentDate = new Date(
    Date.UTC(next.date.getUTCFullYear(), next.date.getUTCMonth(), next.date.getUTCDate())
  );

  const [created] = await db
    .insert(appointments)
    .values({
      patientName: patient.fullName,
      patientPhoneNumber: patient.phoneNumber,
      relativePhoneNumber: completed.relativePhoneNumber,
      appointmentLocation: completed.appointmentLocation,
      appointmentDate,
      appointmentTime: completed.appointmentTime,
      appointmentDateTime: combineDateTime(appointmentDate, completed.appointmentTime),
      status: "scheduled",
      notes: `Auto-scheduled: WHO ANC contact ${next.contactNumber} of 8 (${next.week} weeks).`,
      patientId: patient.id,
      createdById: completed.createdById,
      autoScheduledFromId: completed.id,
    })
    .returning();

  return created;
}
