import { NextRequest } from "next/server";
import { apiError, ok, ApiError, requireUser } from "@/lib/api";
import { setSessionCookie, getSessionTimeZone } from "@/lib/auth";
import { isValidTimeZone } from "@/lib/date";

/**
 * Re-stamps the session with the browser's current timezone.
 *
 * Login is the normal moment we detect it, but sessions last 30 days — an
 * athlete who flies home mid-season, or anyone signed in from before we started
 * detecting, would otherwise be stuck on a stale zone. <TimeZoneSync/> posts
 * here whenever the browser disagrees with the session.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const timeZone = String(body.timeZone ?? "");
    if (!isValidTimeZone(timeZone)) {
      throw new ApiError(400, "Unrecognized timezone.");
    }
    if ((await getSessionTimeZone()) === timeZone) {
      return ok({ changed: false });
    }
    // Same user, same session version — only the timezone claim changes, so
    // this is not a re-authentication and doesn't disturb other devices.
    await setSessionCookie(user.id, user.sessionVersion, timeZone);
    return ok({ changed: true });
  } catch (e) {
    return apiError(e);
  }
}
