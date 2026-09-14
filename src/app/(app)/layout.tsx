import { redirect } from "next/navigation";
import { getCurrentUser, getViewerTimeZone, getSessionTimeZone } from "@/lib/auth";
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
      >
        {children}
      </AppShell>
    </TimeZoneProvider>
  );
}
