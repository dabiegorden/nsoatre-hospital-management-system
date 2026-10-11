import { type NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import {
  appointments,
  callLogs,
  pastRecords,
  pregnantWomen,
  publicHealthRecords,
  reminderLogs,
  users,
} from "@/models/schema";

// GET - Fetch dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalPregnantWomen,
      appointmentsToday,
      completedAppointments,
      totalAppointments,
      smsSentCount,
      callsMadeCount,
      totalUsers,
      pastAppointments,
      pastRecordsCount,
      publicHealthRecordsCount,
      smsFailedCount,
      callsAnsweredCount,
    ] = await Promise.all([
      db.$count(pregnantWomen),
      db.$count(
        appointments,
        and(
          gte(appointments.appointmentDate, today),
          lt(appointments.appointmentDate, tomorrow),
          inArray(appointments.status, ["scheduled", "completed"])
        )
      ),
      db.$count(appointments, eq(appointments.status, "completed")),
      db.$count(appointments),
      db.$count(
        reminderLogs,
        and(
          eq(reminderLogs.reminderType, "sms"),
          eq(reminderLogs.status, "sent")
        )
      ),
      db.$count(callLogs, ne(callLogs.kind, "test")),
      db.$count(users),
      db.$count(
        appointments,
        inArray(appointments.status, [
          "completed",
          "missed",
          "cancelled",
          "rescheduled",
        ])
      ),
      db.$count(pastRecords),
      db.$count(publicHealthRecords),
      db.$count(
        reminderLogs,
        and(eq(reminderLogs.reminderType, "sms"), eq(reminderLogs.status, "failed"))
      ),
      db.$count(callLogs, and(ne(callLogs.kind, "test"), eq(callLogs.answered, true))),
    ]);

    return NextResponse.json(
      {
        message: "Dashboard statistics fetched successfully",
        data: {
          totalPregnantWomen,
          appointmentsToday,
          smsSent: smsSentCount,
          callsMade: callsMadeCount,
          callsAnswered: callsAnsweredCount,
          smsFailed: smsFailedCount,
          completedAppointments,
          totalAppointments,
          totalUsers,
          pastAppointments,
          pastRecords: pastRecordsCount,
          publicHealthRecords: publicHealthRecordsCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching dashboard statistics:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
