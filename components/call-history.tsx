"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Languages,
  Phone,
  PhoneMissed,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dangerLabel } from "@/lib/labels";

export interface CallLog {
  _id: string;
  appointmentId: string | null;
  pregnantWomanId: string | null;
  patientName: string | null;
  phoneNumber: string | null;
  provider: "vapi" | "arkesel";
  kind: "automatic" | "manual" | "test";
  attempt: number;
  status: "queued" | "ringing" | "in-progress" | "ended" | "failed";
  endedReason: string | null;
  answered: boolean | null;
  language: "twi" | "english" | null;
  durationSeconds: number | null;
  summary: string | null;
  reasonForMissing: string | null;
  reasonCategory: string | null;
  dangerSigns: string[] | null;
  wantsToReschedule: boolean | null;
  preferredReturnDate: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  outcomeProcessedAt: string | null;
  dangerAlertSentAt: string | null;
  error: string | null;
  initiatedBy: { name?: string } | null;
  createdAt: string;
}

function outcomeBadge(log: CallLog) {
  if (log.status === "failed")
    return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Failed</Badge>;
  if (log.status !== "ended")
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 capitalize">
        {log.status.replace("-", " ")}
      </Badge>
    );
  if (log.endedReason === "dry-run")
    return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Dry run</Badge>;
  if (log.provider === "arkesel")
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Twi voice sent</Badge>;
  if (log.answered)
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Answered</Badge>;
  return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">No answer</Badge>;
}

export function CallRow({ log, showPatient }: { log: CallLog; showPatient: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const danger = log.dangerSigns ?? [];

  return (
    <div
      className={`rounded-xl border p-4 ${
        danger.length ? "border-rose-200 bg-rose-50/40" : "border-emerald-100 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              log.answered ? "bg-emerald-100" : "bg-gray-100"
            }`}
          >
            {log.answered ? (
              <Phone className="w-4 h-4 text-emerald-600" />
            ) : (
              <PhoneMissed className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div>
            {showPatient && (
              <p className="font-semibold text-gray-900">{log.patientName ?? "Unknown patient"}</p>
            )}
            <p className="text-sm text-gray-600">
              {new Date(log.createdAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {" · "}
              <span className="capitalize">{log.kind}</span>
              {log.kind === "automatic" && ` · attempt ${log.attempt}`}
              {log.durationSeconds ? ` · ${Math.round(log.durationSeconds)}s` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {log.language && (
            <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-700">
              <Languages className="w-3 h-3" />
              {log.language === "twi" ? "Twi" : "English"}
            </Badge>
          )}
          {outcomeBadge(log)}
        </div>
      </div>

      {danger.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-100/70 p-3 text-sm text-rose-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Danger signs reported</p>
            <p>{danger.map(dangerLabel).join(", ")}</p>
            {log.dangerAlertSentAt && <p className="text-xs mt-1">Admins alerted by SMS.</p>}
            {log.kind === "test" && (
              <p className="text-xs mt-1">Test call: no alert was sent and patient records were not changed.</p>
            )}
          </div>
        </div>
      )}

      {(log.summary || log.reasonForMissing || log.wantsToReschedule) && (
        <div className="mt-3 space-y-1 text-sm text-gray-700">
          {log.summary && <p>{log.summary}</p>}
          {log.reasonForMissing && (
            <p>
              <span className="font-semibold">Reason for missing:</span> {log.reasonForMissing}
            </p>
          )}
          {log.wantsToReschedule && (
            <p className="flex items-center gap-1 text-emerald-700">
              <CalendarCheck className="w-4 h-4" />
              Wants to come back{log.preferredReturnDate ? `: ${log.preferredReturnDate}` : ""}
            </p>
          )}
        </div>
      )}

      {log.error && log.status === "failed" && (
        <p className="mt-2 text-xs text-rose-700 break-words">{log.error}</p>
      )}

      {(log.recordingUrl || log.transcript) && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-emerald-700"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            Recording & transcript
          </Button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {log.recordingUrl && <audio controls src={log.recordingUrl} className="w-full" />}
              {log.transcript && (
                <pre className="whitespace-pre-wrap text-xs bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {log.transcript}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Call history for an appointment or a patient (or all calls, with filters). */
export function CallHistory({
  appointmentId,
  patientId,
  showPatient = false,
  refreshKey = 0,
}: {
  appointmentId?: string;
  patientId?: string;
  showPatient?: boolean;
  refreshKey?: number;
}) {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (appointmentId) params.set("appointmentId", appointmentId);
      if (patientId) params.set("patientId", patientId);
      const res = await fetch(`/api/calls?${params}`, { credentials: "include" });
      const json = await res.json();
      if (res.ok) setCalls(json.data);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, patientId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Refresh while a call is still in progress or awaiting its outcome.
  useEffect(() => {
    const pending = calls.some((c) => !c.outcomeProcessedAt && c.status !== "failed");
    if (!pending) return;
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [calls, load]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-emerald-700" onClick={load}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {!loading && calls.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No calls yet.</p>
      ) : (
        calls.map((log) => <CallRow key={log._id} log={log} showPatient={showPatient} />)
      )}
    </div>
  );
}
