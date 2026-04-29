import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { CustomerAppProvider } from "@/components/customer-app-provider";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "SurplusEats",
  description: "Customer experience for SurplusEats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.variable} antialiased`}>
        <CustomerAppProvider>{children}</CustomerAppProvider>
      </body>
    </html>
  );
}
