import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toMessageDTO, toGroupMessageDTO } from "@/lib/dto";
import { MESSAGE_HISTORY } from "@/lib/query-limits";
import { MESSAGE_NEWEST_FIRST } from "@/lib/ordering";
import { MessagesView } from "@/components/messages-view";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isCoach = user.role === "COACH";
  const teamId = user.teamId ?? undefined;

  // Each channel takes the newest MESSAGE_HISTORY rows (descending), then gets
  // flipped back into chronological order for display. Without the cap, opening
  // Messages pulled every message the team had ever sent, images included, and
  // sent them all to the phone.
  const newestFirst = { orderBy: MESSAGE_NEWEST_FIRST, take: MESSAGE_HISTORY } as const;
  const senderName = { sender: { select: { name: true } } } as const;

  // Every query on this page is independent, so they all go out at once. This
  // used to be six sequential round-trips to the database, one waiting on the
  // next, and that latency was most of the wait before the screen appeared.
  const [team, dmRows, annRows, groupRows, photoRows, memberRows, athleteRows] =
    await Promise.all([
      teamId
        ? prisma.team.findUnique({
            where: { id: teamId },
            select: { coach: { select: { id: true, name: true } } },
          })
        : Promise.resolve(null),
      prisma.message.findMany({
        where: {
          type: "DIRECT",
          OR: [{ senderId: user.id }, { recipientId: user.id }],
        },
        ...newestFirst,
      }),
      prisma.message.findMany({
        where: { type: "ANNOUNCEMENT", teamId },
        ...newestFirst,
      }),
      prisma.message.findMany({
        where: { type: "GROUP", teamId },
        include: senderName,
        ...newestFirst,
      }),
      prisma.message.findMany({
        where: { type: "PHOTOS", teamId },
        include: senderName,
        ...newestFirst,
      }),
      // Everyone on the team (coach first), with each member's team-chat read
      // cursor so the group chat can show who has seen messages.
      prisma.user.findMany({
        where: { teamId, active: true },
        select: { id: true, name: true, role: true, lastReadTeamChatAt: true },
        orderBy: [{ role: "desc" }, { name: "asc" }],
      }),
      isCoach
        ? prisma.user.findMany({
            where: { teamId, role: "ATHLETE", active: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve(null),
    ]);

  // The team record names the coach; if it somehow doesn't, fall back to
  // whoever on the roster holds the coach role (memberRows is already loaded,
  // so this costs nothing extra).
  const coachFromTeam = team?.coach ?? null;
  const coachFromRoster = memberRows.find((m) => m.role === "COACH") ?? null;
  const coachId = coachFromTeam?.id ?? coachFromRoster?.id ?? "";
  const coachName = coachFromTeam?.name ?? coachFromRoster?.name ?? "Coach";

  const chronological = <T,>(rows: T[]) => rows.slice().reverse();

  const dms = chronological(dmRows).map(toMessageDTO);
  const anns = chronological(annRows).map((m) => ({
    id: m.id,
    body: m.body,
    createdISO: m.createdAt.toISOString(),
  }));
  const groupMsgs = chronological(groupRows).map(toGroupMessageDTO);
  const photoMsgs = chronological(photoRows).map(toGroupMessageDTO);

  const members = memberRows.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    lastReadISO: m.lastReadTeamChatAt ? m.lastReadTeamChatAt.toISOString() : null,
  }));

  const athletes = athleteRows ?? [{ id: coachId || "coach", name: coachName }];

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={
          isCoach
            ? "Announce to the team or message athletes privately."
            : "Team announcements and private messages with your coach."
        }
      />
      <MessagesView
        meId={user.id}
        meName={user.name}
        isCoach={isCoach}
        coachName={coachName}
        athletes={athletes}
        initialDms={dms}
        initialAnns={anns}
        initialGroup={groupMsgs}
        initialPhotos={photoMsgs}
        members={members}
      />
    </div>
  );
}
