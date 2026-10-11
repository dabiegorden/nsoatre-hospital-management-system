import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { findDefaulters } from "@/lib/defaulters";

// GET - Patients who keep missing visits or could not be reached
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const defaulters = await findDefaulters();
    return NextResponse.json({ data: defaulters });
  } catch (error: any) {
    console.error("Error fetching defaulters:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
