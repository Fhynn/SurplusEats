import { Suspense, type ReactNode } from "react";

import { OwnerShell } from "@/components/owner-shell";

export default function OwnerLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <OwnerShell>{children}</OwnerShell>
    </Suspense>
  );
}
