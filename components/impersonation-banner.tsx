"use client";

import { ShieldAlert, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ImpersonationState = {
  active: boolean;
  adminName: string;
  adminEmail: string | null;
  expiresAt: string;
};

type MeResponse = {
  ok: boolean;
  user?: {
    impersonation?: ImpersonationState | null;
  } | null;
};

export function ImpersonationBanner() {
  const router = useRouter();
  const [impersonation, setImpersonation] =
    useState<ImpersonationState | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json() as Promise<MeResponse>)
      .then((data) => {
        if (isMounted && data.ok && data.user?.impersonation?.active) {
          setImpersonation(data.user.impersonation);
        }
      })
      .catch(() => {
        if (isMounted) {
          setImpersonation(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stopImpersonation = async () => {
    setIsStopping(true);

    try {
      const response = await fetch("/api/auth/stop-impersonation", {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok: boolean;
        redirectTo?: string;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Gagal kembali ke admin.");
      }

      router.push(data.redirectTo || "/admin/dashboard");
      router.refresh();
    } catch {
      setIsStopping(false);
    }
  };

  if (!impersonation) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 top-3 z-[80] mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-lg shadow-amber-900/10">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ShieldAlert size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">
            Mode impersonasi aktif oleh {impersonation.adminName}
          </p>
          <p className="truncate text-xs font-semibold text-amber-700">
            {impersonation.adminEmail || "Admin"} dapat kembali kapan saja.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={stopImpersonation}
        disabled={isStopping}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-900 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-amber-300"
      >
        <XCircle size={15} />
        {isStopping ? "Kembali..." : "Stop"}
      </button>
    </div>
  );
}
