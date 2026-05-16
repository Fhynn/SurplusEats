"use client";

import { useEffect, useState } from "react";
import { Clock3, Mail, ShieldCheck, UserRound } from "lucide-react";

type AdminUser = {
  name: string;
  email: string;
  role: string;
};

type AdminLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  admin?: {
    name: string;
    email: string;
  } | null;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminSettingsPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      setIsLoading(true);

      try {
        const [meResponse, logsResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/admin/logs", { cache: "no-store" }),
        ]);
        const meData = (await meResponse.json()) as {
          ok: boolean;
          user?: AdminUser;
          message?: string;
        };
        const logsData = (await logsResponse.json()) as {
          ok: boolean;
          logs?: AdminLog[];
          message?: string;
        };

        if (!meResponse.ok || !meData.ok || !meData.user) {
          throw new Error(meData.message || "Admin gagal dimuat.");
        }

        if (!logsResponse.ok || !logsData.ok) {
          throw new Error(logsData.message || "Log admin gagal dimuat.");
        }

        if (!ignore) {
          setAdmin(meData.user);
          setLogs(logsData.logs ?? []);
          setNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setNotice(
            error instanceof Error ? error.message : "Pengaturan gagal dimuat.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
          Admin Settings
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
          Pengaturan Admin
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Profil dan audit log mengikuti aktivitas admin terbaru.
        </p>
      </header>

      {notice ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
          Memuat pengaturan...
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <UserRound size={24} className="mb-4 text-emerald-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Nama Admin
              </p>
              <p className="mt-2 text-xl font-extrabold text-gray-950">
                {admin?.name || "-"}
              </p>
            </div>
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <Mail size={24} className="mb-4 text-blue-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Email
              </p>
              <p className="mt-2 text-sm font-extrabold text-gray-950">
                {admin?.email || "-"}
              </p>
            </div>
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <ShieldCheck size={24} className="mb-4 text-amber-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Role
              </p>
              <p className="mt-2 text-xl font-extrabold text-gray-950">
                {admin?.role || "-"}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
              <Clock3 size={20} className="text-emerald-600" />
              Audit Log
            </h2>
            {logs.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                Belum ada aksi admin yang tercatat.
              </p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <article key={log.id} className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-extrabold text-gray-950">
                          {log.action}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-400">
                          {log.targetType} {log.targetId || ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-gray-400">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
