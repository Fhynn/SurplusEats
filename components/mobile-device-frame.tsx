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
    <main className="flex min-h-screen items-center justify-center bg-gray-200 p-0 md:p-6">
      <div
        className={`relative flex h-screen w-full flex-col overflow-hidden border-0 md:h-[850px] md:w-[400px] md:rounded-[40px] md:border-8 md:border-gray-900 md:shadow-2xl ${backgroundClassName}`}
      >
        {children}
      </div>
    </main>
  );
}
