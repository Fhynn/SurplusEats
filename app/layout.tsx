import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { CustomerAppProvider } from "@/components/customer-app-provider";
import { RouteTransitionProvider } from "@/components/route-transition-provider";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "ResQFood",
  description: "Customer experience for ResQFood.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
          <CustomerAppProvider>{children}</CustomerAppProvider>
        </RouteTransitionProvider>
      </body>
    </html>
  );
}
