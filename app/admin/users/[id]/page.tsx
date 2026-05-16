"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

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
      };

      if (!response.ok || !data.ok || !data.user) {
        throw new Error(data.message || "User tidak ditemukan.");
      }

      setUser(data.user);
      setActivities(data.activities ?? []);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "User gagal dimuat.");
      setUser(null);
      setActivities([]);
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
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
          Memuat data user dari database...
        </div>
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
                  Aktivitas Database
                </h2>
              </div>

              {activities.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                  Belum ada order atau aktivitas yang tersimpan untuk akun ini.
                </p>
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
        </>
      ) : null}
    </div>
  );
}
