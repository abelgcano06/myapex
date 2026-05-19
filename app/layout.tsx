import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#534AB7",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "My Apex",
  description: "Your peak performance, decoded.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "My Apex",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.className}>
      <body style={{ background: "#F5F4F1", color: "#2C2C2A", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
