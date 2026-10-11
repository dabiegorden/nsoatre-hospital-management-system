// Analytics, defaulters, follow-up, Twi SMS templates, reports and pages (dry-run server).
import {
  assertDryRun,
  assertSafeDatabase,
  check,
  client,
  finish,
  loginAsTempAdmin,
  sql,
  stamp,
} from "./helpers.mjs";

await assertSafeDatabase();

const api = client();
const womanId = `e2e-w-${stamp}`;
const appts = [`e2e-a1-${stamp}`, `e2e-a2-${stamp}`, `e2e-a3-${stamp}`, `e2e-a4-${stamp}`];
const templateIds = [];
let admin;

try {
  admin = await loginAsTempAdmin(api, "features");
  await assertDryRun(api);

  // Adolescent with anaemia: 2 missed visits in a row, the last one escalated.
  await sql`insert into pregnant_women (id, full_name, residential_address, phone_number, age, folder_number, marital_status, parity, blood_pressure, height, weight, gestational_age, expected_delivery_date, blood_group, rh_factor, hb)
    values (${womanId}, 'E2E Feature Ama', 'Abesim', ${`021${String(stamp).slice(-7)}`}, 17, ${`E2E-F-${stamp}`}, 'single', 'G1', '120/80', 158, 55, 24, now() + interval '16 weeks', 'A', 'positive', '9.5')`;
  const mk = (id, interval, status, extra = {}) => sql`insert into appointments (id, patient_name, patient_phone_number, appointment_location, appointment_date, appointment_time, appointment_date_time, status, patient_id, escalated_at, follow_up_completed_at)
    values (${id}, 'E2E Feature Ama', '0210000000', 'ANC', now() + ${interval}::interval, '09:00', now() + ${interval}::interval, ${status}, ${womanId}, ${extra.escalated ? new Date() : null}, ${extra.reached ? new Date() : null})`;
  await mk(appts[0], "-30 days", "completed");
  await mk(appts[1], "-10 days", "missed", { reached: true });
  await mk(appts[2], "-2 days", "missed", { escalated: true });
  await sql`insert into call_logs (id, appointment_id, pregnant_woman_id, patient_name, phone_number, provider, kind, status, answered, language, reason_category, danger_signs, danger_alert_sent_at, outcome_processed_at)
    values (${"e2e-c1-" + stamp}, ${appts[1]}, ${womanId}, 'E2E Feature Ama', '+233210000000', 'vapi', 'automatic', 'ended', true, 'english', 'transport_or_distance', '["fever"]'::jsonb, now(), now()),
           (${"e2e-c2-" + stamp}, ${appts[2]}, ${womanId}, 'E2E Feature Ama', '+233210000000', 'vapi', 'automatic', 'ended', false, null, null, null, null, now())`;

  // Analytics
  let r = await api.call("GET", "/api/analytics?months=3");
  const a = r.data?.data;
  check("analytics responds", r.status === 200 && a, r);
  check("analytics attendance", a?.totals.completed >= 1 && a?.totals.missed >= 2, a?.totals);
  check("analytics calls", a?.calls.total >= 2 && a?.calls.answered >= 1 && a?.calls.dangerAlerts >= 1, a?.calls);
  check("analytics reasons + danger signs", a?.reasons.some((x) => x.category === "transport_or_distance") && a?.dangerSigns.some((x) => x.sign === "fever"));
  check("analytics effectiveness split", a?.effectiveness.reachedMissed >= 1 && a?.effectiveness.unreachedMissed >= 1, a?.effectiveness);

  // Defaulters (SQL streak)
  r = await api.call("GET", "/api/defaulters");
  let d = r.data?.data?.find((x) => x.patientId === womanId);
  check("defaulter detected: 2 in a row, unreachable", d?.consecutiveMisses === 2 && d?.unreachable === true, r.data);
  check("defaulter risk is high", d?.riskLevel === "high", d);
  await sql`update appointments set status = 'completed' where id = ${appts[2]}`;
  r = await api.call("GET", "/api/defaulters");
  check("attending again removes the defaulter", !r.data.data.some((x) => x.patientId === womanId), r.data);
  await sql`update appointments set status = 'missed' where id = ${appts[2]}`;

  // Follow-up + language
  r = await api.call("PATCH", `/api/pregnant-women/${womanId}/follow-up`, { followUpAssigneeId: admin.id, followUpNote: "Visit Friday" });
  check("assigning a nurse sets status 'assigned'", r.status === 200 && r.data.data.followUpStatus === "assigned", r);
  r = await api.call("PATCH", `/api/pregnant-women/${womanId}/follow-up`, { preferredLanguage: "french" });
  check("invalid language rejected", r.status === 400, r);
  r = await api.call("PATCH", `/api/pregnant-women/${womanId}/follow-up`, { followUpAssigneeId: "nobody" });
  check("unknown nurse rejected", r.status === 400, r);
  r = await api.call("GET", "/api/defaulters");
  d = r.data.data.find((x) => x.patientId === womanId);
  check("defaulter shows assignee name", d?.followUpAssigneeName === "E2E features", d);
  r = await api.call("GET", `/api/pregnant-women/${womanId}`);
  check("patient detail includes missedAppointments", r.data?.data?.missedAppointments === 2, r.data?.data);

  // Twi SMS templates
  r = await api.call("POST", "/api/sms-templates", { name: `E2E bad ${stamp}`, message: "x", purpose: "nope", language: "twi" });
  check("template with unknown purpose rejected", r.status === 400, r);
  r = await api.call("POST", "/api/sms-templates", {
    name: `E2E Twi day-before ${stamp}`,
    message: "Maakye {name}, wo ANC da yɛ ɔkyena, {date}, wɔ {location}.",
    purpose: "dayBefore",
    language: "twi",
  });
  check("create Twi template", r.status === 201 && r.data.data.language === "twi", r);
  templateIds.push(r.data?.data?._id);
  r = await api.call("PATCH", `/api/sms-templates/${templateIds[0]}`, { isActive: true });
  check("update template", r.status === 200, r);
  r = await api.call("GET", "/api/sms-templates?all=true");
  check("list templates (all)", r.data.data.some((t) => t._id === templateIds[0]), r.data);

  // A Twi-preferring patient gets the Twi text for her day-before reminder.
  await sql`update pregnant_women set preferred_language = 'twi' where id = ${womanId}`;
  await mk(appts[3], "+20 hours", "scheduled");
  r = await api.call("POST", "/api/reminders/tick");
  check("tick ran", r.status === 200 && r.data.data.dayBefore >= 1, r.data);
  const [sms] = await sql`select message from reminder_logs where appointment_id = ${appts[3]} and reminder_type = 'sms'`;
  check("day-before SMS used the Twi template", sms?.message?.startsWith("Maakye E2E, wo ANC da yɛ ɔkyena") && sms.message.includes("ANC."), sms);

  // Monthly report
  const month = new Date().toISOString().slice(0, 7);
  r = await api.call("GET", `/api/reports/monthly?month=${month}`);
  check("monthly CSV", r.status === 200 && (r.headers.get("content-type") || "").includes("text/csv") && r.data.includes("E2E Feature Ama"), String(r.data).slice(0, 200));
  r = await api.call("GET", "/api/reports/monthly?month=2026-13");
  check("bad month rejected", r.status === 400, r);

  // Pages render
  for (const page of [
    "/dashboard",
    "/dashboard/calls",
    "/dashboard/defaulters",
    "/dashboard/analytics",
    "/dashboard/sms-templates",
    "/dashboard/pregnant-women",
    `/dashboard/pregnant-women/${womanId}`,
    `/dashboard/appointments/${appts[2]}`,
  ]) {
    const res = await fetch(`${process.env.E2E_BASE_URL || "http://localhost:3123"}${page}`, {
      headers: { cookie: api.cookie() },
    });
    check(`page ${page.replace(womanId, ":id").replace(appts[2], ":id")} renders`, res.status === 200, res.status);
  }
} catch (error) {
  check("suite ran without exceptions", false, String(error?.stack ?? error));
} finally {
  await sql`delete from reminder_logs where appointment_id = any(${appts}) or patient_name = 'E2E Feature Ama'`;
  await sql`delete from call_logs where pregnant_woman_id = ${womanId}`;
  await sql`delete from appointments where patient_id = ${womanId}`;
  await sql`delete from pregnant_women where id = ${womanId}`;
  for (const id of templateIds.filter(Boolean)) await sql`delete from sms_templates where id = ${id}`;
  await sql`delete from sms_templates where name like ${"E2E %" + stamp}`;
  await admin?.cleanup();
  process.exit(finish() ? 1 : 0);
}
