import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { findDefaulters } from "@/lib/defaulters";
import { errorMessage } from "@/lib/utils";

// GET - Patients who keep missing visits or could not be reached
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    const defaulters = await findDefaulters();
    return NextResponse.json({ data: defaulters });
  } catch (error) {
    console.error("Error fetching defaulters:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
