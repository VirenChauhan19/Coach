/* eslint-disable no-console */
// Give every account on the roster a simple login of its own — a username and
// a password, no email address anywhere — and print the sheet the coach hands
// out.
//
// The seed puts the whole team on one shared demo password, which is fine for a
// demo and wrong for real athletes: anyone who knows it can sign in as anyone
// else and read their paces, their feedback and their notes to the coach. This
// gives each person their own, derived from their name, so the sheet is
// predictable to read out loud and still unique per athlete:
//
//     viren  /  virenxc2026
//     sam    /  samxc2026
//
// They are not secrets to keep, they are starting points — anyone can change
// theirs in Settings, and doing so replaces what this set. Nothing here forces
// a reset, so a first login lands straight on today's session and the athlete
// can mark it completed without a password ceremony in the way. (The stricter
// rollout, one shared temp password plus a forced reset, is
// scripts/provision-accounts.ts; use that one instead if you want the reset.)
//
// Inactive accounts are skipped: someone who has left the team does not get a
// working login handed back to them.
//
// Dry run:  npx tsx scripts/set-basic-logins.ts
// Apply:    npx tsx scripts/set-basic-logins.ts --apply
// Idempotent: the same input always produces the same passwords.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { usernameFromEmail } from "../src/lib/username";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** The password for one username. Lower case, no punctuation, always >= 8 chars. */
function passwordFor(username: string): string {
  return `${username}xc2026`;
}

async function main() {
  console.log(APPLY ? "APPLYING basic logins\n" : "DRY RUN — pass --apply to write\n");

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, username: true, role: true, mustChangePassword: true },
  });
  const skipped = await prisma.user.findMany({
    where: { active: false },
    select: { name: true },
  });

  // An account that predates usernames takes the local part of its address,
  // which is the name everyone already knows it by.
  const rows = users.map((u) => {
    const username = u.username ?? usernameFromEmail(u.email);
    return { ...u, username, password: passwordFor(username) };
  });
  const clashes = rows.filter((r, i) => rows.findIndex((o) => o.username === r.username) !== i);
  if (clashes.length) {
    console.log("two accounts want the same username — fix these by hand first:");
    for (const c of clashes) console.log(`  ! ${c.username}  <${c.email}>`);
    process.exitCode = 1;
    return;
  }

  console.log("================ TEAM LOGIN SHEET ================");
  console.log(`${"ROLE".padEnd(8)}${"USERNAME".padEnd(14)}${"PASSWORD".padEnd(16)}NAME`);
  for (const r of rows) {
    console.log(`${r.role.padEnd(8)}${r.username.padEnd(14)}${r.password.padEnd(16)}${r.name}`);
  }
  console.log(`=================================================`);
  console.log(`${rows.length} account(s). Everyone can change theirs in Settings.`);
  for (const s of skipped) console.log(`skipped (off the roster): ${s.name}`);

  if (!APPLY) {
    console.log("\nDry run complete — nothing written.");
    return;
  }

  for (const r of rows) {
    await prisma.user.update({
      where: { id: r.id },
      data: {
        username: r.username,
        passwordHash: await bcrypt.hash(r.password, 10),
        mustChangePassword: false,
        // A changed password retires the tokens issued against the old one.
        sessionVersion: { increment: 1 },
      },
    });
  }
  console.log(`\nDone. ${rows.length} account(s) updated — everyone signed out of old sessions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
