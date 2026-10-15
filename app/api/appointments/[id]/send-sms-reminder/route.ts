import { type NextRequest, NextResponse } from "next/server";
import { arkeselService } from "@/lib/arkesel-service";
import { verifyToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, reminderLogs, users } from "@/models/schema";
import { errorMessage } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- Authentication ---
    const token = request.cookies.get("auth-token")?.value;
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = await verifyToken(token); // ✅ FIXED
    if (!decoded)
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });

    // --- Extract request data ---
    const { id } = await params;
    const body = await request.json();
    const { message } = body;
    if (!message)
      return NextResponse.json(
        { message: "SMS message is required" },
        { status: 400 }
      );

    // --- Find appointment ---
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    if (!appointment)
      return NextResponse.json(
        { message: "Appointment not found" },
        { status: 404 }
      );

    // --- Get admin phone numbers ---
    const admins = await db
      .select({ phoneNumber: users.phoneNumber })
      .from(users)
      .where(eq(users.role, "admin"));
    const adminPhones = admins
      .map((a) => a.phoneNumber)
      .filter(Boolean) as string[];

    // --- Send message to admins ---
    if (adminPhones.length > 0) {
      const adminMessage = `
A patient has missed their scheduled appointment.
Please reach out and follow up at your earliest convenience.
or contact them through: ${appointment.patientPhoneNumber}, Patient Name: ${appointment.patientName}`.trim();

      const adminSmsResult = await arkeselService.sendSMS({
        recipients: adminPhones,
        message: adminMessage,
      });

      if (adminSmsResult.success) {
        await db.insert(reminderLogs).values({
          appointmentId: id,
          patientName: appointment.patientName,
          patientPhoneNumber: appointment.patientPhoneNumber,
          reminderType: "sms",
          status: "sent",
          message: adminMessage,
          response: adminSmsResult.data,
          sentBy: { name: decoded.name, email: decoded.email },
          sentAt: new Date(),
        });
      } else {
        console.error("Admin SMS failed:", adminSmsResult.error);
      }
    }

    // --- Prepare patient message ---
    const formattedAdminNumbers =
      adminPhones.length > 0
        ? adminPhones.join(", ")
        : "our office at 0XXXXXXXXX";

    const patientMessage = `
Dear valued patient,
This is a gentle reminder that your appointment is scheduled for today.
If you have any questions or need to reschedule, please contact our staff at ${formattedAdminNumbers}.
Best regards Nsoatre Hospital Antenatal Care.
`.trim();

    // --- Send message to patient ---
    const patientSmsResult = await arkeselService.sendSMS({
      recipients: [appointment.patientPhoneNumber],
      message: patientMessage,
    });

    if (!patientSmsResult.success) {
      await db.insert(reminderLogs).values({
        appointmentId: id,
        patientName: appointment.patientName,
        patientPhoneNumber: appointment.patientPhoneNumber,
        reminderType: "sms",
        status: "failed",
        message: patientMessage,
        error: patientSmsResult.error,
        sentBy: { name: decoded.name, email: decoded.email },
      });
      return NextResponse.json(
        { message: patientSmsResult.error || "Failed to send SMS" },
        { status: 500 }
      );
    }

    // --- Log success ---
    await db.insert(reminderLogs).values({
      appointmentId: id,
      patientName: appointment.patientName,
      patientPhoneNumber: appointment.patientPhoneNumber,
      reminderType: "sms",
      status: "sent",
      message: patientMessage,
      response: patientSmsResult.data,
      sentBy: { name: decoded.name, email: decoded.email },
      sentAt: new Date(),
    });

    // --- Update appointment ---
    await db
      .update(appointments)
      .set({ missedNotificationSent: true })
      .where(eq(appointments.id, id));

    return NextResponse.json({
      success: true,
      message: "SMS reminders sent successfully",
      data: {
        adminCount: adminPhones.length,
        patientSent: true,
        response: patientSmsResult.data,
      },
    });
  } catch (error) {
    console.error("Send SMS Reminder Error:", error);
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to send SMS reminder" },
      { status: 500 }
    );
  }
}
