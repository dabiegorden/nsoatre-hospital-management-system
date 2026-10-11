import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  describeDbError,
  getPagination,
  pickInput,
  toApi,
  userSummary,
} from "@/lib/db-utils";
import { pastRecords, pregnantWomen } from "@/models/schema";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";

async function womanExists(id: string) {
  const [woman] = await db
    .select({ id: pregnantWomen.id })
    .from(pregnantWomen)
    .where(eq(pregnantWomen.id, id));
  return Boolean(woman);
}

// GET - Fetch past records for a pregnant woman
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const pregnantWomanId = searchParams.get("pregnantWomanId");
    const { page, limit, offset } = getPagination(searchParams);

    if (!pregnantWomanId) {
      return NextResponse.json(
        { message: "Pregnant woman ID is required" },
        { status: 400 }
      );
    }

    // Verify pregnant woman exists
    if (!(await womanExists(pregnantWomanId))) {
      return NextResponse.json(
        { message: "Pregnant woman record not found" },
        { status: 404 }
      );
    }

    const where = eq(pastRecords.pregnantWomanId, pregnantWomanId);

    const [records, total] = await Promise.all([
      db.query.pastRecords.findMany({
        where,
        with: { recordedBy: userSummary },
        orderBy: desc(pastRecords.visitDate),
        limit,
        offset,
      }),
      db.$count(pastRecords, where),
    ]);

    return NextResponse.json(
      {
        message: "Past records fetched successfully",
        data: toApi(records),
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
    console.error("Error fetching past records:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new past record
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { pregnantWomanId, ...recordData } = body;

    if (!pregnantWomanId) {
      return NextResponse.json(
        { message: "Pregnant woman ID is required" },
        { status: 400 }
      );
    }

    // Verify pregnant woman exists
    if (!(await womanExists(String(pregnantWomanId)))) {
      return NextResponse.json(
        { message: "Pregnant woman record not found" },
        { status: 404 }
      );
    }

    const values = pickInput(pastRecords, recordData, ["recordedById"]);

    const [created] = await db
      .insert(pastRecords)
      .values({
        ...(values as typeof pastRecords.$inferInsert),
        pregnantWomanId: String(pregnantWomanId),
        recordedById: decoded.userId,
      })
      .returning();

    const newRecord = await db.query.pastRecords.findFirst({
      where: eq(pastRecords.id, created.id),
      with: { recordedBy: userSummary },
    });

    return NextResponse.json(
      {
        message: "Past record created successfully",
        data: toApi(newRecord),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating past record:", error);

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
