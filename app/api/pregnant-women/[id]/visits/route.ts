import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  describeDbError,
  pickInput,
  toApi,
  userSummary,
} from "@/lib/db-utils";
import { pregnantWomen, visitRecords } from "@/models/schema";
import { requireAdmin } from "@/lib/api-auth";
import { errorMessage } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "Pregnant woman ID is required" },
        { status: 400 }
      );
    }

    const visits = await db.query.visitRecords.findMany({
      where: eq(visitRecords.pregnantWomanId, id),
      with: { recordedBy: userSummary },
      orderBy: desc(visitRecords.visitDate),
    });

    return NextResponse.json(
      {
        message: "Visit records fetched successfully",
        data: toApi(visits),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching visit records:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { message: "Pregnant woman ID is required" },
        { status: 400 }
      );
    }

    // Verify pregnant woman exists
    const [woman] = await db
      .select({ id: pregnantWomen.id })
      .from(pregnantWomen)
      .where(eq(pregnantWomen.id, id));
    if (!woman) {
      return NextResponse.json(
        { message: "Pregnant woman record not found" },
        { status: 404 }
      );
    }

    const requiredFields = [
      "gestationalAge",
      "bloodPressure",
      "weight",
      "visitDate",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const values = pickInput(
      visitRecords,
      { ...body, complaint: body.complaint || "" },
      ["pregnantWomanId", "recordedById"]
    );

    const [created] = await db
      .insert(visitRecords)
      .values({
        ...(values as typeof visitRecords.$inferInsert),
        pregnantWomanId: id,
        recordedById: decoded.userId,
      })
      .returning();

    const newVisitRecord = await db.query.visitRecords.findFirst({
      where: eq(visitRecords.id, created.id),
      with: { recordedBy: userSummary },
    });

    return NextResponse.json(
      {
        message: "Visit record created successfully",
        data: toApi(newVisitRecord),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating visit record:", error);

    const dbError = describeDbError(error);
    if (dbError) {
      return NextResponse.json(
        { message: "Validation error", errors: dbError.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
