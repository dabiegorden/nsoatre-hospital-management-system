/**
 * REMINDERS_DRY_RUN=true runs the whole reminder pipeline and logs every step
 * without sending real SMS or placing real calls (for testing and demos).
 */
export function isDryRun() {
  return process.env.REMINDERS_DRY_RUN === "true";
}
