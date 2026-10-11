import type { RiskLevel } from "@/lib/risk";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Timing of the automatic reminder pipeline. Times are Africa/Accra (UTC+0). */
export const reminderConfig = {
  /** Reminder SMS the day before, sent from this long before the appointment. */
  dayBeforeLead: 24 * HOUR,
  /** Same-day reminder SMS lead time. */
  sameDayLead: 3 * HOUR,
  /**
   * How long after the appointment time it is treated as missed if staff have
   * not marked it completed. Staff should mark arrivals before this passes.
   */
  missedGrace: envNumber("REMINDER_MISSED_GRACE_MINUTES", 15) * MINUTE,
  /** Delay between the missed SMS and the first call. */
  firstCallDelay: 5 * MINUTE,
  /** SMS are only sent between these hours; calls use the narrower window. */
  smsHours: { start: 7, end: 20 },
  callHours: { start: 8, end: 19 },
  /** Calls stuck without an outcome for this long are treated as unanswered. */
  callTimeout: 45 * MINUTE,
  /** Delivery-readiness SMS this many days before the due date (≈ 36 weeks). */
  deliveryReadinessLeadDays: 28,
  batchSize: 20,
};

export function callPolicy(risk: RiskLevel) {
  return risk === "high"
    ? { maxAttempts: 3, retryDelay: 5 * MINUTE }
    : { maxAttempts: 2, retryDelay: 10 * MINUTE };
}

/** Hour of day in Ghana (Africa/Accra). */
export function ghanaHour(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Africa/Accra",
    }).format(now)
  );
}

export function withinHours(
  window: { start: number; end: number },
  now = new Date()
) {
  const hour = ghanaHour(now);
  return hour >= window.start && hour < window.end;
}
