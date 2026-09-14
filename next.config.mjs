/** @type {import('next').NextConfig} */

// Static security headers for every response. The Content-Security-Policy is set
// per-request in src/middleware.ts (it carries a nonce), not here.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Keep the demo build resilient: lint issues shouldn't block `next build`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Rewrite barrel-file imports (`import { Send } from "lucide-react"`) to the
  // individual modules, so a page ships the handful of icons it uses instead of
  // pulling on the whole set.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
