import { relations } from "drizzle-orm";
import { appointments } from "./appointments";
import { callLogs } from "./call-logs";
import { pastRecords } from "./past-records";
import { pregnantWomen } from "./pregnant-women";
import { publicHealthRecords } from "./public-health-records";
import { users } from "./users";
import { visitRecords } from "./visit-records";

// Relations used by db.query.* relational queries.

export const usersRelations = relations(users, ({ many }) => ({
  pregnantWomen: many(pregnantWomen),
  appointments: many(appointments),
}));

export const pregnantWomenRelations = relations(
  pregnantWomen,
  ({ one, many }) => ({
    registeredBy: one(users, {
      fields: [pregnantWomen.registeredById],
      references: [users.id],
    }),
    appointments: many(appointments),
    visitRecords: many(visitRecords),
    pastRecords: many(pastRecords),
    callLogs: many(callLogs),
  })
);

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    patient: one(pregnantWomen, {
      fields: [appointments.patientId],
      references: [pregnantWomen.id],
    }),
    createdBy: one(users, {
      fields: [appointments.createdById],
      references: [users.id],
    }),
    callLogs: many(callLogs),
  })
);

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  appointment: one(appointments, {
    fields: [callLogs.appointmentId],
    references: [appointments.id],
  }),
  pregnantWoman: one(pregnantWomen, {
    fields: [callLogs.pregnantWomanId],
    references: [pregnantWomen.id],
  }),
}));

export const visitRecordsRelations = relations(visitRecords, ({ one }) => ({
  pregnantWoman: one(pregnantWomen, {
    fields: [visitRecords.pregnantWomanId],
    references: [pregnantWomen.id],
  }),
  recordedBy: one(users, {
    fields: [visitRecords.recordedById],
    references: [users.id],
  }),
}));

export const pastRecordsRelations = relations(pastRecords, ({ one }) => ({
  pregnantWoman: one(pregnantWomen, {
    fields: [pastRecords.pregnantWomanId],
    references: [pregnantWomen.id],
  }),
  recordedBy: one(users, {
    fields: [pastRecords.recordedById],
    references: [users.id],
  }),
}));

export const publicHealthRecordsRelations = relations(
  publicHealthRecords,
  ({ one }) => ({
    recordedBy: one(users, {
      fields: [publicHealthRecords.recordedById],
      references: [users.id],
    }),
  })
);
