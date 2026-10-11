import { CheckCircle2, Circle, Clock } from "lucide-react";

export interface ReminderFields {
  status: string;
  dayBeforeReminderAt?: string | null;
  sameDayReminderAt?: string | null;
  missedAt?: string | null;
  missedNotificationSent?: boolean;
  voiceCallAttempts?: number;
  nextCallAt?: string | null;
  relativeNotifiedAt?: string | null;
  escalatedAt?: string | null;
  followUpCompletedAt?: string | null;
}

const fmt = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : null;

/** Shows where an appointment is in the automatic reminder pipeline. */
export function ReminderTimeline({ appointment: a }: { appointment: ReminderFields }) {
  const missed = a.status === "missed" || Boolean(a.missedAt);
  const steps: { label: string; done: boolean; detail?: string | null; pending?: boolean }[] = [
    { label: "Day-before SMS", done: Boolean(a.dayBeforeReminderAt), detail: fmt(a.dayBeforeReminderAt) },
    { label: "Same-day SMS", done: Boolean(a.sameDayReminderAt), detail: fmt(a.sameDayReminderAt) },
  ];

  if (missed) {
    steps.push(
      { label: "Marked missed", done: true, detail: fmt(a.missedAt) },
      { label: "Missed SMS to patient & admins", done: Boolean(a.missedNotificationSent) },
      {
        label: "Follow-up calls (Twi / English IVR)",
        done: (a.voiceCallAttempts ?? 0) > 0,
        detail:
          (a.voiceCallAttempts ?? 0) > 0
            ? `${a.voiceCallAttempts} attempt(s)`
            : a.nextCallAt
              ? `First call ${fmt(a.nextCallAt)}`
              : null,
        pending: Boolean(a.nextCallAt) && !a.followUpCompletedAt && !a.escalatedAt,
      }
    );
    if (a.followUpCompletedAt) {
      steps.push({ label: "Patient reached", done: true, detail: fmt(a.followUpCompletedAt) });
    } else {
      steps.push(
        { label: "Relative notified", done: Boolean(a.relativeNotifiedAt), detail: fmt(a.relativeNotifiedAt) },
        { label: "Escalated to admins", done: Boolean(a.escalatedAt), detail: fmt(a.escalatedAt) }
      );
    }
  } else if (a.status === "completed") {
    steps.push({ label: "Attended", done: true });
  }

  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-3">
          {step.done ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : step.pending ? (
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 shrink-0" />
          )}
          <div className="text-sm">
            <p className={step.done ? "font-medium text-gray-900" : "text-gray-500"}>{step.label}</p>
            {step.detail && <p className="text-xs text-gray-500">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
