import "server-only";
import { runReminderTick } from "@/lib/reminders/engine";

const INTERVAL_MS = 60_000;

declare global {
  // Survives dev-server hot reloads so only one timer runs per process.
  var reminderScheduler: NodeJS.Timeout | undefined;
}

/**
 * Runs the reminder pipeline every minute inside the Next.js server process
 * (started from instrumentation.ts). Ticks never overlap: the next one is
 * scheduled only after the previous finishes, and the database lease in
 * runReminderTick keeps multiple instances from running at the same time.
 */
export function startReminderScheduler() {
  if (globalThis.reminderScheduler) return;

  const loop = async () => {
    try {
      const result = await runReminderTick();
      const acted =
        result.dayBefore +
        result.sameDay +
        result.markedMissed +
        result.missedSms +
        result.callsPlaced +
        result.escalated +
        result.callsReconciled +
        result.deliveryReadiness;
      if (acted > 0 || result.errors.length > 0) {
        console.log("[reminders] tick", JSON.stringify(result));
      }
    } catch (error) {
      console.error("[reminders] tick failed:", error);
    } finally {
      globalThis.reminderScheduler = setTimeout(loop, INTERVAL_MS);
    }
  };

  globalThis.reminderScheduler = setTimeout(loop, 10_000);
  console.log("[reminders] Automatic reminder scheduler started (every 60s)");
}
