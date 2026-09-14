import { NextResponse } from "next/server";

// Liveness check that deliberately touches nothing: no database, no session, no
// cookies. The keep-warm pinger hits this to hold a Cloud Run instance open
// without spending Neon compute hours, and it's a cheap way to confirm the
// server itself is up when a page feels slow.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      at: new Date().toISOString(),
      // Cloud Run stamps every deployed revision with a unique name. Reporting
      // it here is the only way to tell from outside whether a push has
      // actually rolled out yet, the pages that change are behind a login, and
      // static asset hashes don't move unless that page's own code changed.
      revision: process.env.K_REVISION ?? "unknown",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
