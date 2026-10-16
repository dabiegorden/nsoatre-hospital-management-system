import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/api-auth";
import { buildSquadForAppointment } from "@/lib/calls/place-call";
import { appointments, callLogs } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

/**
 * POST { appointmentId } - Prepares a browser test of the reminder IVR for an
 * appointment. Returns the Vapi public key and the same Squad a phone call
 * would use (without webhook secrets, since it is sent to the browser).
 * The test is logged; register the Vapi call id afterwards via PATCH.
 */
export async function POST(request: NextRequest) {
  const caller = await requireStaff(request);
  if (caller instanceof NextResponse) return caller;

  const publicKey = process.env.VAPI_PUBLIC_API_KEY;
  if (!publicKey) {
    return NextResponse.json(
      { message: "VAPI_PUBLIC_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const { appointmentId } = await request.json().catch(() => ({}));
  if (!appointmentId) {
    return NextResponse.json({ message: "appointmentId is required" }, { status: 400 });
  }

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, String(appointmentId)));
  if (!appointment) {
    return NextResponse.json({ message: "Appointment not found" }, { status: 404 });
  }

  try {
    const { squad, language } = await buildSquadForAppointment(appointment, {
      includeServer: false,
    });

    const [log] = await db
      .insert(callLogs)
      .values({
        appointmentId: appointment.id,
        pregnantWomanId: appointment.patientId,
        patientName: appointment.patientName,
        phoneNumber: "browser test",
        provider: "vapi",
        kind: "test",
        language,
        initiatedBy: { name: caller.name, email: caller.email },
      })
      .returning({ id: callLogs.id });

    return NextResponse.json({
      data: { publicKey, squad, callLogId: log.id, language },
    });
  } catch (error) {
    console.error("Error preparing web test call:", error);
    return NextResponse.json(
      { message: "Failed to prepare test call", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
