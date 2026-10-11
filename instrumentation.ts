export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.REMINDERS_ENABLED === "false") return;

  // `npm run dev` shares the production database, so the scheduler only runs
  // in development when explicitly requested.
  if (process.env.NODE_ENV !== "production" && process.env.REMINDERS_IN_DEV !== "true") {
    console.log(
      "[reminders] Scheduler not started in development (set REMINDERS_IN_DEV=true to enable)"
    );
    return;
  }

  const { startReminderScheduler } = await import("./lib/reminders/scheduler");
  startReminderScheduler();
}
