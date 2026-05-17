"use client";

import { LoadingScreen } from "@/components/loading-screen";
import { useRouteTransition } from "@/components/route-transition-provider";

import type { ReactNode } from "react";

interface MobileDeviceFrameProps {
  children: ReactNode;
  backgroundClassName?: string;
}

export function MobileDeviceFrame({
  children,
  backgroundClassName = "bg-white",
}: MobileDeviceFrameProps) {
  const { isRouteLoading } = useRouteTransition();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-200 p-0 md:p-6">
      <div
        className={`app-frame relative flex h-screen min-h-0 w-full flex-col overflow-x-hidden overflow-y-auto border-0 [scrollbar-width:none] md:h-[850px] md:w-[400px] md:rounded-[40px] md:border-8 md:border-gray-900 md:shadow-2xl [&::-webkit-scrollbar]:hidden ${backgroundClassName}`}
      >
        {children}
        {isRouteLoading ? (
          <LoadingScreen
            scope="frame"
            title="Memuat halaman..."
            description="Sebentar, SurplusEats sedang membuka halaman berikutnya."
          />
        ) : null}
      </div>
    </main>
  );
}
