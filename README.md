# SCAD Atlanta Distance — Team Hub

A private, full-stack team platform for a college running coach and his athletes.
It combines **personal workout scheduling** (like Garmin/Clipboard) with **team
communication** (like Band) in one clean dashboard — built specifically for a
distance squad, not a generic fitness app.

The coach can send personalized running schedules to ~20 athletes, message the whole
team or individuals, track who has completed each session, and read honest
post-workout feedback. Athletes get a focused view of their own training, a calendar,
their coach's messages, and a simple place to log how each run actually felt.

---

## ✨ Features

**Authentication & roles**
- Email/password sign up & log in, with secure HTTP-only session cookies (JWT).
- Two roles — **Coach/Admin** and **Athlete** — with strict, server-enforced access.
- Athletes only ever see their own schedule, feedback, and messages.

**Coach dashboard**
- Roster of all athletes with today's status at a glance.
- Add / edit / remove athletes (removal is a soft-archive that keeps history).
- Create a workout once and assign it to the **whole team** or **specific athletes**.
- Per-athlete custom notes on any assignment ("just for you").
- Week-completion %, "need to discuss" count, unread messages, and a live feed of
  recent athlete feedback (effort, how they felt, soreness flags).
- Upcoming-workout overview and per-athlete profiles with full feedback history.

**Athlete dashboard**
- Today's workout in full (warm-up / main set / cool-down, pace, location, links).
- A 7-day week strip and a complete schedule view.
- Quick status buttons: **Completed**, **Skipped**, **Need to discuss**.
- A post-workout feedback form: completion, effort (RPE 1–10), how you felt,
  soreness, and private notes for the coach.
- Latest team announcement and coach messages, with unread badges.

**Workout scheduling** — date, title, type, distance, pace/effort, warm-up, main set,
cool-down, notes, location, optional link, and team/individual assignment.

**Calendar** — clean month grid, color-coded by type (Easy, Workout, Long Run, Race,
Rest, Recovery). Coach sees the whole team; athletes see only their own sessions.

**Messaging (Band-style)** — a team announcement channel plus private coach↔athlete
threads, timestamps, unread indicators, and a simple chat UI.

**Privacy by design** — feedback, soreness notes, and messages are visible only to the
athlete and the coach. One athlete can never see another athlete's data.

---

## 🧱 Tech stack

| Layer       | Choice                                                        |
| ----------- | ------------------------------------------------------------- |
| Framework   | **Next.js 15** (App Router, React 19, TypeScript)             |
| Styling     | **Tailwind CSS** + `lucide-react` icons                       |
| Database    | **SQLite** via **Prisma 6** (zero external services to set up)|
| Auth        | Custom JWT sessions (`jose`) in HTTP-only cookies, `bcryptjs` |

Everything runs locally with no cloud accounts or API keys required.

---

## 🚀 Getting started

> Requires **Node.js 18.18+** (developed on Node 22/25). npm comes with Node.

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Create the SQLite database and load demo data
#    (generates client, pushes the schema, seeds the real roster + 4-phase plan)
npm run setup

# 3. Start the dev server
npm run dev
```

Then open **http://localhost:3000**.

If you cloned this repo fresh and there is no `.env` file, create one first:

```bash
cp .env.example .env      # Windows PowerShell: copy .env.example .env
```

`.env` just needs a `DATABASE_URL` (SQLite file) and a `JWT_SECRET` — the example
file has sensible defaults for local development.

### Demo logins

The seed loads the real **SCAD Atlanta Cross Country** roster — 19 athletes in their
mileage groups (A/B/C/D) with personal pace targets — and the full **4-phase, 24-week
periodized plan** (6/8 → 11/22/2026) from the team's spreadsheet, with each athlete
placed on their group's workouts. **Everyone signs in with a username**, never an email
address. Straight from the seed the password is `password123`; the login screen also has
one-click **Coach demo** / **Athlete demo** buttons.

| Role    | Username  |
| ------- | --------- |
| Coach   | `coach`   |
| Athlete | `viren`   |

To hand the real team their own logins, run `npx tsx scripts/set-basic-logins.ts` — it
prints a username/password sheet (one per person, derived from their name, e.g.
`viren` / `virenxc2026`) and `--apply` writes it. Anyone can change theirs in Settings.

---

## 🧭 A quick tour to show your coach

1. Click **Coach demo** on the login screen.
2. The **Dashboard** shows the roster, week completion, and a feed of real athlete
   feedback. Hit **New workout** → build a track session → assign it to the **whole
   team** or pick individual runners.
3. Open **Calendar** to see the color-coded training block; click any day to add a
   session on that date.
4. Open **Athletes** → click a runner to see their mileage group, pace targets, and
   full feedback history (soreness notes included — visible only to you).
5. Sign out, then click **Athlete demo** to see the exact same data from a runner's
   side: today's workout, status buttons, the feedback form, and pace targets.

---

## 📜 Scripts

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `npm run dev`      | Start the dev server at `localhost:3000`                  |
| `npm run build`    | Production build                                          |
| `npm run start`    | Run the production build                                  |
| `npm run setup`    | Generate client → push schema → seed demo data            |
| `npm run db:seed`  | Re-seed the database (wipes & recreates demo data)        |
| `npm run db:reset` | Force-reset the schema and re-seed                        |

---

## 🗂️ Project structure

```
prisma/
  schema.prisma        # Team, User, Workout, Assignment, Feedback, Message models
  scad-data.ts         # Roster + 4-phase plan extracted from the team spreadsheet
  seed.ts              # Coach + 18 athletes (groups + paces) + 24-week plan + messages
src/
  app/
    (app)/             # Authenticated, role-aware pages (shared sidebar shell)
      dashboard/        calendar/   workouts/
      messages/         athletes/   settings/
    api/               # Route handlers (auth, workouts, feedback, messages, ...)
    login/  signup/    # Public auth screens
    layout.tsx  page.tsx  not-found.tsx
  components/          # AppShell, dashboards, calendar, chat, forms, UI primitives
  lib/                 # prisma, auth (JWT), constants, dto serializers, date utils
  middleware.ts        # Redirects unauthenticated users to /login
```

---

## 🗃️ Data model

- **Team** — name, season, coach, members.
- **User** — name, email, password hash, `role` (`COACH` | `ATHLETE`), and athlete
  profile fields (grad year, events, hometown, phone, emergency contact, personal
  bests, bio).
- **Workout** — title, date, `type`, `scope` (team/individual), distance, pace,
  warm-up, main set, cool-down, notes, location, link.
- **Assignment** — joins a workout to an athlete with a `status`
  (`ASSIGNED` → `VIEWED` → `COMPLETED` / `SKIPPED` / `NEEDS_DISCUSSION`), an optional
  per-athlete custom note, and view/respond timestamps. This is how one workout is
  assigned to many athletes and tracked per person.
- **Feedback** — completion, effort (1–10), how they felt, soreness, private notes.
- **Message** — `DIRECT` (coach↔athlete) or `ANNOUNCEMENT` (coach→team), with read
  state and timestamps.

> SQLite has no native enums, so role/type/status are stored as strings and validated
> in `src/lib/constants.ts` (the single source of truth).

---

## Weekly Excel import

Coaches can select **Import Excel week** on their dashboard or Training page. Upload an `.xlsx` workbook (up to 2 MB), select its Monday, review the athlete matches and daily sessions, then choose **Publish week**. Athletes receive the assignments through their existing training schedule and calendar.

The importer supports the existing **Training, 9-14.xlsx** layout: a **Training** sheet with a `WEEK` date range, seven Monday-to-Sunday columns, and labeled A–D group rows, plus a **Pace Chart** with `NAME` and `MILEAGE GROUP` headers. It reads labels rather than fixed row numbers and preserves prescriptions, practice locations/times, staff, lift times, meetings, and PR notes. The selected Monday supplies the year when the heading omits it. Split groups such as `VOL: C, WO: D` use the volume group for easy days and the workout group for quality sessions.

Names match the active team roster by email, full name, or unique first name/initials. Ambiguous names, duplicate chart rows, and unresolved groups such as `TBD-INJ` require an explicit correction or skip before publishing. Weekly group choices do not change saved athlete profiles. Formula-driven assignment cells must be replaced with confirmed values.

**Add sessions** preserves existing sessions and skips identical assignments. **Replace unlogged sessions** replaces pending assignments only for the athletes and days shown; completed/flagged sessions, feedback, and personal coach notes are protected. Publishing rechecks coach access, roster, and schedule in a transaction, and asks for a new preview if the reviewed data changed. Uploads are processed in memory and are not retained as files.

Run `npm run test:imports` for workbook validation, parsing, planning, and database integration checks. Database tests create a fresh, isolated SQLite database in the OS temporary directory.

## 🔒 Security notes

- Passwords are hashed with bcrypt; sessions are signed JWTs in `httpOnly`,
  `sameSite=lax` cookies.
- Every API route re-checks the session and role on the server (`requireUser` /
  `requireCoach`); the UI gating is convenience only.
- Athlete-owned actions verify ownership (an athlete can only respond to their own
  assignments and read their own feedback).

This is an MVP intended for a local demo. Before any real deployment, set a strong
`JWT_SECRET`, move to a hosted database (e.g. Postgres), and serve over HTTPS.
