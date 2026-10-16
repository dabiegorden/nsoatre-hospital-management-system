import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { getPagination, toApi } from "@/lib/db-utils";
import { appointmentRelations } from "@/lib/appointments";
import { appointments } from "@/models/schema";
import { requireStaff } from "@/lib/api-auth";
import { errorMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const decoded = await requireStaff(request);
    if (decoded instanceof NextResponse) return decoded;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPagination(searchParams);
    const patientId = searchParams.get("patientId");

    const where = and(
      inArray(appointments.status, [
        "completed",
        "missed",
        "cancelled",
        "rescheduled",
      ]),
      patientId ? eq(appointments.patientId, patientId) : undefined
    );

    const [rows, total] = await Promise.all([
      db.query.appointments.findMany({
        where,
        with: appointmentRelations,
        orderBy: desc(appointments.appointmentDateTime),
        limit,
        offset,
      }),
      db.$count(appointments, where),
    ]);

    return NextResponse.json(
      {
        message: "Past appointments fetched successfully",
        data: toApi(rows),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching past appointments:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
