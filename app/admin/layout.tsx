import { type ReactNode, Suspense } from "react";

import { AdminShell } from "@/components/admin-shell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
