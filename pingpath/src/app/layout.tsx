import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PingPath",
  description: "Your outreach, organized — contacts, sequences, and who's next.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#12211c",
  width: "device-width",
  initialScale: 1,
  // Lets iOS report the home-indicator / notch insets (env(safe-area-inset-*)),
  // which the bottom menu and sheets use to stay clear of them.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
