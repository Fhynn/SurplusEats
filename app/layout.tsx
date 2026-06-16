import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { BrowserNotificationManager } from "@/components/browser-notification-manager";
import { CustomerAppProvider } from "@/components/customer-app-provider";
import { PwaManager } from "@/components/pwa-manager";
import { RouteTransitionProvider } from "@/components/route-transition-provider";

import "leaflet/dist/leaflet.css";
import "sweetalert2/dist/sweetalert2.min.css";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "ResQFood",
  description: "Customer experience for ResQFood.",
  applicationName: "ResQFood",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ResQFood",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/logo.webp",
    apple: "/logo.webp",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.variable} antialiased`}>
        <RouteTransitionProvider>
          <CustomerAppProvider>
            {children}
            <BrowserNotificationManager />
            <PwaManager />
          </CustomerAppProvider>
        </RouteTransitionProvider>
      </body>
    </html>
  );
}
