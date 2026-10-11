// Shared helpers for the end-to-end suites. They run against a live server
// (`E2E_BASE_URL`, default http://localhost:3123) that MUST be in dry-run mode
// (REMINDERS_DRY_RUN=true) and use the DATABASE_URL from .env. Every suite
// creates its own data and deletes it afterwards.
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

export const BASE = process.env.E2E_BASE_URL || "http://localhost:3123";
export const sql = neon(process.env.DATABASE_URL);
export const stamp = Date.now();

let failed = 0;
export const failures = () => failed;

export function check(name, cond, extra) {
  console.log(cond ? "PASS" : "FAIL", name, cond ? "" : JSON.stringify(extra)?.slice(0, 600));
  if (!cond) failed++;
}

/** HTTP client that keeps the auth cookie between requests. */
export function client() {
  let cookie = "";
  async function call(method, path, body, headers = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", cookie, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get("set-cookie");
    if (sc?.startsWith("auth-token=")) cookie = sc.split(";")[0];
    const text = await res.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {}
    return { status: res.status, data, headers: res.headers };
  }
  return { call, cookie: () => cookie, reset: () => (cookie = "") };
}

/** Creates a temporary admin directly in the database and logs in as them. */
export async function loginAsTempAdmin(api, label) {
  const id = `e2e-admin-${label}-${stamp}`;
  const email = `e2e.${label}.${stamp}@example.com`;
  await sql`insert into users (id, email, password, name, phone_number, role)
    values (${id}, ${email}, ${await bcrypt.hash("password123", 10)}, ${"E2E " + label}, '0244000000', 'admin')`;
  const r = await api.call("POST", "/api/auth/login", { email, password: "password123" });
  if (r.status !== 200) throw new Error(`Temp admin login failed: ${JSON.stringify(r.data)}`);
  return { id, email, cleanup: () => sql`delete from users where id = ${id}` };
}

/** Refuses to run against a server that would really send SMS or place calls. */
export async function assertDryRun(api) {
  const r = await api.call("GET", "/api/reminders/status");
  if (r.status !== 200 || r.data?.data?.dryRun !== true) {
    console.error(
      "Refusing to run: the server is not in dry-run mode. Start it with REMINDERS_DRY_RUN=true " +
        "(and REMINDERS_ENABLED=false so only the tests trigger reminder runs)."
    );
    process.exit(2);
  }
}

/**
 * The suites trigger reminder runs, which process every due appointment in
 * the database. Refuse to run against a database with real patients (use a
 * Neon branch for testing) unless E2E_ALLOW_REAL_DATA=true.
 */
export async function assertSafeDatabase() {
  if (process.env.E2E_ALLOW_REAL_DATA === "true") return;
  const [{ n }] = await sql`
    select (select count(*) from pregnant_women where full_name not like 'E2E %')
         + (select count(*) from appointments where patient_name not like 'E2E %') as n`;
  if (Number(n) > 0) {
    console.error(
      `Refusing to run: the database has ${n} real patient/appointment rows, and the tests ` +
        "run the reminder engine over all of them. Point DATABASE_URL (for both the server " +
        "and the tests) at a Neon test branch, or set E2E_ALLOW_REAL_DATA=true."
    );
    process.exit(2);
  }
}

export function finish() {
  console.log(failed ? `${failed} FAILED` : "ALL PASSED");
  return failed;
}
