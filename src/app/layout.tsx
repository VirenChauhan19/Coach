import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { FirebaseAnalytics } from "@/components/firebase-analytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SCAD Atlanta Distance Team Hub",
  description:
    "Private team platform for the SCAD Atlanta distance squad. Personalized schedules, calendar, messaging, and athlete feedback.",
  applicationName: "SCAD Distance",
  appleWebApp: { capable: true, title: "SCAD Distance", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#13171F",
  width: "device-width",
  initialScale: 1,
  // Let content extend under the notch/home indicator; we pad with safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-app font-sans">
        {/* Dev only: unregister any stale service worker left on this origin
            (a common localhost cause of weird caching) and drop its caches.
            Skipped in production so it never trips the strict CSP. */}
        {process.env.NODE_ENV !== "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})});if(window.caches){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})}}}catch(e){}})();",
            }}
          />
        )}
        {children}
        {/* Firebase Analytics, production only (dev CSP blocks the GA beacons,
            and we don't want localhost traffic polluting measurement). */}
        {process.env.NODE_ENV === "production" && <FirebaseAnalytics />}
      </body>
    </html>
  );
}
