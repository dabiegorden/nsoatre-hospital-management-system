import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { describeDbError, pickInput, toApi } from "@/lib/db-utils";
import { appointmentRelations, combineDateTime } from "@/lib/appointments";
import { bookNextAncContact } from "@/lib/anc-booking";
import { reminderConfig } from "@/lib/reminders/config";
import { appointments, type Appointment } from "@/models/schema";
import { requireAdmin } from "@/lib/api-auth";
import { errorMessage } from "@/lib/utils";

// Fields managed by the system that clients may not set directly.
const SYSTEM_MANAGED = [
  "createdById",
  "patientId",
  "missedNotificationSent",
  "voiceCallAttempts",
  "lastCallAttempt",
  "callAttempts",
  "reminderSent",
  "missedCheckProcessed",
  "dayBeforeReminderAt",
  "sameDayReminderAt",
  "missedAt",
  "nextCallAt",
  "relativeNotifiedAt",
  "escalatedAt",
  "followUpCompletedAt",
  "autoScheduledFromId",
];

// Clears the automatic reminder pipeline when an appointment is rescheduled.
const REMINDER_RESET = {
  dayBeforeReminderAt: null,
  sameDayReminderAt: null,
  missedAt: null,
  nextCallAt: null,
  relativeNotifiedAt: null,
  escalatedAt: null,
  followUpCompletedAt: null,
  missedNotificationSent: false,
  missedCheckProcessed: false,
  voiceCallAttempts: 0,
};

// GET - Fetch single appointment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await params;

    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: appointmentRelations,
    });

    if (!appointment) {
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Appointment fetched successfully",
        data: toApi(appointment),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}

// PATCH - Update appointment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await params;
    const body = await request.json();

    const existing = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );
    }

    const updates = pickInput(appointments, body, SYSTEM_MANAGED);

    // The API exposes the patient reference as `patient`
    if (body.patient !== undefined) {
      updates.patientId =
        typeof body.patient === "object" && body.patient
          ? body.patient._id
          : body.patient || null;
    }

    // ✅ Recalculate appointmentDateTime if date or time changed
    if (updates.appointmentDate || updates.appointmentTime) {
      updates.appointmentDateTime = combineDateTime(
        updates.appointmentDate ?? existing.appointmentDate,
        updates.appointmentTime ?? existing.appointmentTime
      );
    }

    const newStatus = updates.status ?? existing.status;
    const statusChanged = newStatus !== existing.status;
    const timeChanged =
      updates.appointmentDateTime !== undefined &&
      updates.appointmentDateTime.getTime() !== existing.appointmentDateTime.getTime();

    // Rescheduling (new time, or back to "scheduled") restarts the reminders.
    if (newStatus === "scheduled" && (timeChanged || statusChanged)) {
      Object.assign(updates, REMINDER_RESET);
    }
    // Staff marking a visit missed starts the follow-up chain.
    if (statusChanged && newStatus === "missed" && !existing.missedAt) {
      Object.assign(updates, {
        missedAt: new Date(),
        missedCheckProcessed: true,
        nextCallAt: new Date(Date.now() + reminderConfig.firstCallDelay),
      });
    }

    if (Object.keys(updates).length > 0) {
      await db.update(appointments).set(updates).where(eq(appointments.id, id));
    }

    // A completed visit books the next WHO antenatal contact automatically.
    let nextAppointment = null;
    if (statusChanged && newStatus === "completed") {
      try {
        nextAppointment = await bookNextAncContact({ ...existing, ...updates } as Appointment);
      } catch (error) {
        console.error("Failed to book next ANC contact:", error);
      }
    }

    const updatedAppointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: appointmentRelations,
    });

    return NextResponse.json(
      {
        message: nextAppointment
          ? "Appointment updated. Next antenatal visit booked automatically."
          : "Appointment updated successfully",
        data: toApi(updatedAppointment),
        nextAppointment: nextAppointment ? toApi(nextAppointment) : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating appointment:", error);

    const dbError = describeDbError(error);
    if (dbError) {
      return NextResponse.json(
        { message: "Validation error", errors: dbError.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await params;

    const [deletedAppointment] = await db
      .delete(appointments)
      .where(eq(appointments.id, id))
      .returning();

    if (!deletedAppointment) {
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Appointment deleted successfully",
        data: toApi(deletedAppointment),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
