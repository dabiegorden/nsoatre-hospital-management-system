# Past Records Archival System - Complete Workflow

## Overview

This system maintains two types of records for each pregnant woman:

1. **Current/Active Records** - In `PregnantWoman` collection
2. **Historical Records** - In `PastRecord` collection

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
   - This archived record is saved to `PastRecord` collection
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
