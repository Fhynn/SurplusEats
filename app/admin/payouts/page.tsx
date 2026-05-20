"use client";

import {
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Store,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PayoutStatus = "PENDING" | "COMPLETED" | "FAILED";

type AdminPayout = {
  id: string;
  amount: number;
  rawAmount: number;
  status: PayoutStatus;
  reference: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: string;
    name: string;
    city: string;
    owner: {
      id: string;
      name: string;
      email: string;
    };
  };
};

type PayoutMetrics = {
  total: number;
  pending: number;
  completed: number;
  rejected: number;
  pendingAmount: number;
  completedAmount: number;
};

type PayoutResponse = {
  ok: boolean;
  message?: string;
  metrics: PayoutMetrics;
  payouts: AdminPayout[];
};

const emptyMetrics: PayoutMetrics = {
  total: 0,
  pending: 0,
  completed: 0,
  rejected: 0,
  pendingAmount: 0,
  completedAmount: 0,
};

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusBadge(status: PayoutStatus) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
        <CheckCircle2 size={13} />
        Disetujui
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
        <XCircle size={13} />
        Ditolak
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
      <Clock3 size={13} />
      Menunggu
    </span>
  );
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [metrics, setMetrics] = useState<PayoutMetrics>(emptyMetrics);
  const [selectedPayout, setSelectedPayout] = useState<AdminPayout | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const pendingPayouts = useMemo(
    () => payouts.filter((payout) => payout.status === "PENDING"),
    [payouts],
  );

  const loadPayouts = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/payouts", { cache: "no-store" });
      const data = (await response.json()) as PayoutResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Payout gagal dimuat.");
      }

      setPayouts(data.payouts ?? []);
      setMetrics(data.metrics ?? emptyMetrics);
      setNotice(null);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Payout gagal dimuat.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const updatePayout = async (action: "APPROVE" | "REJECT") => {
    if (!selectedPayout || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/payouts/${selectedPayout.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Payout gagal diperbarui.");
      }

      setSelectedPayout(null);
      setAdminNote("");
      setNotice({
        type: "success",
        message:
          action === "APPROVE"
            ? "Pencairan berhasil disetujui."
            : "Pencairan berhasil ditolak.",
      });
      await loadPayouts();
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "Payout gagal diperbarui.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
              Payout Review
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
              Review Pencairan Mitra
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500">
              Semua request pencairan berasal dari transaksi wallet mitra dan
              diproses langsung ke status wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadPayouts()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>
      </header>

      {notice ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            notice.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[26px] border border-amber-100 bg-amber-50 p-5">
          <Clock3 size={22} className="mb-4 text-amber-700" />
          <p className="text-xs font-extrabold tracking-wider text-amber-700 uppercase">
            Pending
          </p>
          <p className="mt-2 text-2xl font-extrabold text-amber-950">
            {metrics.pending}
          </p>
        </div>
        <div className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
          <WalletCards size={22} className="mb-4 text-gray-700" />
          <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
            Nominal Pending
          </p>
          <p className="mt-2 text-2xl font-extrabold text-gray-950">
            {formatRp(metrics.pendingAmount)}
          </p>
        </div>
        <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-5">
          <CheckCircle2 size={22} className="mb-4 text-emerald-700" />
          <p className="text-xs font-extrabold tracking-wider text-emerald-700 uppercase">
            Disetujui
          </p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-950">
            {metrics.completed}
          </p>
        </div>
        <div className="rounded-[26px] border border-red-100 bg-red-50 p-5">
          <XCircle size={22} className="mb-4 text-red-700" />
          <p className="text-xs font-extrabold tracking-wider text-red-700 uppercase">
            Ditolak
          </p>
          <p className="mt-2 text-2xl font-extrabold text-red-950">
            {metrics.rejected}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-950">
                Request Pencairan
              </h2>
              <p className="mt-1 text-xs font-bold text-gray-400">
                {pendingPayouts.length} request masih menunggu keputusan.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Memuat payout...
            </div>
          ) : payouts.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Belum ada request pencairan.
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <article
                  key={payout.id}
                  className="rounded-[24px] border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {statusBadge(payout.status)}
                        <span className="rounded-full bg-gray-950 px-3 py-1 text-xs font-extrabold text-white">
                          {payout.reference || payout.id}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-gray-950">
                        {formatRp(payout.amount)}
                      </h3>
                      <p className="mt-1 max-w-2xl text-xs leading-5 font-medium text-gray-500">
                        {payout.description || "Tidak ada detail tujuan pencairan."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPayout(payout);
                        setAdminNote("");
                      }}
                      disabled={payout.status !== "PENDING"}
                      className="rounded-xl bg-gray-950 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Review
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs font-bold md:grid-cols-3">
                    <div className="rounded-2xl bg-white px-4 py-3 text-gray-500">
                      Restoran
                      <span className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-gray-950">
                        <Store size={14} />
                        {payout.restaurant.name}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-gray-500">
                      Owner
                      <span className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-gray-950">
                        <UserRound size={14} />
                        {payout.restaurant.owner.name}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-gray-500">
                      Diajukan
                      <span className="mt-1 block text-sm font-extrabold text-gray-950">
                        {formatTime(payout.createdAt)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-950">
            Keputusan Admin
          </h2>
          {selectedPayout ? (
            <div className="mt-5">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Request
                </p>
                <p className="mt-2 text-xl font-extrabold text-gray-950">
                  {formatRp(selectedPayout.amount)}
                </p>
                <p className="mt-1 text-xs font-bold text-gray-500">
                  {selectedPayout.restaurant.name} -{" "}
                  {selectedPayout.restaurant.owner.email}
                </p>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Catatan Admin
                </span>
                <textarea
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  rows={4}
                  placeholder="Contoh: Bukti transfer sudah diproses / rekening tidak valid."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void updatePayout("REJECT")}
                  disabled={isSubmitting}
                  className="rounded-2xl border border-red-100 bg-red-50 py-3.5 text-sm font-extrabold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  onClick={() => void updatePayout("APPROVE")}
                  disabled={isSubmitting}
                  className="rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Setujui
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-gray-50 p-5 text-sm font-bold leading-6 text-gray-500">
              Pilih request payout berstatus pending untuk memberi keputusan.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
