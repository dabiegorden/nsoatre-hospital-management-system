import { text, timestamp } from "drizzle-orm/pg-core";

// Column builders shared by every table.

// IDs are text primary keys holding random UUIDs.
export const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const ts = () => timestamp({ withTimezone: true, mode: "date" });

export const createdAt = () => ts().notNull().defaultNow();
export const updatedAt = () =>
  ts()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Who did something, copied at the time (survives the user being deleted). */
export type PersonSnapshot = { name?: string; email?: string };
