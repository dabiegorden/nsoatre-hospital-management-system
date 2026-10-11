/** SMS texts used by the automatic reminder pipeline. Keep them short (≤ 2 SMS). */

const CLINIC = "Nsoatre Hospital ANC";

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function formatAppointment(date: Date) {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Accra",
  });
}

type Appt = {
  patientName: string;
  patientPhoneNumber: string;
  appointmentDateTime: Date;
  appointmentLocation: string;
};

export const messages = {
  dayBefore: (a: Appt) =>
    `Hello ${firstName(a.patientName)}, a reminder from ${CLINIC}: your antenatal appointment is tomorrow, ${formatAppointment(a.appointmentDateTime)}, at ${a.appointmentLocation}. Please bring your maternal health record book.`,

  sameDay: (a: Appt) =>
    `Hello ${firstName(a.patientName)}, your antenatal appointment is today, ${formatAppointment(a.appointmentDateTime)}, at ${a.appointmentLocation}. We look forward to seeing you. - ${CLINIC}`,

  missedPatient: (a: Appt) =>
    `Hello ${firstName(a.patientName)}, we missed you at your antenatal appointment today. Your health and your baby's health matter to us. Please come to the clinic as soon as you can. We will call you shortly. - ${CLINIC}`,

  missedAdmin: (a: Appt) =>
    `Missed ANC appointment: ${a.patientName} (${a.patientPhoneNumber}), ${formatAppointment(a.appointmentDateTime)}. Automatic follow-up calls have started.`,

  relative: (a: Appt) =>
    `Hello, this is ${CLINIC}. We have not been able to reach ${firstName(a.patientName)} about her antenatal care. Please ask her to visit the antenatal clinic or call us as soon as possible. Thank you.`,

  escalationAdmin: (a: Appt, attempts: number, relativeNotified: boolean) =>
    `Follow-up needed: ${a.patientName} (${a.patientPhoneNumber}) missed her appointment on ${formatAppointment(a.appointmentDateTime)} and was not reached after ${attempts} call(s).${relativeNotified ? " Her relative has been notified by SMS." : ""} She is now on the defaulter list.`,

  dangerAdmin: (patientName: string, phone: string, signs: string[]) =>
    `URGENT: ${patientName} (${phone}) reported danger signs on a follow-up call: ${signs.join(", ")}. Please contact her immediately.`,

  deliveryReadiness: (patientName: string, edd: Date) =>
    `Hello ${firstName(patientName)}, your baby is due around ${edd.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Africa/Accra" })}. Please prepare transport, emergency money, clean cloths and your health book. Come to the hospital at once if you have bleeding, severe headache or your water breaks. - ${CLINIC}`,
};
