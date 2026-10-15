import { userSummary, ValidationError } from "@/lib/db-utils";

// Related records embedded in appointment API responses.
export const appointmentRelations = {
  patient: {
    columns: { id: true, fullName: true, age: true, phoneNumber: true },
  },
  createdBy: userSummary,
} as const;

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "missed",
  "rescheduled",
  "cancelled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const isAppointmentStatus = (value: string): value is AppointmentStatus =>
  (APPOINTMENT_STATUSES as readonly string[]).includes(value);

const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Combines the appointment date with its HH:mm time.
export function combineDateTime(date: Date | string, time: string) {
  if (!TIME_REGEX.test(time)) {
    throw new ValidationError(["Please provide time in HH:mm format"]);
  }
  const combined = new Date(date);
  const [hours, minutes] = time.split(":").map(Number);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}
