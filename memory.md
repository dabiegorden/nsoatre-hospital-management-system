# Memory — MongoDB→Postgres migration + automated bilingual reminder system

Last updated: 2026-10-12

## What was built

**1. MongoDB → Neon Postgres (Drizzle) migration — complete**
- Schema: `models/schema.ts` (snake_case casing). Migrations `drizzle/0000`–`0006` all applied to Neon.
- DB client `lib/db.ts` (neon-http). Helpers `lib/db-utils.ts`: `pickInput` (input casting/validation), `toApi` (returns Mongo-style `_id` + populated refs so the frontend was unchanged), `describeDbError`, `missedAppointmentsExtra`.
- All Mongo code, `mongoose`, `MONGODB_URL`, old models removed. Old Mongo data intentionally abandoned (user's decision).
- First admin created: DABIE GORDEN, dabiegorden49@gmail.com (password set by user; not stored here). Account has no phone number.

**2. Automated reminders + bilingual Vapi IVR (Twi/English) + "uniqueness" features**
- Engine: `lib/reminders/engine.ts` (runs every 60 s via `instrumentation.ts` → `lib/reminders/scheduler.ts`; DB lease lock in `scheduler_locks`). Pipeline: day-before SMS → same-day SMS → missed (15 min grace) → missed SMS (patient + admins) → IVR calls (2 tries, high-risk 3) → relative SMS + admin escalation. SMS 07–20h, calls 08–19h Ghana time.
- Vapi IVR squad: `lib/vapi/ivr.ts` (Language Menu → "Twi Reminder" plays `TWI_AUDIO_URL` / "English Nurse" AI). Client `lib/vapi/client.ts`; structured output "Nsoatre ANC call outcome" auto-created (`lib/vapi/call-outcome.ts`).
- Calls: `lib/calls/place-call.ts` (Vapi → Arkesel Twi voice fallback; `placeTestPhoneCall`), `lib/calls/outcome.ts` (webhook + polling reconcile, finalize once), `lib/calls/classify.ts` (pure reached/dial-failure rules).
- APIs: `/api/vapi/webhook`, `/api/reminders/tick|status`, `/api/calls` (+ `web-test`, `phone-test`), `/api/analytics`, `/api/defaulters`, `/api/reports/monthly` (CSV), `/api/pregnant-women/[id]/follow-up`, `/api/sms-templates` (+ `[id]`).
- Features: risk score `lib/risk.ts`; WHO 8-contact auto-booking `lib/anc-schedule.ts` + `lib/anc-booking.ts` (on PATCH status→completed); defaulters `lib/defaulters.ts` (SQL); analytics `lib/analytics.ts`; delivery-readiness SMS; Twi SMS templates (`lib/reminders/templates.ts`, staff-written).
- UI pages: `/dashboard/calls`, `/dashboard/defaulters`, `/dashboard/analytics`, `/dashboard/sms-templates`; components `automation-status`, `call-history`, `ivr-test-call` (browser call via `@vapi-ai/web`), `reminder-timeline`, `care-insights`, `risk-badge`. Labels shared in `lib/labels.ts`.
- Tests: `npm test` (Vitest 4.1.11, 36 unit tests, `vitest.config.mts`), `npm run test:e2e` (`tests/e2e/*.mjs`, 126 checks).
- README rewritten with full system/setup/deploy guide; `.env.example` lists all vars.

## Decisions made
- IDs are text UUIDs; API keeps `_id` response shape for frontend compatibility.
- Hosting will be Sevalla or Railway (long-running Node) → in-process scheduler; `/api/reminders/tick` (Bearer CRON_SECRET) is backup trigger.
- "Reached" = caller pressed a key or spoke (Twi) / AI confirms patient (English). Silence→Twi plays message but follow-up continues. Twi-preferring patients always get the menu; English-preferring skip it.
- Test calls (kind=test) never change patient data or send danger alerts.
- Scheduler does not run under `npm run dev` unless `REMINDERS_IN_DEV=true` (dev shares live DB). `REMINDERS_DRY_RUN=true` logs without sending.
- Did NOT machine-translate Twi SMS; staff write them on the templates page.
- High risk = score ≥ 4 (BP ≥140/90 alone = high).
- Vitest 4 (not 5) because v5 needs @types/node ≥22.

## Problems solved
- Next.js `route.ts` may not export helpers → keep helpers in `lib/`.
- Drizzle RQB: relation names collided with FK columns → FK columns renamed `*Id`.
- Stale `.next` cache after `next build` made nested API routes 404 in dev → stop server, delete `.next`, restart.
- Stopping the background dev server leaves an orphan Node process on the port → kill it (PowerShell Get-NetTCPConnection).
- Vapi hook timers start after the assistant finishes speaking (docs) → Twi recording isn't cut off.
- Vitest alias on Windows needs forward-slash absolute paths.

## Current state
- Everything builds, typechecks, and all unit + e2e tests pass (dry-run mode). DB contains only the admin user.
- NOT verified: a real phone call. Vapi number is a free US number (can only call +1), so calls to Ghana +233 fall back to Arkesel Twi voice.
- Nothing is committed to git (all changes unstaged).

## Next session starts with
1. User to import a Ghana-capable number (e.g. Twilio) into Vapi, set `VAPI_PHONE_NUMBER_ID`, then use Dashboard → Reminder Automation → "Call my phone" and the browser "Test IVR call" (try both Twi and English branches).
2. Deploy to Sevalla/Railway; set `APP_URL` to the public URL (enables webhook); run `npm run migrate`.
3. Commit the work once the user approves.

## Open questions
- Staff need to write Twi SMS templates (none exist yet).
- Admin account has no phone number (admins receive alerts by SMS) — no UI exists to edit user phone numbers.
- E2E tests should run against a Neon test branch (they refuse to run on a DB with real patients).
- User's supervisor demo plan/timing not discussed.
