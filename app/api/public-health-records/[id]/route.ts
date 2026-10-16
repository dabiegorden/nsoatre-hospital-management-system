import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  describeDbError,
  pickInput,
  toApi,
  userSummary,
} from "@/lib/db-utils";
import { publicHealthRecords } from "@/models/schema";
import { requireAdmin, requireStaff } from "@/lib/api-auth";
import { errorMessage } from "@/lib/utils";

function findRecord(id: string) {
  return db.query.publicHealthRecords.findFirst({
    where: eq(publicHealthRecords.id, id),
    with: { recordedBy: userSummary },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireStaff(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params;

    const record = await findRecord(id);

    if (!record) {
      return NextResponse.json(
        { message: "Public health record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Public health record fetched successfully",
        data: toApi(record),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Error fetching public health record:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireStaff(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params;
    const body = await request.json();
    const updates = pickInput(publicHealthRecords, body, ["recordedById"]);

    const [updated] = await db
      .update(publicHealthRecords)
      .set({ ...updates, recordedById: decoded.userId })
      .where(eq(publicHealthRecords.id, id))
      .returning({ id: publicHealthRecords.id });

    if (!updated) {
      return NextResponse.json(
        { message: "Public health record not found" },
        { status: 404 }
      );
    }

    const updatedRecord = await findRecord(id);

    return NextResponse.json(
      {
        message: "Public health record updated successfully",
        data: toApi(updatedRecord),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Error updating public health record:", error);

    const dbError = describeDbError(error);
    if (dbError) {
      return NextResponse.json(
        { message: dbError.message, errors: dbError.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params;

    const [deletedRecord] = await db
      .delete(publicHealthRecords)
      .where(eq(publicHealthRecords.id, id))
      .returning();

    if (!deletedRecord) {
      return NextResponse.json(
        { message: "Public health record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Public health record deleted successfully",
        data: toApi(deletedRecord),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Error deleting public health record:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
