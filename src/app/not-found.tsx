import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-app flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <LogoMark size={48} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have
        access to it.
      </p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
