import { type NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { getAnalytics } from "@/lib/analytics";
import { errorMessage } from "@/lib/utils";

// GET ?months=6 - Attendance, reminder effectiveness and call statistics
export async function GET(request: NextRequest) {
  const caller = await requireStaff(request);
  if (caller instanceof NextResponse) return caller;

  const months = Math.min(
    24,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("months") || "6") || 6)
  );
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  try {
    return NextResponse.json({ data: await getAnalytics(from, to) });
  } catch (error) {
    console.error("Error computing analytics:", error);
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
