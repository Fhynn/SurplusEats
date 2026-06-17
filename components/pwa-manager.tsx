"use client";

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const installDismissedKey = "resqfood:pwa-install-dismissed-at";
const installDismissDays = 14;

function isStandaloneDisplay() {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getDismissedUntil() {
  const rawValue = window.localStorage.getItem(installDismissedKey);
  const dismissedAt = rawValue ? Number(rawValue) : 0;

  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) {
    return 0;
  }

  return dismissedAt + installDismissDays * 24 * 60 * 60 * 1000;
}

export function PwaManager() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("ResQFood service worker registration failed", error);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      if (isStandaloneDisplay() || Date.now() < getDismissedUntil()) {
        return;
      }

      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsVisible(false);
      window.localStorage.removeItem(installDismissedKey);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismissPrompt = useCallback(() => {
    window.localStorage.setItem(installDismissedKey, String(Date.now()));
    setIsVisible(false);
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) {
      setIsVisible(false);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "dismissed") {
      window.localStorage.setItem(installDismissedKey, String(Date.now()));
    }

    setInstallPrompt(null);
    setIsVisible(false);
  }, [installPrompt]);

  if (!isVisible || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[80] w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-emerald-100 bg-white p-4 shadow-[0_20px_70px_rgba(15,23,42,0.18)] md:right-6 md:bottom-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Download size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-gray-950">Install ResQFood</p>
          <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
            Buka lebih cepat dari layar utama perangkat.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void installApp()}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismissPrompt}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gray-100 px-4 py-2 text-xs font-extrabold text-gray-600 transition-colors hover:bg-gray-200"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          aria-label="Tutup prompt install"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
