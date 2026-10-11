import { type NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";
import {
  appointments,
  pastRecords,
  pregnantWomen,
  publicHealthRecords,
  reminderLogs,
  users,
} from "@/models/schema";

// GET - Fetch dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.headers.get("cookie"));
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    // ✅ Await token verification (jose is async)
    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

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
      db.$count(
        reminderLogs,
        and(
          eq(reminderLogs.reminderType, "voice"),
          eq(reminderLogs.status, "sent")
        )
      ),
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
    ]);

    return NextResponse.json(
      {
        message: "Dashboard statistics fetched successfully",
        data: {
          totalPregnantWomen,
          appointmentsToday,
          smsSent: smsSentCount,
          callsMade: callsMadeCount,
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
