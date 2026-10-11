import { type NextRequest, NextResponse } from "next/server";
import { secretsMatch } from "@/lib/api-auth";
import { applyVapiCall, applyVapiStatus } from "@/lib/calls/outcome";
import type { VapiCall } from "@/lib/vapi/client";

// Receives Vapi server events for reminder calls (see lib/vapi/ivr.ts).
export async function POST(request: NextRequest) {
  if (!secretsMatch(request.headers.get("x-vapi-secret"), process.env.VAPI_WEBHOOK_SECRET)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let message: any;
  try {
    ({ message } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!message?.call?.id) return NextResponse.json({});

  try {
    switch (message.type) {
      case "status-update":
        // Live status only; the outcome comes from the end-of-call report.
        await applyVapiStatus({ ...message.call, status: message.status ?? message.call.status });
        break;
      case "end-of-call-report": {
        const call: VapiCall = {
          ...message.call,
          status: "ended",
          endedReason: message.endedReason ?? message.call.endedReason,
          startedAt: message.startedAt ?? message.call.startedAt,
          endedAt: message.endedAt ?? message.call.endedAt,
          cost: message.cost ?? message.call.cost,
          artifact: { ...message.call.artifact, ...message.artifact },
        };
        await applyVapiCall(call);
        break;
      }
    }
  } catch (error) {
    // Acknowledge anyway; the reminder tick re-fetches unresolved calls.
    console.error("[vapi webhook] Failed to process event:", error);
  }

  return NextResponse.json({});
}
