import { sql } from "drizzle-orm";
import { check, doublePrecision, index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./columns";
import { pregnantWomen } from "./pregnant-women";
import { users } from "./users";

/** Measurements taken at each antenatal visit. */
export const visitRecords = pgTable(
  "visit_records",
  {
    id: id(),
    pregnantWomanId: text()
      .notNull()
      .references(() => pregnantWomen.id, { onDelete: "cascade" }),
    gestationalAge: doublePrecision().notNull(),
    bloodPressure: text().notNull(),
    hb: text().notNull().default(""),
    sfh: text().notNull().default(""),
    rbs: text().notNull().default(""),
    weight: doublePrecision().notNull(),
    urineProtein: text().notNull().default(""),
    complaint: text().notNull().default(""),
    visitDate: ts().notNull().defaultNow(),
    recordedById: text().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.pregnantWomanId, t.visitDate),
    index().on(t.visitDate),
    check(
      "visit_records_gestational_age_check",
      sql`${t.gestationalAge} BETWEEN 0 AND 42`
    ),
    check("visit_records_weight_check", sql`${t.weight} BETWEEN 20 AND 300`),
  ]
);

export type VisitRecord = typeof visitRecords.$inferSelect;
export type NewVisitRecord = typeof visitRecords.$inferInsert;
