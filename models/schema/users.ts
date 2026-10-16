import { index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, ts, updatedAt } from "./columns";
import { userRoleEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text().notNull().unique("users_email_unique"),
    password: text().notNull(),
    name: text().notNull(),
    phoneNumber: text(), // optional for accounts created outside the app; the API requires it
    role: userRoleEnum().notNull().default("staff"),
    resetCode: text(),
    resetCodeExpiry: ts(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.createdAt), index().on(t.role)]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
