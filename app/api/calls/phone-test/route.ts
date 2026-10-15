import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { placeTestPhoneCall } from "@/lib/calls/place-call";
import { toE164 } from "@/lib/phone";
import { errorMessage } from "@/lib/utils";

/**
 * POST { phoneNumber } - Places the real reminder IVR call to a staff
 * member's own phone (demo patient), to verify phone calling end to end.
 * Logged as a test call: it never changes patient records or alerts staff.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { phoneNumber } = await request.json().catch(() => ({}));
  if (!toE164(phoneNumber)) {
    return NextResponse.json({ message: "Enter a valid phone number" }, { status: 400 });
  }

  try {
    const result = await placeTestPhoneCall({
      phone: phoneNumber,
      name: admin.name,
      initiatedBy: { name: admin.name, email: admin.email },
    });
    if (!result.success) {
      return NextResponse.json(
        { message: result.error || "The call could not be placed", data: result },
        { status: 502 }
      );
    }
    return NextResponse.json({
      message:
        result.provider === "vapi"
          ? "Calling now: answer, then press 1 for Twi or 2 for English."
          : "Vapi could not place the call; the Twi voice message was sent through Arkesel instead.",
      data: result,
    });
  } catch (error) {
    console.error("Phone test call failed:", error);
    return NextResponse.json(
      { message: "Failed to place the test call", error: errorMessage(error) },
      { status: 500 }
    );
  }
}
