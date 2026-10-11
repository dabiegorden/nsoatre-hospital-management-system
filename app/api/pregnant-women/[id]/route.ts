import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  describeDbError,
  missedAppointmentsExtra,
  pickInput,
  toApi,
  userSummary,
} from "@/lib/db-utils";
import { pastRecords, pregnantWomen } from "@/models/schema";
import { requireAdmin } from "@/lib/api-auth";

// GET - Fetch a single pregnant woman record
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params; // ✅ Await params (Next.js 15/16)

    if (!id) {
      return NextResponse.json(
        { message: "Pregnant woman ID is required" },
        { status: 400 }
      );
    }

    const woman = await db.query.pregnantWomen.findFirst({
      where: eq(pregnantWomen.id, id),
      with: { registeredBy: userSummary },
      extras: missedAppointmentsExtra,
    });

    if (!woman) {
      return NextResponse.json(
        { message: "Pregnant woman record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Record fetched successfully",
        data: toApi(woman),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching record:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update a pregnant woman record & archive old record
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params; // ✅ Await params

    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { message: "Pregnant woman ID is required" },
        { status: 400 }
      );
    }

    const [existingWoman] = await db
      .select()
      .from(pregnantWomen)
      .where(eq(pregnantWomen.id, id));

    if (!existingWoman) {
      return NextResponse.json(
        { message: "Pregnant woman record not found" },
        { status: 404 }
      );
    }

    const updates = pickInput(pregnantWomen, body, ["registeredById"]);

    // Archive the current values and apply the update atomically
    await db.batch([
      db.insert(pastRecords).values({
        pregnantWomanId: id,
        bloodPressure: existingWoman.bloodPressure,
        height: existingWoman.height,
        weight: existingWoman.weight,
        gestationalAge: existingWoman.gestationalAge,
        folicAcidSupplements: existingWoman.folicAcidSupplements,
        ironSupplements: existingWoman.ironSupplements,
        hbsAgResult: existingWoman.hbsAgResult,
        g6pdStatus: existingWoman.g6pdStatus,
        sicklingStatus: existingWoman.sicklingStatus,
        itnDistributed: existingWoman.itnDistributed,
        itnDistributionDate: existingWoman.itnDistributionDate,
        syphilisScreeningStatus: existingWoman.syphilisScreeningStatus,
        syphilisTreatment: existingWoman.syphilisTreatment,
        knownHivPositiveBeforePregnancy:
          existingWoman.knownHivPositiveBeforePregnancy,
        artTreatmentBeforePregnancy: existingWoman.artTreatmentBeforePregnancy,
        hivStatusAtRegistration: existingWoman.hivStatusAtRegistration,
        artTreatmentAfterRegistration:
          existingWoman.artTreatmentAfterRegistration,
        hivRetestAt34Weeks: existingWoman.hivRetestAt34Weeks,
        artTreatmentAfterRetest: existingWoman.artTreatmentAfterRetest,
        tbScreeningCoughOver2Weeks: existingWoman.tbScreeningCoughOver2Weeks,
        tbStatus: existingWoman.tbStatus,
        tbTreatment: existingWoman.tbTreatment,
        visitDate: new Date(),
        recordedById: decoded.userId,
      }),
      db
        .update(pregnantWomen)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(pregnantWomen.id, id)),
    ]);

    const updatedWoman = await db.query.pregnantWomen.findFirst({
      where: eq(pregnantWomen.id, id),
      with: { registeredBy: userSummary },
    });

    return NextResponse.json(
      {
        message:
          "Record updated successfully and previous data archived to past records",
        data: toApi(updatedWoman),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating record:", error);

    const dbError = describeDbError(error);
    if (dbError) {
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

// DELETE - Delete pregnant woman record
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    if (decoded instanceof NextResponse) return decoded;

    const { id } = await context.params; // ✅ Await params

    // Visit and past records are removed with the woman (ON DELETE CASCADE);
    // her appointments are kept with their patient reference cleared.
    const [deletedRecord] = await db
      .delete(pregnantWomen)
      .where(eq(pregnantWomen.id, id))
      .returning();

    if (!deletedRecord) {
      return NextResponse.json(
        { message: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Record deleted successfully",
        data: toApi(deletedRecord),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting pregnant woman record:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
