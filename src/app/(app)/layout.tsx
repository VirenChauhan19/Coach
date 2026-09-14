import { redirect } from "next/navigation";
import { getCurrentUser, getViewerTimeZone, getSessionTimeZone } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { TimeZoneProvider, TimeZoneSync } from "@/components/time-zone";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Provisioned accounts with a temporary password must set their own first, 
  // they can't reach any in-app page until they do.
  if (user.mustChangePassword) redirect("/set-password");

  // Where this viewer logged in from, every date below the shell renders in
  // this zone, on both the server and the client.
  const [zone, sessionZone] = await Promise.all([
    getViewerTimeZone(),
    getSessionTimeZone(),
  ]);

  // Run both counts concurrently so the shell that wraps every page adds one
  // round-trip of latency, not two.
  const [unreadDms, unreadAnnouncements] = await Promise.all([
    prisma.message.count({
      where: { type: "DIRECT", recipientId: user.id, readAt: null },
    }),
    user.role !== "COACH" && user.teamId
      ? prisma.message.count({
          where: {
            type: "ANNOUNCEMENT",
            teamId: user.teamId,
            ...(user.lastReadAnnouncementsAt
              ? { createdAt: { gt: user.lastReadAnnouncementsAt } }
              : {}),
          },
        })
      : Promise.resolve(0),
  ]);

  return (
    <TimeZoneProvider zone={zone}>
      <TimeZoneSync sessionZone={sessionZone} />
      <AppShell
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
        unreadMessages={unreadDms + unreadAnnouncements}
      >
        {children}
      </AppShell>
    </TimeZoneProvider>
  );
}
