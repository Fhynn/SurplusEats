"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

type LoadingScreenProps = {
  title?: string;
  description?: string;
  scope?: "page" | "frame";
};

export function LoadingScreen({
  title = "Memuat...",
  description = "Sebentar, SurplusEats sedang menyiapkan halaman.",
  scope = "page",
}: LoadingScreenProps) {
  const isFrame = scope === "frame";
  const rootClassName = isFrame
    ? "modal-backdrop-in absolute inset-0 z-[130] flex min-h-full items-center justify-center overflow-hidden bg-white px-5 text-center"
    : "modal-backdrop-in fixed inset-0 z-[130] flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 text-center";
  const topGlowClassName = isFrame
    ? "absolute inset-x-0 top-0 h-40 bg-emerald-50"
    : "absolute inset-x-0 top-0 h-64 bg-emerald-50";
  const centerGlowClassName = isFrame
    ? "absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl"
    : "absolute -top-16 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl";
  const bottomGlowClassName = isFrame
    ? "absolute right-[-64px] bottom-[-64px] h-44 w-44 rounded-full bg-lime-100/80 blur-3xl"
    : "absolute right-[-72px] bottom-[-72px] h-56 w-56 rounded-full bg-lime-100/80 blur-3xl";
  const lottieClassName = isFrame ? "h-44 w-44" : "h-64 w-64 max-w-[84vw]";
  const titleClassName = isFrame
    ? "mt-1 text-xl font-extrabold tracking-tight text-gray-950"
    : "mt-2 text-2xl font-extrabold tracking-tight text-gray-950";
  const descriptionClassName = isFrame
    ? "mt-2 max-w-[260px] text-xs leading-5 font-semibold text-gray-500"
    : "mt-3 max-w-xs text-sm leading-6 font-semibold text-gray-500";

  return (
    <div className={rootClassName}>
      <div className={topGlowClassName} />
      <div className={centerGlowClassName} />
      <div className={bottomGlowClassName} />

      <div className="sheet-in relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className={lottieClassName}>
          <DotLottieReact
            className="h-full w-full"
            src="https://lottie.host/d03f4dd3-8e19-43fb-8df8-313128b905af/ciyiFBwxLd.lottie"
            loop
            autoplay
          />
        </div>
        <h2 className={titleClassName}>{title}</h2>
        <p className={descriptionClassName}>{description}</p>
      </div>
    </div>
  );
}
