import { jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { ts } from "./columns";

// Lease-based lock so only one server instance runs the reminder tick.
export const schedulerLocks = pgTable("scheduler_locks", {
  name: text().primaryKey(),
  lockedUntil: ts().notNull(),
  lastRunAt: ts(),
  lastResult: jsonb(),
});

export type SchedulerLock = typeof schedulerLocks.$inferSelect;
