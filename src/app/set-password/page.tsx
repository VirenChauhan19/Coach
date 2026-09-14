import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SetPasswordForm } from "@/components/set-password-form";

// Rendered per-request so the CSP nonce (set in middleware) is applied to scripts.
export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Already set their own password, nothing to do here.
  if (!user.mustChangePassword) redirect("/dashboard");
  return <SetPasswordForm name={user.name} />;
}
