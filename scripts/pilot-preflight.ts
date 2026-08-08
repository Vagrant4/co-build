import { assertPilotReadiness, pilotReadinessIssues } from "../src/lib/pilot-readiness";

try {
  const issues = pilotReadinessIssues();
  if (issues.length) {
    console.error("Co-Build pilot preflight failed:");
    for (const issue of issues) console.error(`- [${issue.key}] ${issue.message}`);
    process.exitCode = 1;
  } else {
    assertPilotReadiness();
    console.log("Co-Build pilot preflight passed without exposing configured values.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Co-Build pilot preflight failed.");
  process.exitCode = 1;
}
