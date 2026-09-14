import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendar",
  "/athletes",
  "/workouts",
  "/settings",
  "/set-password",
];

const isDev = process.env.NODE_ENV !== "production";

// Firebase / Google Analytics (gtag) endpoints. Allow-listed so the strict
// production CSP doesn't block measurement. Analytics only loads in production
// (see <FirebaseAnalytics/> in the root layout), so dev keeps the tighter policy.
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_CONNECT =
  "https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com";
const GA_IMG = "https://www.google-analytics.com https://*.google-analytics.com";

function buildCsp(nonce: string): string {
  // Production locks scripts to a per-request nonce (no 'unsafe-inline'); dev needs
  // eval + a websocket for Fast Refresh. Styles keep 'unsafe-inline' because
  // next/font and React inject inline <style> without a nonce.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'self' 'nonce-${nonce}' 'strict-dynamic' ${GA_SCRIPT}`;
  const connectSrc = isDev ? "'self' ws:" : `'self' ${GA_CONNECT}`;
  const imgSrc = isDev ? "'self' data:" : `'self' data: ${GA_IMG}`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// Lightweight gate (redirect on session-cookie presence) + a per-request CSP nonce.
// Real session verification happens server-side in getCurrentUser().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("__session");
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  // Intentionally NOT redirecting public pages to /dashboard on cookie presence
  // alone. A stale/expired cookie is "present" but invalid, and bouncing it here
  // would loop forever with the page-level getCurrentUser() redirect. The
  // login/signup pages send genuinely-authenticated users on to /dashboard.

  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))
  );
  const csp = buildCsp(nonce);

  // Next reads the nonce from the request CSP header and stamps it onto its own
  // scripts; x-nonce is exposed for any app code that needs it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", csp);
  if (!isDev) requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Run on every page except API routes, Next internals, and static assets.
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.png|scad-bees.png).*)",
  ],
};
