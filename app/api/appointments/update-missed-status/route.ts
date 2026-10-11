import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments } from "@/models/schema";

// POST - Auto-update missed status for appointments that have passed
export async function POST() {
  try {
    const now = new Date();

    // Mark all scheduled appointments that have passed and haven't been processed yet
    const updated = await db
      .update(appointments)
      .set({ status: "missed", missedCheckProcessed: true })
      .where(
        and(
          eq(appointments.status, "scheduled"),
          lt(appointments.appointmentDateTime, now),
          eq(appointments.missedCheckProcessed, false)
        )
      )
      .returning({ id: appointments.id });

    console.log(`[v0] Auto-updated ${updated.length} missed appointments`);

    return NextResponse.json(
      {
        message: "Missed appointments status updated",
        updatedCount: updated.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating missed appointments:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
