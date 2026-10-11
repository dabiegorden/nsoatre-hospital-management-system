// Reminder pipeline, calls and Vapi webhook — end to end (dry-run server).
import { assertDryRun, assertSafeDatabase, check, client, finish, loginAsTempAdmin, sql, stamp } from "./helpers.mjs";

await assertSafeDatabase();

const api = client();
const tick = () =>
  api.call("POST", "/api/reminders/tick", null, {
    authorization: `Bearer ${process.env.CRON_SECRET}`,
    cookie: "",
  });
const webhook = (message) =>
  api.call("POST", "/api/vapi/webhook", { message }, {
    "x-vapi-secret": process.env.VAPI_WEBHOOK_SECRET,
    cookie: "",
  });
const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const ymd = (d) => d.toISOString().slice(0, 10);
const row = async (table, id) => (await sql.query(`select * from ${table} where id = $1`, [id]))[0];

let admin;
let womanId;
const created = [];

try {
  admin = await loginAsTempAdmin(api, "reminders");
  await assertDryRun(api);

  let r = await api.call("POST", "/api/reminders/tick", null, { cookie: "" });
  check("tick without secret -> 401", r.status === 401, r);
  r = await api.call(
    "POST",
    "/api/vapi/webhook",
    { message: { type: "status-update", call: { id: "x" } } },
    { "x-vapi-secret": "wrong", cookie: "" }
  );
  check("webhook with wrong secret -> 401", r.status === 401, r);

  // High-risk patient (BP 150/95 => 3 call attempts)
  const edd = new Date(Date.now() + 12 * 7 * 86400000); // 28 weeks
  r = await api.call("POST", "/api/pregnant-women", {
    fullName: "E2E Reminder Akosua", residentialAddress: "Sunyani", phoneNumber: `020${String(stamp).slice(-7)}`,
    age: 24, parity: "G2P1", bloodPressure: "150/95", height: 160, weight: 65, gestationalAge: 28,
    expectedDeliveryDate: ymd(edd), folderNumber: `E2E-R-${stamp}`, maritalStatus: "married",
    bloodGroup: "O", rhFactor: "positive",
  });
  check("create high-risk patient", r.status === 201, r);
  womanId = r.data?.data?._id;
  const phone = r.data?.data?.phoneNumber;

  const mk = async (when, label) => {
    const res = await api.call("POST", "/api/appointments", {
      patientName: "E2E Reminder Akosua", patientPhoneNumber: phone, relativePhoneNumber: "0551234567",
      appointmentLocation: "ANC Clinic", appointmentDate: ymd(when), appointmentTime: hhmm(when), patient: womanId,
    });
    check(`create appointment ${label}`, res.status === 201, res);
    created.push(res.data?.data?._id);
    return res.data?.data?._id;
  };
  const now = new Date();
  const A = await mk(new Date(now.getTime() + 20 * 3600e3), "A (tomorrow)");
  const B = await mk(new Date(now.getTime() + 2 * 3600e3), "B (in 2h)");
  const C = await mk(new Date(now.getTime() - 2 * 3600e3), "C (2h ago)");

  // Tick 1: day-before (A), same-day (B), C missed (15 min grace) + missed SMS
  r = await tick();
  check("tick 1 ran", r.status === 200 && !r.data.data.skipped, r);
  const [a, b, c] = await Promise.all([A, B, C].map((id) => row("appointments", id)));
  check("A got day-before reminder", a.day_before_reminder_at !== null && a.same_day_reminder_at === null);
  check("B got same-day reminder", b.same_day_reminder_at !== null && b.day_before_reminder_at === null);
  check("C marked missed + missed SMS", c.status === "missed" && c.missed_at && c.missed_notification_sent === true && c.next_call_at);

  r = await tick();
  const t2 = r.data.data;
  check("tick 2 repeats nothing (idempotent)", t2.dayBefore + t2.sameDay + t2.markedMissed + t2.missedSms + t2.callsPlaced === 0, t2);

  for (let attempt = 1; attempt <= 3; attempt++) {
    await sql`update appointments set next_call_at = now() - interval '1 minute' where id = ${C}`;
    r = await tick();
    check(`call attempt ${attempt} placed`, r.data.data.callsPlaced === 1, r.data.data);
    const appt = await row("appointments", C);
    check(`attempt ${attempt} counted + retry scheduled`, appt.voice_call_attempts === attempt && appt.next_call_at !== null, appt);
  }
  await sql`update appointments set next_call_at = now() - interval '1 minute' where id = ${C}`;
  r = await tick();
  check("escalated after 3 unanswered calls", r.data.data.escalated === 1 && r.data.data.callsPlaced === 0, r.data.data);
  const esc = await row("appointments", C);
  check("relative notified + chain stopped", esc.escalated_at && esc.relative_notified_at && esc.next_call_at === null, esc);

  // ---- Webhook outcome handling ---------------------------------------
  const insertVapiLog = async (id, kind, appointmentId) =>
    sql`insert into call_logs (id, appointment_id, pregnant_woman_id, patient_name, phone_number, provider, kind, attempt, provider_call_id, status)
        values (${id}, ${appointmentId}, ${womanId}, 'E2E Reminder Akosua', ${"+233" + phone.slice(1)}, 'vapi', ${kind}, 1, ${"vapi-" + id}, 'queued')`;
  const started = () => new Date(Date.now() - 90_000).toISOString();
  const report = (id, endedReason, messages, structuredOutputs, startedAt = started()) =>
    webhook({
      type: "end-of-call-report",
      endedReason,
      call: { id: "vapi-" + id, status: "ended", startedAt, endedAt: new Date().toISOString() },
      artifact: { transcript: "…", messages, structuredOutputs },
    });
  const outcome = (result) => ({ x: { name: "Nsoatre ANC call outcome", result } });

  // 1. status-update "ended" must not close the call
  const L1 = `l1-${stamp}`;
  await insertVapiLog(L1, "manual", B);
  await webhook({ type: "status-update", status: "ended", call: { id: "vapi-" + L1 } });
  let log = await row("call_logs", L1);
  check("status-update 'ended' records status but does not finalise", log.status === "ended" && log.outcome_processed_at === null, log);
  // the full report then arrives and is applied
  r = await report(L1, "assistant-ended-call",
    [{ role: "user", message: "2" }, { role: "tool_calls", toolCalls: [{ function: { name: "handoff_to_english" } }] }, { role: "user", message: "I had bleeding" }],
    outcome({ reachedPatient: true, dangerSigns: ["vaginal_bleeding", "bogus"], reasonCategory: "transport_or_distance", wantsToReschedule: true, preferredReturnDate: "Monday", summary: "Reached." }));
  log = await row("call_logs", L1);
  check("end-of-call report applied after status-update", log.outcome_processed_at && log.language === "english" && log.answered === true, log);
  check("unknown danger sign filtered", JSON.stringify(log.danger_signs) === '["vaginal_bleeding"]', log.danger_signs);
  check("danger alert sent", log.danger_alert_sent_at !== null);
  check("preferred language remembered", (await row("pregnant_women", womanId)).preferred_language === "english");
  check("follow-up completed after reaching patient", (await row("appointments", B)).follow_up_completed_at !== null);
  await report(L1, "assistant-ended-call", [], outcome({ reachedPatient: true, dangerSigns: ["fever"], summary: "" }));
  const alerts = await sql`select count(*)::int n from reminder_logs where message like 'URGENT:%' and patient_name = 'E2E Reminder Akosua'`;
  check("replayed report changes nothing (one alert)", alerts[0].n === 1, alerts);

  // 2. Silence at the menu that defaulted to Twi is NOT "reached"
  await sql`update pregnant_women set preferred_language = null where id = ${womanId}`;
  const D = await mk(new Date(now.getTime() - 3 * 3600e3), "D (missed, silent call)");
  await sql`update appointments set status = 'missed', missed_at = now(), next_call_at = null where id = ${D}`;
  const L2 = `l2-${stamp}`;
  await insertVapiLog(L2, "automatic", D);
  await report(L2, "assistant-ended-call",
    [{ role: "bot", message: "For Twi press 1" }, { role: "tool_calls", toolCalls: [{ function: { name: "handoff_to_twi" } }] }],
    outcome({ reachedPatient: false, dangerSigns: [], summary: "No response." }));
  log = await row("call_logs", L2);
  const dAfter = await row("appointments", D);
  check("silent Twi call: connected but not reached", log.answered === true && log.outcome_processed_at && dAfter.follow_up_completed_at === null, { log, dAfter });
  check("silent Twi call: retry scheduled", dAfter.next_call_at !== null, dAfter);
  check("silent Twi call: language not remembered", (await row("pregnant_women", womanId)).preferred_language === null);

  // 3. Caller pressed 1 for Twi => reached
  const L3 = `l3-${stamp}`;
  await insertVapiLog(L3, "automatic", D);
  await report(L3, "assistant-ended-call",
    [{ role: "user", message: "1" }, { role: "tool_calls", toolCalls: [{ function: { name: "handoff_to_twi" } }] }],
    outcome({ reachedPatient: true, dangerSigns: [], summary: "Chose Twi." }));
  check("Twi chosen by keypress: reached", (await row("appointments", D)).follow_up_completed_at !== null);
  check("Twi chosen by keypress: language remembered", (await row("pregnant_women", womanId)).preferred_language === "twi");

  // 4. Test calls never change patient data or alert staff
  await sql`update pregnant_women set preferred_language = null where id = ${womanId}`;
  const L4 = `l4-${stamp}`;
  await insertVapiLog(L4, "test", A);
  await report(L4, "assistant-ended-call",
    [{ role: "user", message: "2" }, { role: "tool_calls", toolCalls: [{ function: { name: "handoff_to_english" } }] }],
    outcome({ reachedPatient: true, dangerSigns: ["fever"], summary: "Test." }));
  log = await row("call_logs", L4);
  check("test call: no danger alert", log.outcome_processed_at && log.danger_alert_sent_at === null, log);
  check("test call: language unchanged", (await row("pregnant_women", womanId)).preferred_language === null);
  check("test call: appointment untouched", (await row("appointments", A)).follow_up_completed_at === null);

  // 5. A call that never connects falls back to the Arkesel Twi message
  const L5 = `l5-${stamp}`;
  await insertVapiLog(L5, "manual", A);
  await report(L5, "call.start.error-get-transport", [], undefined, null);
  const fallback = await sql`select provider, status, language, ended_reason from call_logs where appointment_id = ${A} and provider = 'arkesel'`;
  check("dial failure triggers Arkesel Twi fallback", fallback.length === 1 && fallback[0].status === "ended" && fallback[0].language === "twi", fallback);

  // Manual call button, call list, status, web test
  r = await api.call("POST", `/api/appointments/${A}/send-voice-reminder`);
  check("manual call button works", r.status === 200 && r.data.data.callLogId, r);
  r = await api.call("GET", `/api/calls?appointmentId=${C}`);
  check("calls API lists the 3 automatic calls", r.status === 200 && r.data.data.length === 3, r.data);
  r = await api.call("GET", "/api/reminders/status");
  check("status endpoint reports dry-run and last run", r.data.data.dryRun === true && r.data.data.lastRunAt, r.data);
  r = await api.call("POST", "/api/calls/web-test", { appointmentId: A });
  check("web test returns squad without the webhook secret", r.status === 200 && !JSON.stringify(r.data).includes(process.env.VAPI_WEBHOOK_SECRET), r.status);
  r = await api.call("POST", "/api/calls/phone-test", { phoneNumber: "not a phone" });
  check("phone test rejects invalid numbers", r.status === 400, r);
  r = await api.call("POST", "/api/calls/phone-test", { phoneNumber: "0244000000" });
  check("phone test call (dry run) is logged as a test", r.status === 200 && r.data.data.callLogId, r);
  if (r.data?.data?.callLogId) {
    const t = await row("call_logs", r.data.data.callLogId);
    check("phone test log has kind=test and no appointment", t.kind === "test" && t.appointment_id === null, t);
    await sql`delete from call_logs where id = ${t.id}`;
  }
  await sql`delete from reminder_logs where appointment_id = 'phone-test' and patient_name = ${"E2E reminders"}`;

  // WHO schedule on completion
  await api.call("PATCH", `/api/appointments/${B}`, { status: "cancelled" });
  await api.call("PATCH", `/api/appointments/${D}`, { status: "cancelled" });
  r = await api.call("PATCH", `/api/appointments/${A}`, { status: "completed" });
  const next = r.data.nextAppointment;
  check("completing a visit books WHO contact 4 (30 weeks)", next && /contact 4 of 8 \(30 weeks\)/.test(next.notes), r.data);
  if (next) {
    const day = new Date(next.appointmentDate).getUTCDay();
    check("booked on a weekday", day !== 0 && day !== 6, next.appointmentDate);
  }
} catch (error) {
  check("suite ran without exceptions", false, String(error?.stack ?? error));
} finally {
  if (womanId) {
    await sql`delete from call_logs where pregnant_woman_id = ${womanId} or patient_name = 'E2E Reminder Akosua'`;
    await sql`delete from reminder_logs where patient_name = 'E2E Reminder Akosua'`;
    await sql`delete from appointments where patient_id = ${womanId} or id = any(${created.filter(Boolean)})`;
    await sql`delete from pregnant_women where id = ${womanId}`;
  }
  await admin?.cleanup();
  process.exit(finish() ? 1 : 0);
}
