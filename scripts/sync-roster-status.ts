/* eslint-disable no-console */
// Make a database agree with prisma/scad-data.ts about who is on the team.
//
// The roster file is the record of who is training: an athlete the coach has
// removed carries `active: false` there. A database that was seeded before that
// edit still has them on the roster, which is the state production ends up in
// whenever a departure is applied locally and never carried across.
//
// Soft-remove only, the same thing the coach's own "remove from roster" does:
// the account is deactivated, its history kept, and nothing is ever deleted. An
// athlete who is back on the chart is reactivated the same way.
//
// Dry run:  npx tsx scripts/sync-roster-status.ts
// Apply:    npx tsx scripts/sync-roster-status.ts --apply
import { PrismaClient } from "@prisma/client";
import { ATHLETES } from "../prisma/scad-data";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(APPLY ? "APPLYING roster status\n" : "DRY RUN — pass --apply to write\n");

  const changes: { id: string; name: string; from: boolean; to: boolean }[] = [];
  for (const seed of ATHLETES) {
    const user = await prisma.user.findUnique({
      where: { email: seed.email },
      select: { id: true, name: true, active: true },
    });
    if (!user) {
      console.log(`  missing from this database: ${seed.name} <${seed.email}>`);
      continue;
    }
    const shouldBeActive = seed.active ?? true;
    if (user.active !== shouldBeActive) {
      changes.push({ id: user.id, name: user.name, from: user.active, to: shouldBeActive });
    }
  }

  if (!changes.length) {
    console.log("Roster status already matches scad-data. Nothing to do.");
    return;
  }
  for (const c of changes) {
    console.log(`  ${c.name.padEnd(10)} ${c.from ? "active" : "off roster"} -> ${c.to ? "active" : "off roster"}`);
  }

  if (!APPLY) {
    console.log("\nDry run complete — nothing written.");
    return;
  }

  for (const c of changes) {
    await prisma.user.update({
      where: { id: c.id },
      // Deactivating also retires any session they still hold.
      data: { active: c.to, sessionVersion: { increment: 1 } },
    });
  }
  console.log(`\nDone. ${changes.length} account(s) updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
