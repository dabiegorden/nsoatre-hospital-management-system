import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { placeReminderCall } from "@/lib/calls/place-call";
import { appointments } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

// POST - Manually place the reminder IVR call (Twi/English) for an appointment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireStaff(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await params;
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    if (!appointment) {
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );
    }

    const result = await placeReminderCall({
      appointment,
      kind: "manual",
      attempt: appointment.voiceCallAttempts + 1,
      initiatedBy: { name: decoded.name, email: decoded.email },
    });

    await db
      .update(appointments)
      .set({ lastCallAttempt: new Date() })
      .where(eq(appointments.id, id));

    if (!result.success) {
      return NextResponse.json(
        { message: result.error || "Failed to place the call" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        result.provider === "vapi"
          ? "Call started: the patient will choose Twi or English"
          : "Twi voice message sent (Arkesel fallback)",
      data: {
        callLogId: result.callLogId,
        provider: result.provider,
        patientPhone: appointment.patientPhoneNumber,
      },
    });
  } catch (error) {
    console.error("Send Voice Reminder Error:", error);
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to send voice reminder" },
      { status: 500 }
    );
  }
}
