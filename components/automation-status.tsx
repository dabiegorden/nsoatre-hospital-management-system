"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, Phone, Play, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Status {
  schedulerEnabled: boolean;
  environment: string;
  healthy: boolean;
  lastRunAt: string | null;
  lastResult: (Record<string, unknown> & { errors?: string[] }) | null;
  vapiConfigured: boolean;
  webhookConfigured: boolean;
  twiAudioConfigured: boolean;
  adminAlertPhones: number;
  callHours: { start: number; end: number };
  missedGraceMinutes: number;
}

const RESULT_LABELS: Record<string, string> = {
  dayBefore: "Day-before SMS",
  sameDay: "Same-day SMS",
  markedMissed: "Marked missed",
  missedSms: "Missed SMS",
  callsPlaced: "Calls placed",
  escalated: "Escalated",
  callsReconciled: "Call outcomes",
  deliveryReadiness: "Delivery-readiness SMS",
};

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-sm ${ok ? "text-emerald-700" : "text-gray-500"}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {label}
    </span>
  );
}

function statusLine(status: Status | null) {
  if (!status) return "Checking…";
  if (!status.schedulerEnabled) {
    return status.environment !== "production"
      ? "Scheduler off in development (set REMINDERS_IN_DEV=true to run it here). Use Run now to test."
      : "Scheduler disabled on this server (REMINDERS_ENABLED=false)";
  }
  if (status.healthy) {
    return `Running · last check ${new Date(status.lastRunAt!).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return status.lastRunAt
    ? `Last check ${new Date(status.lastRunAt).toLocaleString("en-GB")} — scheduler may be stopped`
    : "Waiting for the first check";
}

/** Live health of the automatic reminder system, with "run now" and a test call. */
export function AutomationStatus({ defaultPhone = "" }: { defaultPhone?: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [testPhone, setTestPhone] = useState(defaultPhone);
  const [calling, setCalling] = useState(false);

  const load = () =>
    fetch("/api/reminders/status", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => json.data && setStatus(json.data))
      .catch(() => undefined);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (defaultPhone) setTestPhone((p) => p || defaultPhone);
  }, [defaultPhone]);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/reminders/tick", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      if (json.data.skipped) toast.info("A reminder run is already in progress.");
      else if (json.data.errors?.length) toast.warning("Reminder check finished with errors");
      else toast.success("Reminder check completed");
      await load();
    } catch (error: any) {
      toast.error(error.message || "Reminder run failed");
    } finally {
      setRunning(false);
    }
  };

  const testCall = async () => {
    setCalling(true);
    try {
      const res = await fetch("/api/calls/phone-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: testPhone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(json.message);
    } catch (error: any) {
      toast.error(error.message || "Test call failed");
    } finally {
      setCalling(false);
    }
  };

  const result = status?.lastResult ?? {};
  const errors = Array.isArray(result.errors) ? result.errors : [];
  const actions = Object.entries(RESULT_LABELS)
    .map(([key, label]) => ({ label, value: Number(result[key] ?? 0) }))
    .filter((a) => a.value > 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${status?.healthy ? "bg-emerald-100" : "bg-amber-100"}`}>
            <Activity className={`w-6 h-6 ${status?.healthy ? "text-emerald-600" : "text-amber-600"}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reminder Automation</h2>
            <p className="text-sm text-gray-600">{statusLine(status)}</p>
          </div>
        </div>
        <Button onClick={runNow} disabled={running} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run now
        </Button>
      </div>

      {status && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
            <Check ok={status.vapiConfigured} label="AI calls (Vapi)" />
            <Check ok={status.twiAudioConfigured} label="Twi recording" />
            <Check ok={status.webhookConfigured} label="Live call webhook" />
            <Check
              ok={status.adminAlertPhones > 0}
              label={
                status.adminAlertPhones > 0
                  ? `Admin alert SMS (${status.adminAlertPhones} number${status.adminAlertPhones === 1 ? "" : "s"})`
                  : "Admin alert SMS (no admin phone numbers — add one under Users)"
              }
            />
          </div>
          <p className="text-xs text-gray-500">
            SMS the day before and on the day; a visit counts as missed {status.missedGraceMinutes} min after
            its time, then the patient is texted and called (Twi or English) between{" "}
            {status.callHours.start}:00 and {status.callHours.end}:00, then her relative and the admins.
            {!status.webhookConfigured && " Without a public APP_URL, call results are fetched each minute instead."}
          </p>

          {actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((a) => (
                <span key={a.label} className="text-xs bg-emerald-50 text-emerald-800 rounded-full px-3 py-1">
                  {a.label}: <strong>{a.value}</strong>
                </span>
              ))}
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Last check had {errors.length} error{errors.length > 1 ? "s" : ""}
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs space-y-0.5">
                {errors.map((e) => (
                  <li key={e} className="break-words">{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-emerald-100">
            <p className="text-sm font-semibold text-gray-800 mb-2">Test a real reminder call</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Your phone, e.g. 0244123456"
                className="h-10 sm:max-w-xs"
                aria-label="Phone number for test call"
              />
              <Button
                onClick={testCall}
                disabled={calling || !testPhone.trim()}
                variant="outline"
                className="h-10 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                Call my phone
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Places the exact patient call to your phone. Test calls never change patient records or alert staff.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
