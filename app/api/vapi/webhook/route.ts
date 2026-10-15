import { type NextRequest, NextResponse } from "next/server";
import { secretsMatch } from "@/lib/api-auth";
import { applyVapiCall, applyVapiStatus } from "@/lib/calls/outcome";
import type { VapiCall } from "@/lib/vapi/client";

/** The parts of a Vapi server message this route reads. */
type VapiServerMessage = Partial<Omit<VapiCall, "id">> & {
  type?: string;
  call?: VapiCall;
};

// Receives Vapi server events for reminder calls (see lib/vapi/ivr.ts).
export async function POST(request: NextRequest) {
  if (!secretsMatch(request.headers.get("x-vapi-secret"), process.env.VAPI_WEBHOOK_SECRET)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let message: VapiServerMessage | undefined;
  try {
    ({ message } = (await request.json()) as { message?: VapiServerMessage });
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const vapiCall = message?.call;
  if (!message || !vapiCall?.id) return NextResponse.json({});

  try {
    switch (message.type) {
      case "status-update":
        // Live status only; the outcome comes from the end-of-call report.
        await applyVapiStatus({ ...vapiCall, status: message.status ?? vapiCall.status });
        break;
      case "end-of-call-report": {
        const call: VapiCall = {
          ...vapiCall,
          status: "ended",
          endedReason: message.endedReason ?? vapiCall.endedReason,
          startedAt: message.startedAt ?? vapiCall.startedAt,
          endedAt: message.endedAt ?? vapiCall.endedAt,
          cost: message.cost ?? vapiCall.cost,
          artifact: { ...vapiCall.artifact, ...message.artifact },
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
