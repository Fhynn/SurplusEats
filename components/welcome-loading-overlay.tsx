"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

type WelcomeLoadingOverlayProps = {
  title: string;
  description: string;
  scope?: "page" | "frame";
};

export function WelcomeLoadingOverlay({
  title,
  description,
  scope = "page",
}: WelcomeLoadingOverlayProps) {
  const isFrame = scope === "frame";
  const lottieClassName = isFrame ? "h-48 w-48" : "h-72 w-72 max-w-[88vw]";
  const titleClassName = isFrame
    ? "mt-1 text-2xl font-extrabold tracking-tight text-gray-950"
    : "mt-2 text-3xl font-extrabold tracking-tight text-gray-950";
  const descriptionClassName = isFrame
    ? "mt-2 max-w-[270px] text-xs leading-5 font-semibold text-gray-500"
    : "mt-3 max-w-xs text-sm leading-6 font-semibold text-gray-500";

  return (
    <div className="modal-backdrop-in absolute inset-0 z-[120] flex min-h-full flex-col overflow-hidden bg-white text-center">
      <div className="absolute inset-x-0 top-0 h-56 bg-emerald-50" />
      <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl" />
      <div className="absolute right-[-80px] bottom-[-80px] h-64 w-64 rounded-full bg-amber-100/70 blur-3xl" />

      <div className="relative z-10 flex min-h-full flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="sheet-in flex w-full max-w-md flex-col items-center">
          <div className={lottieClassName}>
            <DotLottieReact
              className="h-full w-full"
              src="https://lottie.host/9dfe0fe8-f36a-47a5-99b2-2798c262ff86/d6LrBCtcza.lottie"
              loop
              autoplay
            />
          </div>
          <h2 className={titleClassName}>{title}</h2>
          <p className={descriptionClassName}>{description}</p>
          <div className="mt-7 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-200ms]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-100ms]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
