import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main() {
  const source = requiredUrl("DIRECT_URL");
  const target = requiredUrl("RESTORE_DATABASE_URL");
  if (`${source.hostname}/${source.pathname}` === `${target.hostname}/${target.pathname}`) throw new Error("Restore target must be different from the source database.");
  if (!/restore|drill/i.test(target.pathname)) throw new Error("Restore target database name must contain restore or drill.");
  if (process.env.CONFIRM_RESTORE_DRILL !== "RESTORE_TO_DISPOSABLE_TARGET") throw new Error("Set CONFIRM_RESTORE_DRILL=RESTORE_TO_DISPOSABLE_TARGET after checking the target database.");

  const directory = await mkdtemp(join(tmpdir(), "co-build-restore-"));
  const dumpPath = join(directory, "co-build.dump");
  try {
    await run("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--file", dumpPath], postgresEnvironment(source));
    await run("pg_restore", ["--clean", "--if-exists", "--no-owner", "--no-acl", "--dbname", target.pathname.slice(1), dumpPath], postgresEnvironment(target));
    const output = await run("psql", ["--tuples-only", "--no-align", "--dbname", target.pathname.slice(1), "--command", "SELECT COUNT(*) FROM \"_prisma_migrations\";"], postgresEnvironment(target));
    const migrations = Number(output.trim());
    if (!Number.isSafeInteger(migrations) || migrations < 1) throw new Error("Restored database did not contain Prisma migration records.");
    console.log(JSON.stringify({ completedAt: new Date().toISOString(), restoredMigrationCount: migrations, targetHost: target.hostname, targetDatabase: target.pathname.slice(1) }, null, 2));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function requiredUrl(key: string): URL {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required.`);
  const url = new URL(value);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") throw new Error(`${key} must be a PostgreSQL URL.`);
  return url;
}

function postgresEnvironment(url: URL): NodeJS.ProcessEnv {
  return { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.searchParams.get("sslmode") || "require" };
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => reject(new Error(`${command} could not start: ${error.message}`)));
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} failed with exit code ${code}: ${stderr.slice(-500)}`)));
  });
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Restore drill failed."); process.exitCode = 1; });
