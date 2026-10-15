"use client";

import { useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import { Headphones, Loader2, Mic, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/lib/utils";

type Phase = "idle" | "connecting" | "live" | "ended";

/** The fields of a Vapi web "message" event used for the live transcript. */
interface TranscriptMessage {
  type?: string;
  transcriptType?: string;
  role?: string;
  transcript?: string;
}

interface Line {
  role: "assistant" | "user";
  text: string;
}

/**
 * Runs the real reminder IVR (Twi / English menu → recording or AI nurse) as a
 * browser call through the Vapi Web SDK. Say "Twi" or "English" at the menu;
 * keypad digits are not available in a browser call.
 */
export function IvrTestCall({
  appointmentId,
  onFinished,
}: {
  appointmentId: string;
  onFinished?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const vapiRef = useRef<Vapi | null>(null);
  const logIdRef = useRef<string | null>(null);

  useEffect(() => () => void vapiRef.current?.stop(), []);

  const patchLog = (body: Record<string, unknown>) =>
    logIdRef.current
      ? fetch(`/api/calls/web-test/${logIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }).catch(() => undefined)
      : undefined;

  const start = async () => {
    setLines([]);
    setPhase("connecting");
    try {
      const res = await fetch("/api/calls/web-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appointmentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not prepare the call");
      const { publicKey, squad, callLogId } = json.data;
      logIdRef.current = callLogId;

      const { default: VapiClient } = await import("@vapi-ai/web");
      const vapi = new VapiClient(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => setPhase("live"));
      vapi.on("speech-start", () => setAssistantSpeaking(true));
      vapi.on("speech-end", () => setAssistantSpeaking(false));
      vapi.on("message", (message: TranscriptMessage) => {
        if (
          message?.type === "transcript" &&
          message.transcriptType === "final" &&
          message.transcript
        ) {
          const text = message.transcript;
          setLines((prev) => [
            ...prev,
            { role: message.role === "user" ? "user" : "assistant", text },
          ]);
        }
      });
      vapi.on("call-end", () => {
        setPhase("ended");
        setAssistantSpeaking(false);
        toast.success("Test call ended. The outcome will appear in Call history shortly.");
        onFinished?.();
      });
      vapi.on("error", (error: unknown) => {
        console.error("Vapi web call error:", error);
        // The SDK usually wraps the real error as `{ error: { message } }`.
        const inner =
          error && typeof error === "object" && "error" in error
            ? errorMessage(error.error)
            : "";
        toast.error(inner || errorMessage(error) || "Call error");
      });

      const call = await vapi.start(undefined, undefined, squad);
      if (call?.id) await patchLog({ vapiCallId: call.id });
      else {
        await patchLog({ failed: "Browser call did not start" });
        setPhase("idle");
      }
    } catch (error) {
      await patchLog({ failed: errorMessage(error) });
      toast.error(errorMessage(error) || "Failed to start the test call");
      setPhase("idle");
    }
  };

  const stop = () => {
    vapiRef.current?.stop();
    setPhase("ended");
  };

  const close = (next: boolean) => {
    if (!next && phase === "live") stop();
    setOpen(next);
    if (!next) setPhase("idle");
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        onClick={() => setOpen(true)}
      >
        <Headphones className="w-4 h-4" />
        Test IVR call in browser
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-emerald-600" />
              Reminder IVR test call
            </DialogTitle>
            <DialogDescription>
              This plays exactly what the patient hears. At the menu, say{" "}
              <strong>&quot;Twi&quot;</strong> to hear the recorded Twi message or{" "}
              <strong>&quot;English&quot;</strong> to talk with the AI nurse. Allow microphone
              access when asked.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 min-h-40 max-h-72 overflow-y-auto space-y-2">
            {lines.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">
                {phase === "connecting"
                  ? "Connecting…"
                  : phase === "live"
                    ? "Listening… the transcript appears here."
                    : "Start the call to hear the IVR."}
              </p>
            ) : (
              lines.map((line, i) => (
                <div
                  key={i}
                  className={`text-sm rounded-lg px-3 py-2 max-w-[85%] ${
                    line.role === "assistant"
                      ? "bg-white border border-emerald-100 text-gray-800"
                      : "bg-emerald-600 text-white ml-auto"
                  }`}
                >
                  {line.text}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              {phase === "live" && (
                <>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      assistantSpeaking ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                    }`}
                  />
                  {assistantSpeaking ? "Assistant speaking" : "Your turn"}
                </>
              )}
              {phase === "ended" && "Call ended"}
            </span>
            {phase === "live" ? (
              <Button onClick={stop} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
                <PhoneOff className="w-4 h-4" />
                End call
              </Button>
            ) : (
              <Button
                onClick={start}
                disabled={phase === "connecting"}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {phase === "connecting" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                {phase === "ended" ? "Call again" : "Start call"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
