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
        className={`relative flex h-screen min-h-0 w-full flex-col overflow-x-hidden overflow-y-auto border-0 [scrollbar-width:none] md:h-[850px] md:w-[400px] md:rounded-[40px] md:border-8 md:border-gray-900 md:shadow-2xl [&::-webkit-scrollbar]:hidden ${backgroundClassName}`}
      >
        {children}
      </div>
    </main>
  );
}
