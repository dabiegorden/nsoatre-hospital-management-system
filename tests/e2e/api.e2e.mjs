// Core API: auth, patients, appointments, visits, records, users (dry-run server).
import { neon } from "@neondatabase/serverless";
import { assertSafeDatabase } from "./helpers.mjs";

await assertSafeDatabase();
const BASE = process.env.E2E_BASE_URL || "http://localhost:3123";
const stamp = Date.now();
const email = `e2e.${stamp}@example.com`;
let cookie = "";
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie?.startsWith("auth-token=")) cookie = setCookie.split(";")[0];
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function check(name, cond, extra) {
  if (cond) console.log("PASS", name);
  else { failed++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ""); }
}

const cleanup = { womanId: null, apptId: null, phrId: null, otherUserId: null, templateName: `e2e-${stamp}` };

try {
  let r = await call("POST", "/api/auth/register", {
    email, password: "password123", name: "E2E Admin", phoneNumber: "0240000000",
    role: "admin", secretKey: process.env.ADMIN_SECRET_KEY,
  });
  check("register admin", r.status === 201 && cookie, r);
  const myId = r.data?.user?.id;

  r = await call("POST", "/api/auth/register", { email: email.toUpperCase(), password: "password123", name: "x", phoneNumber: "1", secretKey: process.env.ADMIN_SECRET_KEY });
  check("duplicate email (case-insensitive) -> 409", r.status === 409, r);
  {
    const saved = cookie;
    r = await call("POST", "/api/auth/register", { email: `e2e.nokey.${stamp}@example.com`, password: "password123", name: "x", phoneNumber: "0240000009" });
    check("register without admin secret key -> 401", r.status === 401, r);
    cookie = saved;
  }

  r = await call("GET", "/api/auth/me");
  check("me", r.status === 200 && r.data.user.id === myId, r);

  // Pregnant women
  const woman = {
    fullName: "E2E Patient", residentialAddress: "Sunyani", phoneNumber: `05${stamp}`.slice(0, 10),
    age: 25, parity: "G1P0", bloodPressure: "120/80", height: 160, weight: 60, gestationalAge: 12,
    expectedDeliveryDate: "2027-03-01", folderNumber: `F-${stamp}`, maritalStatus: "married",
    location: "", urineProtein: "", hb: "11", rbs: "", sfh: "",
    folicAcidSupplements: true, ironSupplements: false, hbsAgResult: "negative", g6pdStatus: "normal",
    bloodGroup: "O", rhFactor: "positive", sicklingStatus: "pending", itnDistributed: false,
    itnDistributionDate: undefined, syphilisScreeningStatus: "pending", syphilisTreatment: false,
    knownHivPositiveBeforePregnancy: false, artTreatmentBeforePregnancy: false,
    hivStatusAtRegistration: "negative", artTreatmentAfterRegistration: false, hivRetestAt34Weeks: "not_done",
    artTreatmentAfterRetest: false, tbScreeningCoughOver2Weeks: false, tbStatus: "negative", tbTreatment: false,
  };
  r = await call("POST", "/api/pregnant-women", woman);
  check("create pregnant woman", r.status === 201 && r.data.data._id && r.data.data.registeredBy?.name === "E2E Admin", r);
  const womanId = r.data?.data?._id;
  cleanup.womanId = womanId;

  r = await call("POST", "/api/pregnant-women", woman);
  check("duplicate phone -> 400", r.status === 400 && r.data.type === "DUPLICATE_ERROR", r);

  r = await call("POST", "/api/pregnant-women", { ...woman, phoneNumber: "0999999999", folderNumber: `G-${stamp}`, age: 5 });
  check("age out of range -> 400", r.status === 400 && r.data.type === "VALIDATION_ERROR", r);

  r = await call("POST", "/api/pregnant-women", { ...woman, phoneNumber: "0999999998" });
  check("duplicate folder number -> 400", r.status === 400 && /Folder number/.test(r.data.message), r);

  r = await call("GET", `/api/pregnant-women?search=${encodeURIComponent("e2e pat")}&hivStatus=negative`);
  check("list/search pregnant women", r.status === 200 && r.data.data.some((w) => w._id === womanId) && r.data.pagination.total >= 1, r);

  r = await call("GET", `/api/pregnant-women/${womanId}`);
  check("get pregnant woman", r.status === 200 && r.data.data.fullName === "E2E Patient" && r.data.data.registeredBy?.email === email, r);

  r = await call("GET", `/api/pregnant-women/does-not-exist`);
  check("get unknown id -> 404", r.status === 404, r);

  r = await call("PUT", `/api/pregnant-women/${womanId}`, { ...woman, weight: 62, _id: "hack", registeredBy: { name: "x" } });
  check("update pregnant woman", r.status === 200 && r.data.data.weight === 62 && r.data.data._id === womanId, r);

  r = await call("GET", `/api/pregnant-women/past-records?pregnantWomanId=${womanId}`);
  check("past record archived on update", r.status === 200 && r.data.data.length === 1 && r.data.data[0].weight === 60 && r.data.data[0].recordedBy?.name === "E2E Admin", r);

  r = await call("POST", `/api/pregnant-women/past-records`, { pregnantWomanId: womanId, bloodPressure: "110/70", height: 160, weight: 61, gestationalAge: 14, visitDate: "2026-10-01", visitNotes: "ok" });
  check("create past record", r.status === 201 && r.data.data.recordedBy?.name === "E2E Admin", r);

  r = await call("POST", `/api/pregnant-women/${womanId}/visits`, { gestationalAge: 13, bloodPressure: "118/76", hb: "", sfh: "", rbs: "", weight: 61, urineProtein: "", complaint: "", visitDate: "2026-10-10" });
  check("create visit", r.status === 201 && r.data.data._id && r.data.data.recordedBy?.name === "E2E Admin", r);

  r = await call("GET", `/api/pregnant-women/${womanId}/visits`);
  check("list visits", r.status === 200 && r.data.data.length === 1, r);

  // Legacy-nullable fields stay required through the API
  r = await call("POST", "/api/pregnant-women", { ...woman, phoneNumber: "0999999997", folderNumber: `H-${stamp}`, maritalStatus: undefined });
  check("create without maritalStatus -> 400", r.status === 400, r);
  r = await call("PUT", `/api/pregnant-women/${womanId}`, { ...woman, folderNumber: "" });
  check("update clearing folderNumber -> 400", r.status === 400, r);
  r = await call("POST", "/api/pregnant-women", { ...woman, phoneNumber: "0999999996", folderNumber: `I-${stamp}` });
  const second = r.data?.data?._id;
  check("create second woman", r.status === 201, r);
  r = await call("PUT", `/api/pregnant-women/${second}`, { ...woman, phoneNumber: woman.phoneNumber, folderNumber: `I-${stamp}` });
  check("update to duplicate phone -> 400 with clear message", r.status === 400 && /phone number already exists/.test(r.data.message), r);
  r = await call("DELETE", `/api/pregnant-women/${second}`);
  check("delete second woman", r.status === 200, r);

  // Appointments
  const today = new Date().toISOString().slice(0, 10);
  r = await call("POST", "/api/appointments", {
    patientName: "E2E Patient", patientPhoneNumber: woman.phoneNumber, relativePhoneNumber: "",
    appointmentLocation: "ANC", appointmentDate: today, appointmentTime: "23:30", notes: "", patient: womanId,
  });
  check("create appointment", r.status === 201 && r.data.data.patient?._id === womanId && r.data.data.createdBy?.name === "E2E Admin", r);
  const apptId = r.data?.data?._id;
  cleanup.apptId = apptId;

  r = await call("POST", "/api/appointments", { patientName: "x", patientPhoneNumber: "1", appointmentLocation: "x", appointmentDate: today, appointmentTime: "25:99", patient: womanId });
  check("bad time -> 400", r.status === 400, r);

  r = await call("GET", "/api/appointments?today=true&status=scheduled&search=e2e");
  check("list appointments (today/status/search)", r.status === 200 && r.data.data.some((a) => a._id === apptId && a.patient.fullName === "E2E Patient"), r);

  r = await call("GET", `/api/appointments/${apptId}`);
  check("get appointment", r.status === 200 && r.data.data.patient.phoneNumber === woman.phoneNumber, r);

  r = await call("PATCH", `/api/appointments/${apptId}`, { appointmentTime: "08:15", patient: womanId, callAttempts: 99 });
  const dt = new Date(r.data?.data?.appointmentDateTime);
  check("patch appointment time recomputes datetime", r.status === 200 && dt.getHours() === 8 && dt.getMinutes() === 15 && r.data.data.callAttempts === 0, r);

  r = await call("PATCH", `/api/appointments/${apptId}`, { status: "completed" });
  check("patch status", r.status === 200 && r.data.data.status === "completed", r);

  r = await call("PATCH", `/api/appointments/${apptId}`, { status: "bogus" });
  check("bad status -> 400", r.status === 400, r);

  r = await call("PATCH", `/api/appointments/${apptId}`, { appointmentLocation: "" });
  check("clearing appointmentLocation -> 400", r.status === 400, r);

  // Stored provider payloads come back untouched
  {
    const sql = neon(process.env.DATABASE_URL);
    await sql`insert into reminder_logs (id, appointment_id, patient_name, reminder_type, status, response, sent_by)
      values (${"e2e-log-" + stamp}, ${apptId}, 'E2E Patient', 'sms', 'sent', ${JSON.stringify({ id: "prov-1", patientId: "p" })}::jsonb, ${JSON.stringify({ name: "E2E", email })}::jsonb)`;
  }
  r = await call("GET", `/api/reminders?search=${encodeURIComponent(email)}`);
  const log = r.data?.data?.find((l) => l._id === "e2e-log-" + stamp);
  check("reminder response returned verbatim", log && log.response.id === "prov-1" && log.response.patientId === "p" && !("_id" in log.response), log);

  r = await call("GET", `/api/appointments/past-appointments?patientId=${womanId}`);
  check("past appointments", r.status === 200 && r.data.data.length === 1, r);


  r = await call("GET", "/api/dashboard/stats");
  check("dashboard stats", r.status === 200 && r.data.data.totalPregnantWomen >= 1 && r.data.data.totalUsers >= 1, r);

  // Public health records
  const phr = {
    registrationNumber: `R-${stamp}`, childName: "E2E Child", motherName: "E2E Mother", vaccinationGiven: "BCG",
    lastDateOfVisit: "2026-10-01", followUpDate: "2026-11-01", name: "E2E", diagnosis: "none",
    dateOfDischarge: "2026-10-02", phoneNumber: "0240000001", chpZone: "Zone A", recordDate: "2026-10-03",
    feedback: "", homeVisit: true, physicalExamination: false, referralNote: false, bloodPressure: "",
    age: 2, sex: "", weight: 12, nutritionStatus: "", nutritionRecommendation: "", address: "", remarks: "", dmHptStatus: "",
  };
  r = await call("POST", "/api/public-health-records", phr);
  check("create public health record", r.status === 201 && r.data.data.recordedBy?.name === "E2E Admin" && r.data.data.sex === null, r);
  const phrId = r.data?.data?._id;
  cleanup.phrId = phrId;

  r = await call("POST", "/api/public-health-records", phr);
  check("duplicate registration number -> 400", r.status === 400 && r.data.message === "Registration number already exists", r);

  r = await call("POST", "/api/public-health-records", { ...phr, registrationNumber: `S-${stamp}`, childName: "" });
  check("missing required -> 400", r.status === 400, r);

  r = await call("GET", "/api/public-health-records?search=e2e%20child");
  check("list public health records", r.status === 200 && r.data.data.some((x) => x._id === phrId), r);

  r = await call("PUT", `/api/public-health-records/${phrId}`, { ...phr, sex: "female", muac: 13 });
  check("update public health record", r.status === 200 && r.data.data.sex === "female" && r.data.data.muac === 13, r);

  r = await call("GET", `/api/public-health-records/${phrId}`);
  check("get public health record", r.status === 200 && r.data.data.recordedBy.name === "E2E Admin", r);

  r = await call("DELETE", `/api/public-health-records/${phrId}`);
  check("delete public health record", r.status === 200, r);
  cleanup.phrId = null;

  // SMS templates & reminders
  r = await call("POST", "/api/sms-templates", { name: cleanup.templateName, message: "hello" });
  check("create sms template", r.status === 201 && r.data.data.createdBy?.email === email, r);
  r = await call("GET", "/api/sms-templates");
  check("list sms templates", r.status === 200 && r.data.data.some((t) => t.name === cleanup.templateName), r);

  r = await call("GET", "/api/reminders?search=e2e&reminderType=sms&status=sent&page=1&limit=5");
  check("list reminders", r.status === 200 && Array.isArray(r.data.data) && r.data.pagination.limit === 5, r);

  // Users
  r = await call("GET", "/api/users");
  check("list users", r.status === 200 && r.data.users.some((u) => u.id === myId && !("password" in u)), r);
  r = await call("POST", "/api/users", { email: `E2E.other.${stamp}@Example.com`, password: "secret12", name: "Other", phoneNumber: "0244000001" });
  check("create user defaults to staff (email lowercased)", r.status === 201 && r.data.user.email === `e2e.other.${stamp}@example.com` && r.data.user.role === "staff", r);
  cleanup.otherUserId = r.data?.user?.id;
  r = await call("POST", "/api/users", { email: `e2e.bad.${stamp}@example.com`, password: "secret12", name: "Bad", phoneNumber: "0244000002", role: "user" });
  check("create user with unknown role -> 400", r.status === 400, r);
  r = await call("PATCH", `/api/users/${myId}`, { role: "staff" });
  check("admin cannot demote self -> 400", r.status === 400, r);

  // Staff: can view, add and edit, but cannot delete or manage users
  {
    const adminCookie = cookie;
    const staffEmail = `e2e.staff.${stamp}@example.com`;
    r = await call("POST", "/api/users", { email: staffEmail, password: "staffpass1", name: "E2E Staff", phoneNumber: "0244000003", role: "staff" });
    check("admin creates staff", r.status === 201 && r.data.user.role === "staff", r);
    const staffId = r.data?.user?.id;

    cookie = "";
    r = await call("POST", "/api/auth/login", { email: staffEmail, password: "staffpass1" });
    check("staff can log in", r.status === 200 && r.data.user.role === "staff" && cookie, r);
    r = await call("GET", "/api/pregnant-women?limit=1");
    check("staff can list pregnant women", r.status === 200, r);
    r = await call("PUT", `/api/pregnant-women/${womanId}`, { ...woman, weight: 63 });
    check("staff can edit pregnant woman", r.status === 200 && r.data.data.weight === 63, r);
    r = await call("POST", "/api/public-health-records", { ...phr, registrationNumber: `R-staff-${stamp}` });
    check("staff can add public health record", r.status === 201, r);
    const staffPhrId = r.data?.data?._id;
    r = await call("DELETE", `/api/public-health-records/${staffPhrId}`);
    check("staff cannot delete public health record -> 403", r.status === 403, r);
    r = await call("DELETE", `/api/pregnant-women/${womanId}`);
    check("staff cannot delete pregnant woman -> 403", r.status === 403, r);
    r = await call("DELETE", `/api/appointments/${apptId}`);
    check("staff cannot delete appointment -> 403", r.status === 403, r);
    r = await call("GET", "/api/users");
    check("staff cannot list users -> 403", r.status === 403, r);
    r = await call("POST", "/api/users", { email: `e2e.sneaky.${stamp}@example.com`, password: "password123", name: "x", phoneNumber: "0244000004", role: "admin" });
    check("staff cannot create users -> 403", r.status === 403, r);
    r = await call("PATCH", `/api/users/${staffId}`, { role: "admin" });
    check("staff cannot promote self -> 403", r.status === 403, r);

    cookie = adminCookie;
    r = await call("DELETE", `/api/public-health-records/${staffPhrId}`);
    check("admin deletes staff-created record", r.status === 200, r);
    r = await call("PATCH", `/api/users/${staffId}`, { role: "admin" });
    check("admin promotes staff to admin", r.status === 200 && r.data.user.role === "admin", r);
    r = await call("DELETE", `/api/users/${staffId}`);
    check("admin deletes user", r.status === 200, r);
  }
  r = await call("PATCH", `/api/users/${cleanup.otherUserId}`, { role: "admin" });
  check("patch user role", r.status === 200 && r.data.user.role === "admin", r);
  r = await call("DELETE", `/api/users/${cleanup.otherUserId}`);
  check("delete user", r.status === 200, r);
  cleanup.otherUserId = null;
  r = await call("DELETE", `/api/users/${myId}`);
  check("cannot delete self", r.status === 400, r);

  // Auth flows
  r = await call("POST", "/api/auth/verify-reset-token", { email, resetToken: "nope" });
  check("verify-reset-token wrong code -> 401", r.status === 401, r);
  const saved = cookie;
  r = await call("POST", "/api/auth/login", { email, password: "wrongpass1" });
  check("login wrong password -> 401", r.status === 401, r);
  r = await call("POST", "/api/auth/login", { email: email.toUpperCase(), password: "password123" });
  check("login (case-insensitive email)", r.status === 200, r);
  cookie = cookie || saved;

  // Deletes
  r = await call("DELETE", `/api/pregnant-women/${womanId}`);
  check("delete pregnant woman", r.status === 200, r);
  cleanup.womanId = null;
  r = await call("GET", `/api/appointments/${apptId}`);
  check("appointment kept with patient null after woman deleted", r.status === 200 && r.data.data.patient === null && r.data.data.patientName === "E2E Patient", r);
  r = await call("DELETE", `/api/appointments/${apptId}`);
  check("delete appointment", r.status === 200, r);
  cleanup.apptId = null;

  globalThis.__myId = myId;
} catch (e) {
  failed++;
  console.log("ERROR", e);
}

// Remove remaining test rows directly (the completed visit auto-books a follow-up)

const sql = neon(process.env.DATABASE_URL);
if (cleanup.apptId) await sql`delete from appointments where id = ${cleanup.apptId}`;
if (cleanup.womanId) await sql`delete from pregnant_women where id = ${cleanup.womanId}`;
if (cleanup.phrId) await sql`delete from public_health_records where id = ${cleanup.phrId}`;
await sql`delete from public_health_records where registration_number = ${"R-staff-" + stamp}`;
await sql`delete from sms_templates where name = ${cleanup.templateName}`;
await sql`delete from appointments where patient_name = 'E2E Patient'`;
await sql`delete from reminder_logs where patient_name = 'E2E Patient'`;
await sql`delete from users where email like ${"e2e.%" + stamp + "@example.com"} or email = ${email}`;
const leftovers = await sql`select
  (select count(*) from users where email like 'e2e.%') u,
  (select count(*) from pregnant_women where full_name = 'E2E Patient') w,
  (select count(*) from past_records) p,
  (select count(*) from visit_records) v`;
console.log("leftovers after cleanup:", leftovers[0]);
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
