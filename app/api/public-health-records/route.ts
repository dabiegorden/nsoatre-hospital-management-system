import { type NextRequest, NextResponse } from "next/server";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  describeDbError,
  getPagination,
  likePattern,
  pickInput,
  toApi,
  userSummary,
} from "@/lib/db-utils";
import { publicHealthRecords } from "@/models/schema";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";

// GET - Fetch all public health records with pagination
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
    if (!decoded || (decoded.role !== "admin" && decoded.role !== "viewer")) {
      return NextResponse.json(
        { message: "Unauthorized - Admin or Viewer access required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPagination(searchParams);
    const search = searchParams.get("search") || "";

    const pattern = likePattern(search);
    const where = search
      ? or(
          ilike(publicHealthRecords.registrationNumber, pattern),
          ilike(publicHealthRecords.childName, pattern),
          ilike(publicHealthRecords.motherName, pattern),
          ilike(publicHealthRecords.name, pattern)
        )
      : undefined;

    const [records, total] = await Promise.all([
      db.query.publicHealthRecords.findMany({
        where,
        with: { recordedBy: userSummary },
        orderBy: desc(publicHealthRecords.createdAt),
        limit,
        offset,
      }),
      db.$count(publicHealthRecords, where),
    ]);

    return NextResponse.json(
      {
        message: "Public health records fetched successfully",
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
    console.error("Error fetching public health records:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new public health record
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
        { message: "Forbidden - Only admin users can create records" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const values = pickInput(publicHealthRecords, body, ["recordedById"]);

    const [created] = await db
      .insert(publicHealthRecords)
      .values({
        ...(values as typeof publicHealthRecords.$inferInsert),
        recordedById: decoded.userId,
      })
      .returning();

    const newRecord = await db.query.publicHealthRecords.findFirst({
      where: eq(publicHealthRecords.id, created.id),
      with: { recordedBy: userSummary },
    });

    return NextResponse.json(
      {
        message: "Public health record created successfully",
        data: toApi(newRecord),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating public health record:", error);

    const dbError = describeDbError(error);
    if (dbError) {
      // Keep the specific message (e.g. duplicate registration number)
      return NextResponse.json(
        { message: dbError.message, errors: dbError.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
