// Run one of the scripts in this folder against production.
//
//   node scripts/prod.mjs set-basic-logins            dry run
//   node scripts/prod.mjs set-basic-logins --apply    write
//
// Two things make a production run different from a local one, and both are
// handled here so neither has to be remembered:
//
//   * The connection string is a Firebase App Hosting secret. It is read at run
//     time and handed to the child process in its environment — never written
//     to a file, echoed, or left in shell history.
//   * The generated Prisma client is built for one database. Local development
//     leaves it on SQLite, which refuses a postgres:// URL outright, so this
//     rebuilds it for Postgres first and puts it back to SQLite afterwards,
//     even when the script fails.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const PROJECT = "scadxctf-7271a";
const [script, ...rest] = process.argv.slice(2);

// shell: true throughout: firebase and npx are .cmd wrappers on Windows and
// Node refuses to spawn those directly.
const sh = (command, options = {}) => spawnSync(command, { shell: true, ...options });

if (!script) {
  console.error("usage: node scripts/prod.mjs <script-name> [--apply]");
  process.exit(1);
}
const path = `scripts/${script.replace(/\.ts$/, "")}.ts`;
if (!existsSync(path)) {
  console.error(`no such script: ${path}`);
  process.exit(1);
}

const secret = sh(`firebase apphosting:secrets:access DATABASE_URL --project ${PROJECT}`, {
  encoding: "utf8",
});
const url = (secret.stdout ?? "").trim();
if (secret.status !== 0 || !url) {
  console.error("Could not read the DATABASE_URL secret. The CLI said:");
  console.error((secret.stderr || secret.error?.message || "(no output)").trim());
  console.error("If that looks like an auth error, run:  firebase login");
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error("The DATABASE_URL secret does not look like a Postgres connection string.");
  process.exit(1);
}

console.log("[prod] building the Prisma client for Postgres...");
const generated = sh("npx prisma generate --schema prisma/schema.prisma", { encoding: "utf8" });
if (generated.status !== 0) {
  console.error("Could not generate the Postgres client:");
  console.error((generated.stderr || "(no output)").trim());
  console.error("A running dev server holds the query engine open on Windows — stop it and retry.");
  process.exit(1);
}

console.log(`[prod] ${path} ${rest.join(" ")}`.trim());
const run = sh(`npx tsx ${path} ${rest.join(" ")}`.trim(), {
  env: { ...process.env, DATABASE_URL: url },
  stdio: "inherit",
});

// Local development gets its SQLite client back whatever happened above.
console.log("[prod] restoring the local SQLite client...");
const restored = sh("npm run db:local", { encoding: "utf8" });
if (restored.status !== 0) {
  console.error("Could not restore the local client — run `npm run db:local` by hand.");
}

process.exit(run.status ?? 1);
