import { type NextRequest, NextResponse } from "next/server";
import { arkeselService } from "@/lib/arkesel-service";
import { verifyToken } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, reminderLogs } from "@/models/schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      console.error("[v0] No auth token found in cookies");
      console.error(
        "[v0] Available cookies:",
        request.cookies.getAll().map((c) => c.name)
      );
      return NextResponse.json(
        { message: "Unauthorized - No authentication token found" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token); // ✅ FIXED HERE
    if (!decoded) {
      console.error(
        "[v0] Token verification failed for token:",
        token.substring(0, 20) + "..."
      );
      return NextResponse.json(
        { message: "Unauthorized - Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const voiceFileUrl = body.voiceFileUrl || process.env.ARKESEL_VOICE_URL;

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    if (!appointment)
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );

    if (!appointment.patientPhoneNumber)
      return NextResponse.json(
        { message: "Patient phone number not found" },
        { status: 400 }
      );

    // Voice call
    const voiceResult = await arkeselService.sendVoiceCall({
      recipients: [appointment.patientPhoneNumber],
      voiceFileUrl,
    });

    if (!voiceResult.success) {
      await db.insert(reminderLogs).values({
        appointmentId: id,
        patientName: appointment.patientName,
        patientPhoneNumber: appointment.patientPhoneNumber,
        reminderType: "voice",
        status: "failed",
        error: voiceResult.error,
        sentBy: { name: decoded.name, email: decoded.email },
      });

      return NextResponse.json(
        { message: voiceResult.error || "Failed to make voice call" },
        { status: 500 }
      );
    }

    await db.insert(reminderLogs).values({
      appointmentId: id,
      patientName: appointment.patientName,
      patientPhoneNumber: appointment.patientPhoneNumber,
      reminderType: "voice",
      status: "sent",
      response: voiceResult.data,
      sentBy: { name: decoded.name, email: decoded.email },
      sentAt: new Date(),
    });

    await db
      .update(appointments)
      .set({
        voiceCallAttempts: sql`${appointments.voiceCallAttempts} + 1`,
        lastCallAttempt: new Date(),
      })
      .where(eq(appointments.id, id));

    return NextResponse.json({
      success: true,
      message: "Voice call initiated successfully",
      data: {
        patientPhone: appointment.patientPhoneNumber,
        response: voiceResult.data,
      },
    });
  } catch (error: any) {
    console.error("Send Voice Reminder Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to send voice reminder" },
      { status: 500 }
    );
  }
}
