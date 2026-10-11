import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { describeDbError, pickInput, toApi } from "@/lib/db-utils";
import { appointmentRelations, combineDateTime } from "@/lib/appointments";
import { appointments } from "@/models/schema";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";

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
];

// GET - Fetch single appointment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromCookies(request.headers.get("cookie"));
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

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
  } catch (error: any) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
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
    // Verify admin authentication
    const token = getTokenFromCookies(request.headers.get("cookie"));
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

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

    if (Object.keys(updates).length > 0) {
      await db.update(appointments).set(updates).where(eq(appointments.id, id));
    }

    const updatedAppointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, id),
      with: appointmentRelations,
    });

    return NextResponse.json(
      {
        message: "Appointment updated successfully",
        data: toApi(updatedAppointment),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating appointment:", error);

    const dbError = describeDbError(error);
    if (dbError) {
      return NextResponse.json(
        { message: "Validation error", errors: dbError.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error", error: error.message },
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
    // Verify admin authentication
    const token = getTokenFromCookies(request.headers.get("cookie"));
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

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
  } catch (error: any) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
