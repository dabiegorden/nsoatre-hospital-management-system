# Nsoatre Government Hospital — Antenatal Care System

A Next.js app for the antenatal clinic at Nsoatre Government Hospital, Sunyani, Ghana. It
manages pregnant women, appointments and visits, and **follows up automatically**: reminder
SMS before every visit, and after a missed visit a bilingual phone call in which the patient
chooses **Twi** (a recorded message) or **English** (a live AI nurse that asks why she missed,
screens for pregnancy danger signs and asks when she can come back).

## What makes it different

| Feature | What it does |
|---|---|
| Automatic reminder pipeline | Day-before and same-day SMS; after a missed visit: SMS, then calls, then the relative, then the admins — no button-pressing |
| Bilingual IVR call | "Press 1 or say Twi / press 2 or say English". Twi plays the hospital's recorded message; English connects to the AI nurse (Vapi) |
| Language memory | The choice on an answered call is remembered: English patients go straight to the AI nurse; Twi patients get Twi SMS (staff-written templates) and a one-key menu that confirms a real person answered |
| AI danger-sign screening | The AI nurse asks about bleeding, severe headache, blurred vision, swelling, fits, abdominal pain, fever, leaking water and reduced fetal movement. Any yes → immediate SMS alert to all admins |
| Risk scoring | Every patient is scored low / moderate / high from BP, Hb, age, infections, gestation and missed visits. High-risk patients get 3 calls, 5 minutes apart (others 2, 10 minutes apart) |
| WHO 8-contact schedule | Marking a visit *completed* books the next WHO ANC contact (12, 20, 26, 30, 34, 36, 38, 40 weeks) from the due date, on a weekday |
| Defaulter tracking | Women who miss 2+ visits in a row or cannot be reached are listed by risk, assigned to a community health nurse, and tracked to "returned to care" |
| Delivery readiness | An SMS with birth-preparedness advice about 4 weeks before the due date |
| Analytics & reports | Attendance rate by month, call answer rate, Twi vs English, reasons for missing, danger signs, "did reaching the patient bring her back?", monthly CSV and printable report |
| Reliable by design | Every step is claimed atomically in Postgres, so restarts, crashes or several servers never send a reminder twice; call results arrive by webhook **and** are polled as a fallback; a call only counts as "reached" when a person pressed a key or spoke; a call that cannot connect falls back to an Arkesel Twi voice message |
| Twi SMS | Staff write the reminder texts in Twi on the *SMS Templates* page; Twi-preferring patients receive them, everyone else gets English |

## Tech stack

Next.js 16 (App Router) · TypeScript · Neon Postgres + Drizzle ORM · Tailwind + shadcn/ui ·
Arkesel (SMS and voice fallback, Ghana) · Vapi (AI voice calls) · Resend (email) · Recharts.

## Reminder pipeline

Runs every minute inside the server (`instrumentation.ts` → `lib/reminders/scheduler.ts` →
`lib/reminders/engine.ts`). Times are Ghana time (GMT).

| When | Action |
|---|---|
| 24 h before the visit | Reminder SMS to the patient |
| 3 h before the visit | Same-day reminder SMS |
| 15 min after the visit time, not marked completed | Visit marked **missed** |
| Right after | SMS to the patient + alert SMS to admins |
| +5 min, then every 10 min (high risk: every 5 min) | IVR call — 2 attempts (high risk: 3) |
| All calls unanswered | SMS to the relative's phone + escalation SMS to admins; patient appears on the Defaulters list |
| Patient reached on a call | Chain stops; outcome, language and danger signs saved |

SMS go out 07:00–20:00 and calls 08:00–19:00 only. **Staff should mark arrivals as
"completed" within the grace period** (`REMINDER_MISSED_GRACE_MINUTES`, default 15), otherwise
the patient is treated as missed.

### The IVR call (Vapi Squad)

```
Language Menu ──(1 / "Twi")──────► Twi Reminder  — plays TWI_AUDIO_URL, then hangs up
              └─(2 / "English")──► English Nurse — AI conversation (GPT-4o, voice "Hana")
   (no answer / unclear → Twi message, but the follow-up continues)
```

Patients known to prefer English skip the menu. The Twi branch is only counted as "reached"
when the caller pressed 1 or spoke, so an answering machine never stops the follow-up.

Defined in `lib/vapi/ivr.ts`. If a Vapi call cannot be placed, or is placed but never connects
(for example a number that cannot dial Ghana), the system falls back to an
**Arkesel voice call** that plays the same Twi recording, so the patient is still reached.

## Setup

```bash
npm install
cp .env.example .env      # fill in the values
npm run migrate           # create / update the Postgres tables
npm run dev
```

All environment variables are documented in `.env.example`.

### Vapi (AI calls)

1. Put `VAPI_PRIVATE_API_KEY`, `VAPI_PUBLIC_API_KEY` and `VAPI_PHONE_NUMBER_ID` in `.env`.
   The "call outcome" structured output is created in your Vapi account automatically on the
   first call.
2. **Calling Ghana numbers:** free Vapi phone numbers can only call US (+1) numbers. To call
   +233 patients, import a Twilio (or Telnyx/Vonage) number into Vapi and set its id as
   `VAPI_PHONE_NUMBER_ID`. Until then, calls to Ghana use the Arkesel Twi voice fallback.
3. After deploying, set `APP_URL` to the public URL. Call results then arrive instantly at
   `/api/vapi/webhook` (secured with `VAPI_WEBHOOK_SECRET`). Without it, results are polled
   from Vapi every minute.

### Testing without sending anything

- `REMINDERS_DRY_RUN=true` runs the whole pipeline and logs every SMS and call without
  sending them.
- **Test IVR call in browser**: on any appointment page, *Automatic Reminders → Test IVR call
  in browser* runs the real Twi/English call through your microphone (say "Twi" or "English"
  at the menu). Works on Vapi's free plan.
- *Dashboard → Reminder Automation → Run now* triggers a reminder pass immediately.
- *Dashboard → Reminder Automation → Call my phone* places the real patient call to your own
  phone (needs a Vapi number that can dial your country). Test calls never change patient
  records or alert staff.
- The scheduler does not run under `npm run dev` (which usually shares the live database)
  unless `REMINDERS_IN_DEV=true`.

### Automated tests

```bash
npm test                     # 36 unit tests (call classification, risk, WHO schedule, IVR config, ...)

# end-to-end (126 checks): start a dry-run server first, against a Neon TEST branch
REMINDERS_DRY_RUN=true REMINDERS_ENABLED=false npx next dev -p 3123
npm run test:e2e
```

The end-to-end suites refuse to run unless the server is in dry-run mode and the database
has no real patients, because they run the reminder engine over every due appointment.

## Deployment (Railway / Sevalla)

Deploy as a normal Node.js service (`npm run build`, `npm start`) with the variables from
`.env.example`. The reminder scheduler starts with the server. Run `npm run migrate` once per
release. If you run more than one instance, they share the work safely (database lease);
you may also set `REMINDERS_ENABLED=false` on extra instances. As a backup trigger, an
external cron can `POST /api/reminders/tick` with `Authorization: Bearer $CRON_SECRET`.

## Project map

| Path | Purpose |
|---|---|
| `models/schema/` | Drizzle schema, one file per table (`index.ts` re-exports all) |
| `drizzle/` | SQL migrations |
| `lib/reminders/` | Engine, scheduler, timings, SMS texts |
| `lib/calls/` | Placing calls (Vapi → Arkesel fallback) and processing outcomes |
| `lib/vapi/` | Vapi client, IVR squad, call-outcome extraction |
| `lib/risk.ts`, `lib/anc-schedule.ts` | Risk score and WHO contact schedule |
| `lib/defaulters.ts`, `lib/analytics.ts` | Defaulter detection and statistics |
| `app/api/vapi/webhook` | Vapi call events |
| `app/(admin)/dashboard/calls`, `defaulters`, `analytics` | New dashboard pages |

---

# Appendix: Past records archival

## Overview

This system maintains two types of records for each pregnant woman:

1. **Current/Active Records** - In `pregnant_women` table
2. **Historical Records** - In `past_records` table

## Workflow Explanation

### First Visit (Day 1)

\`\`\`
Patient: Jane Doe
Date: January 15, 2025

- Creates new PregnantWoman record with current medical data
- Blood Pressure: 120/80
- Weight: 65 kg
- Gestational Age: 12 weeks
- Next visit scheduled: February 15, 2025
  \`\`\`

### Second Visit (Next Month - February 15, 2025)

When you UPDATE the PregnantWoman record with new visit data:

1. **Automatic Archival** (happens in `/api/pregnant-women/[id]` PUT endpoint)

   - OLD data (from January 15) is captured with visitDate = January 15
   - This archived record is saved to `past_records` table
   - Includes: Blood Pressure, Weight, Gestational Age, all test results, notes, etc.
   - `visitDate` field stores WHEN the old data was recorded

2. **New Data Replaces Current**
   - PregnantWoman record now contains February 15 data
   - Blood Pressure: 130/85 (new measurement)
   - Weight: 68 kg (new measurement)
   - Gestational Age: 16 weeks (new measurement)

### Result

- **On Main Dashboard** (/dashboard/pregnant-women)

  - Shows CURRENT/LATEST data for Jane Doe from February 15
  - This is what you update when she visits next time

- **On Past Records Page** (/dashboard/pregnant-women/past-records?id=...)
  - Shows HISTORY of all previous visits
  - Visit 1: January 15 - with all measurements from that day
  - You can download/print each past visit independently

## Data Flow Diagram

\`\`\`
VISIT 1 (Jan 15)
↓
PregnantWoman: {bloodPressure: "120/80", weight: 65, ...}
↓
VISIT 2 (Feb 15) - User clicks UPDATE
↓

1. PregnantWoman (Jan 15 data) → PastRecord {visitDate: Jan 15, ...}
2. PregnantWoman ← Updated with Feb 15 data
   ↓
   Result:

- PastRecord: Jan 15 visit archived
- PregnantWoman: Contains Feb 15 data (current/active)
  \`\`\`

## Key Features

### Archives Include

- All medical measurements (BP, Height, Weight, Gestational Age)
- All test results (HBsAg, G6PD, Syphilis, TB, HIV)
- All treatment flags (supplements, ITN distribution, ART treatment)
- Supplements and interventions given
- Visit notes
- Exact visitDate (when the visit occurred)
- RecordedBy (who recorded the data)

### Download/Print Options

1. **Main Dashboard** → Download/Print button

   - Downloads CURRENT records (active data for next visit)
   - Generated with current date/time

2. **Past Records Page** → Download/Print button
   - Downloads SELECTED PAST VISIT
   - Shows historical visit date when the data was recorded
   - Shows "Generated: [current date]" for audit trail

## Advantages

✓ Complete visit history tracking
✓ Compare progression across visits
✓ Easy to spot changes (BP, weight, gestational age, test results)
✓ Can download any past visit for records/compliance
✓ Current data always ready for next visit update
✓ No need to manually archive - automatic on update
