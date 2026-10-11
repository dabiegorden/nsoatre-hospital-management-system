import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  describeDbError,
  getPagination,
  likePattern,
  pickInput,
  toApi,
} from "@/lib/db-utils";
import {
  APPOINTMENT_STATUSES,
  appointmentRelations,
  combineDateTime,
} from "@/lib/appointments";
import { appointments, pregnantWomen } from "@/models/schema";
import { requireAdmin } from "@/lib/api-auth";

// GET - List all appointments with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    // ✅ Get query parameters for pagination and filtering
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPagination(searchParams);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const todayParam = searchParams.get("today");

    // ✅ Build filter query
    const conditions: (SQL | undefined)[] = [];

    if (APPOINTMENT_STATUSES.includes(status as any)) {
      conditions.push(
        eq(
          appointments.status,
          status as (typeof APPOINTMENT_STATUSES)[number]
        )
      );
    }

    if (search) {
      const pattern = likePattern(search);
      conditions.push(
        or(
          ilike(appointments.patientName, pattern),
          ilike(appointments.patientPhoneNumber, pattern)
        )
      );
    }

    // ✅ Apply "today" filter using appointmentDateTime
    if (todayParam === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      conditions.push(
        gte(appointments.appointmentDateTime, today),
        lt(appointments.appointmentDateTime, tomorrow)
      );
    }

    const where = and(...conditions);

    // ✅ Fetch appointments with pagination
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
        message: "Appointments fetched successfully",
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
  } catch (error: any) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new appointment
export async function POST(request: NextRequest) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "patientName",
      "patientPhoneNumber",
      "appointmentDate",
      "appointmentTime",
      "appointmentLocation",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // ✅ Verify pregnant woman exists
    if (!body.patient) {
      return NextResponse.json(
        { message: "Patient ID is required" },
        { status: 400 }
      );
    }

    const [woman] = await db
      .select({ id: pregnantWomen.id })
      .from(pregnantWomen)
      .where(eq(pregnantWomen.id, String(body.patient)));
    if (!woman) {
      return NextResponse.json(
        { message: "Pregnant woman record not found" },
        { status: 404 }
      );
    }

    const values = pickInput(appointments, body, ["createdById", "patientId"]);

    // ✅ Create new appointment
    const [created] = await db
      .insert(appointments)
      .values({
        ...(values as typeof appointments.$inferInsert),
        patientId: woman.id,
        appointmentDateTime: combineDateTime(
          values.appointmentDate!,
          values.appointmentTime!
        ),
        createdById: decoded.userId,
      })
      .returning();

    // ✅ Populate references
    const newAppointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, created.id),
      with: appointmentRelations,
    });

    return NextResponse.json(
      {
        message: "Appointment created successfully",
        data: toApi(newAppointment),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating appointment:", error);

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
