import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  // getCurrentUser already resolved the session's teamId, so the profile and the
  // team can be fetched side by side instead of the team waiting on the profile.
  const [user, team] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      // Only the fields the form binds to. A bare findUnique also returns
      // passwordHash, which has no reason to be in this render.
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        hometown: true,
        gradYear: true,
        events: true,
        emergencyName: true,
        emergencyPhone: true,
        bio: true,
        mileageGroup: true,
      },
    }),
    sessionUser.teamId
      ? prisma.team.findUnique({
          where: { id: sessionUser.teamId },
          select: { name: true, season: true },
        })
      : Promise.resolve(null),
  ]);
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and profile." />
      <SettingsForm
        user={{
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          phone: user.phone,
          hometown: user.hometown,
          gradYear: user.gradYear,
          events: user.events,
          emergencyName: user.emergencyName,
          emergencyPhone: user.emergencyPhone,
          bio: user.bio,
          mileageGroup: user.mileageGroup,
        }}
        teamName={team?.name ?? "Not set"}
        season={team?.season ?? null}
      />
    </div>
  );
}
