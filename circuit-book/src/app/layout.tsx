import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";

// One family, two widths. The width axis does the work that condensed type
// does in most sports apps, and keeps the whole interface to a single face.
// Self-hosted rather than fetched: the app has to render on a phone with no
// signal, and a third-party font request is one more thing to fail.
const archivo = localFont({
  src: "./fonts/archivo-variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-archivo",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Circuit Book",
  description:
    "Build a library of workouts and drills, set them into routines by day, and work through them station by station.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Circuit Book",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Circuit Book",
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1110",
  width: "device-width",
  initialScale: 1,
  // The app is a fixed surface, not a document; pinch-zooming it only ever
  // strands the user mid-set. Text scales with the system font size instead.
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="min-h-dvh bg-base text-chalk antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
