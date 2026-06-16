"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Phone,
  RefreshCw,
  ShieldCheck,
  Store,
  UserCog,
  UserRound,
} from "lucide-react";

import { InlineNotice, StateCard } from "@/components/ui-state";

type AccountActivity = {
  id: string;
  title: string;
  description: string;
  time: string;
  tone: "emerald" | "blue" | "amber" | "red" | "gray";
};

type AdminUserDetail = {
  id: string;
  joinedAt: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: "customer" | "owner";
  status: "active" | "banned";
  banReason?: string;
  lastLogin: string;
  verification: string;
  accountHealth: string;
  totalOrders: number;
  totalSpent: number;
  totalSpentLabel: string;
  refundRequests: number;
  pickupRate: number;
  riskScore: number;
  linkedStore?: string;
};

type AdminUserSession = {
  id: string;
  kind: string;
  deviceLabel: string;
  ipAddress: string;
  userAgent: string;
  startedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokeReason?: string | null;
  impersonatedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  revokedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

const toneClassName: Record<AccountActivity["tone"], string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  gray: "bg-gray-100 text-gray-500",
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [activities, setActivities] = useState<AccountActivity[]>([]);
  const [sessions, setSessions] = useState<AdminUserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const loadUser = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        user?: AdminUserDetail;
        activities?: AccountActivity[];
        sessions?: AdminUserSession[];
      };

      if (!response.ok || !data.ok || !data.user) {
        throw new Error(data.message || "User tidak ditemukan.");
      }

      setUser(data.user);
      setActivities(data.activities ?? []);
      setSessions(data.sessions ?? []);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "User gagal dimuat.");
      setUser(null);
      setActivities([]);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const updateStatus = async (status: "ACTIVE" | "SUSPENDED") => {
    const response = await fetch(`/api/admin/users/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await response.json()) as { ok: boolean; message?: string };

    if (!response.ok || !data.ok) {
      setNotice(data.message || "Status user gagal diperbarui.");
      return;
    }

    await loadUser();
  };

  const resetPassword = async () => {
    setIsResettingPassword(true);
    setResetResult(null);

    try {
      const response = await fetch(
        `/api/admin/users/${params.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: newPassword.trim() || undefined,
            revokeSessions,
          }),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        temporaryPassword?: string;
        message?: string;
      };

      if (!response.ok || !data.ok || !data.temporaryPassword) {
        throw new Error(data.message || "Reset password gagal.");
      }

      setResetResult(data.temporaryPassword);
      setNewPassword("");
      setNotice("Password user berhasil direset.");
      await loadUser();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Reset password gagal.",
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const copyResetPassword = async () => {
    if (!resetResult) {
      return;
    }

    await navigator.clipboard.writeText(resetResult);
    setNotice("Password baru disalin.");
  };

  const startImpersonation = async () => {
    setIsImpersonating(true);

    try {
      const response = await fetch(`/api/admin/users/${params.id}/impersonate`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok: boolean;
        redirectTo?: string;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Impersonation gagal.");
      }

      window.location.href = data.redirectTo || "/home";
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Impersonation gagal.",
      );
      setIsImpersonating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/dashboard?tab=users"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
              User Audit
            </p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-gray-950">
              {user?.name || (isLoading ? "Memuat user..." : "User tidak ditemukan")}
            </h1>
          </div>
        </div>

        {user ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startImpersonation}
              disabled={user.status === "banned" || isImpersonating}
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-gray-800 disabled:bg-gray-300"
            >
              <UserCog size={17} />
              {isImpersonating ? "Masuk..." : "Impersonate"}
            </button>
            <button
              type="button"
              onClick={() => updateStatus("ACTIVE")}
              disabled={user.status === "active"}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
            >
              <CheckCircle2 size={17} />
              Aktifkan
            </button>
            <button
              type="button"
              onClick={() => updateStatus("SUSPENDED")}
              disabled={user.status === "banned"}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
            >
              <Ban size={17} />
              Bekukan
            </button>
          </div>
        ) : null}
      </header>

      {notice ? (
        <InlineNotice variant="error" description={notice} />
      ) : null}

      {isLoading ? (
        <StateCard
          title="Memuat data user"
          description="Mengambil profil, aktivitas, dan session akun."
          variant="loading"
        />
      ) : user ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total Order", value: user.totalOrders },
              { label: "Total Nilai", value: user.totalSpentLabel },
              { label: "Refund", value: user.refundRequests },
              { label: "Pickup Rate", value: `${user.pickupRate}%` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-extrabold text-gray-950">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  {user.role === "owner" ? <Store size={24} /> : <UserRound size={24} />}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950">
                    {user.name}
                  </h2>
                  <p className="text-sm font-bold capitalize text-gray-500">
                    {user.role} - {user.status}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm font-semibold text-gray-600">
                <p className="flex items-center gap-2">
                  <Mail size={17} className="text-gray-400" />
                  {user.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={17} className="text-gray-400" />
                  {user.phone}
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-gray-400" />
                  {user.verification}
                </p>
                {user.linkedStore ? (
                  <p className="flex items-center gap-2">
                    <Store size={17} className="text-gray-400" />
                    {user.linkedStore}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Activity size={20} className="text-emerald-600" />
                <h2 className="text-lg font-extrabold text-gray-950">
                  Aktivitas Akun
                </h2>
              </div>

              {activities.length === 0 ? (
                <StateCard
                  title="Belum ada aktivitas"
                  description="Belum ada order atau aktivitas yang tersimpan untuk akun ini."
                  variant="empty"
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <article
                      key={activity.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-extrabold text-gray-950">
                          {activity.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${toneClassName[activity.tone]}`}
                        >
                          {activity.time}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        {activity.description}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <KeyRound size={20} className="text-emerald-600" />
                <h2 className="text-lg font-extrabold text-gray-950">
                  Reset Password
                </h2>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                    Password baru opsional
                  </span>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Kosongkan untuk generate otomatis"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>

                <label className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={revokeSessions}
                    onChange={(event) =>
                      setRevokeSessions(event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600"
                  />
                  Cabut semua session aktif setelah reset
                </label>

                <button
                  type="button"
                  onClick={resetPassword}
                  disabled={isResettingPassword}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-300"
                >
                  <RefreshCw
                    size={17}
                    className={isResettingPassword ? "animate-spin" : undefined}
                  />
                  {isResettingPassword ? "Mereset..." : "Reset Password"}
                </button>

                {resetResult ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-extrabold tracking-wider text-emerald-700 uppercase">
                      Password baru
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-gray-950">
                        {resetResult}
                      </code>
                      <button
                        type="button"
                        onClick={copyResetPassword}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
                        aria-label="Salin password baru"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MonitorSmartphone size={20} className="text-emerald-600" />
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Device & Session
                  </h2>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-500">
                  {sessions.length} sesi
                </span>
              </div>

              {sessions.length === 0 ? (
                <StateCard
                  title="Belum ada session"
                  description="Belum ada session baru yang tercatat setelah fitur ini aktif."
                  variant="empty"
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {sessions.map((sessionItem) => (
                    <article
                      key={sessionItem.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-gray-950">
                              {sessionItem.deviceLabel}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                sessionItem.revokedAt
                                  ? "bg-red-100 text-red-600"
                                  : sessionItem.kind === "IMPERSONATION"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {sessionItem.revokedAt
                                ? "Revoked"
                                : sessionItem.kind}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            IP {sessionItem.ipAddress} - terakhir{" "}
                            {sessionItem.lastSeenAt}
                          </p>
                          {sessionItem.impersonatedBy ? (
                            <p className="mt-2 text-xs font-bold text-amber-700">
                              Impersonated by {sessionItem.impersonatedBy.name}
                            </p>
                          ) : null}
                          {sessionItem.revokedAt ? (
                            <p className="mt-2 text-xs font-bold text-red-600">
                              Dicabut {sessionItem.revokedAt}
                              {sessionItem.revokeReason
                                ? ` - ${sessionItem.revokeReason}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-right text-[11px] font-bold text-gray-500">
                          <p>Mulai {sessionItem.startedAt}</p>
                          <p>Expired {sessionItem.expiresAt}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <StateCard
          title="User tidak ditemukan"
          description="Data user tidak tersedia atau sudah dihapus."
          variant="empty"
          action={{
            label: "Kembali ke Dashboard",
            href: "/admin/dashboard?tab=users",
          }}
        />
      )}
    </div>
  );
}
