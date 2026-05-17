"use client";

import type { ReactNode } from "react";

interface MobileDeviceFrameProps {
  children: ReactNode;
  backgroundClassName?: string;
}

export function MobileDeviceFrame({
  children,
  backgroundClassName = "bg-white",
}: MobileDeviceFrameProps) {
  return (
    <main className={`min-h-dvh w-full overflow-x-hidden ${backgroundClassName}`}>
      <div
        className={`app-frame relative flex h-dvh min-h-dvh w-full max-w-full flex-col overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${backgroundClassName}`}
      >
        {children}
      </div>
    </main>
  );
}
