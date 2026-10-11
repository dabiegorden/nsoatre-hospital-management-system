// Runs every end-to-end suite in sequence against a running dry-run server:
//
//   REMINDERS_DRY_RUN=true REMINDERS_ENABLED=false npx next dev -p 3123
//   npm run test:e2e
//
// Use a Neon test branch for DATABASE_URL: the suites refuse to run when the
// database contains real patients (override with E2E_ALLOW_REAL_DATA=true).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const suites = ["api.e2e.mjs", "reminders.e2e.mjs", "features.e2e.mjs"];
let failed = 0;

for (const suite of suites) {
  console.log(`\n=== ${suite}`);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(suite, import.meta.url))], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) failed++;
  if (result.status === 2) break; // safety check refused to run
}

console.log(failed ? `\n${failed} suite(s) failed` : "\nAll end-to-end suites passed");
process.exit(failed ? 1 : 0);
