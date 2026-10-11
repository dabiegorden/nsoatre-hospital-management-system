import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  describeDbError,
  getPagination,
  isUniqueViolation,
  likePattern,
  missedAppointmentsExtra,
  pickInput,
  toApi,
  userSummary,
} from "@/lib/db-utils";
import { pregnantWomen } from "@/models/schema";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";

function createErrorResponse(
  status: number,
  type: string,
  message: string,
  details?: any
) {
  return NextResponse.json(
    {
      success: false,
      type, // helps identify which layer failed
      message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

function classifyDbError(error: any): { type: string; status: number } {
  const errorMessage = error?.message || "";

  // Connection / timeout errors
  if (
    errorMessage.includes("timed out") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("Error connecting to database")
  ) {
    return { type: "DB_CONNECTION_ERROR", status: 503 };
  }

  // Validation / constraint errors
  if (describeDbError(error)) {
    return { type: "VALIDATION_ERROR", status: 400 };
  }

  // Default to server error
  return { type: "DB_ERROR", status: 503 };
}

const TEST_RESULTS = ["positive", "negative", "pending"] as const;
type TestResult = (typeof TEST_RESULTS)[number];
const isTestResult = (v: string): v is TestResult =>
  (TEST_RESULTS as readonly string[]).includes(v);

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.headers.get("cookie"));
    if (!token)
      return createErrorResponse(
        401,
        "AUTH_ERROR",
        "Unauthorized - No token provided"
      );

    const decoded = await verifyToken(token).catch((err) => {
      throw { name: "AuthError", message: err.message };
    });

    if (!decoded || decoded.role !== "admin")
      return createErrorResponse(
        403,
        "AUTH_ERROR",
        "Unauthorized - Admin access required"
      );

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = getPagination(searchParams);
    const search = (searchParams.get("search") || "").trim();
    const hivStatus = searchParams.get("hivStatus") || "";
    const tbStatus = searchParams.get("tbStatus") || "";
    const syphilisStatus = searchParams.get("syphilisStatus") || "";

    const conditions: (SQL | undefined)[] = [];
    if (search) {
      const pattern = likePattern(search);
      conditions.push(
        or(
          ilike(pregnantWomen.fullName, pattern),
          ilike(pregnantWomen.phoneNumber, pattern),
          ilike(pregnantWomen.residentialAddress, pattern)
        )
      );
    }
    if (isTestResult(hivStatus))
      conditions.push(eq(pregnantWomen.hivStatusAtRegistration, hivStatus));
    if (isTestResult(tbStatus))
      conditions.push(eq(pregnantWomen.tbStatus, tbStatus));
    if (isTestResult(syphilisStatus))
      conditions.push(
        eq(pregnantWomen.syphilisScreeningStatus, syphilisStatus)
      );

    const where = and(...conditions);

    try {
      const [records, total] = await Promise.all([
        db.query.pregnantWomen.findMany({
          where,
          with: { registeredBy: userSummary },
          extras: missedAppointmentsExtra,
          orderBy: desc(pregnantWomen.createdAt),
          limit,
          offset,
        }),
        db.$count(pregnantWomen, where),
      ]);

      return NextResponse.json(
        {
          success: true,
          message: "Records fetched successfully",
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
    } catch (queryError: any) {
      // Handle query-specific errors
      const { type, status } = classifyDbError(queryError);
      return createErrorResponse(
        status,
        type,
        "Database query failed",
        queryError.message
      );
    }
  } catch (error: any) {
    console.error("[API ERROR - PregnantWomen.GET]:", error);

    if (error.name === "AuthError")
      return createErrorResponse(401, "AUTH_ERROR", error.message);

    const { type, status } = classifyDbError(error);
    return createErrorResponse(
      status,
      type,
      "Unexpected internal server error: Happened in the GET API endpoint.",
      error.message
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookies(request.headers.get("cookie"));
    if (!token)
      return createErrorResponse(
        401,
        "AUTH_ERROR",
        "Unauthorized - No token provided"
      );

    const decoded = await verifyToken(token).catch((err) => {
      throw { name: "AuthError", message: err.message };
    });

    if (!decoded || decoded.role !== "admin")
      return createErrorResponse(
        403,
        "AUTH_ERROR",
        "Unauthorized - Admin access required"
      );

    const body = await request.json();
    const processedBody = {
      ...body,
      age: Number(body.age),
      height: Number(body.height),
      weight: Number(body.weight),
      gestationalAge: Number(body.gestationalAge),
    };

    const requiredFields = [
      "fullName",
      "residentialAddress",
      "phoneNumber",
      "age",
      "parity",
      "bloodPressure",
      "height",
      "weight",
      "gestationalAge",
      "expectedDeliveryDate",
      "bloodGroup",
      "rhFactor",
      "folderNumber",
      "maritalStatus",
    ];

    for (const field of requiredFields) {
      if (!processedBody[field])
        return createErrorResponse(
          400,
          "VALIDATION_ERROR",
          `${field} is required`
        );
    }

    const values = pickInput(pregnantWomen, processedBody, ["registeredById"]);

    const [existingRecord] = await db
      .select({ id: pregnantWomen.id })
      .from(pregnantWomen)
      .where(eq(pregnantWomen.phoneNumber, values.phoneNumber!));

    if (existingRecord)
      return createErrorResponse(
        400,
        "DUPLICATE_ERROR",
        "A record with this phone number already exists"
      );

    const [created] = await db
      .insert(pregnantWomen)
      .values({
        ...(values as typeof pregnantWomen.$inferInsert),
        registeredById: decoded.userId,
      })
      .returning();

    const newRecord = await db.query.pregnantWomen.findFirst({
      where: eq(pregnantWomen.id, created.id),
      with: { registeredBy: userSummary },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Record created successfully",
        data: toApi(newRecord),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API ERROR - PregnantWomen.POST]:", error);

    if (error.name === "AuthError")
      return createErrorResponse(401, "AUTH_ERROR", error.message);

    const dbError = describeDbError(error);
    if (dbError)
      return createErrorResponse(
        400,
        isUniqueViolation(error) ? "DUPLICATE_ERROR" : "VALIDATION_ERROR",
        dbError.message,
        dbError.errors
      );

    const { type, status } = classifyDbError(error);
    return createErrorResponse(
      status,
      type,
      "Unexpected internal server error: Happened in the POST API endpoint.",
      error.message
    );
  }
}
