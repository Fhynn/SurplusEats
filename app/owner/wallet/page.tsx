"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Clock3,
  Send,
  Store,
  Wallet,
  WalletCards,
} from "lucide-react";

type WalletTransaction = {
  id: string;
  type: string;
  status: string;
  amount: number;
  reference: string | null;
  description: string | null;
  createdAt: string;
};

type WalletResponse = {
  ok: boolean;
  message?: string;
  restaurant: { id: string; name: string } | null;
  balance: number;
  pending: number;
  pendingIncome: number;
  pendingPayout: number;
  transactions: WalletTransaction[];
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OwnerWalletPage() {
  const [data, setData] = useState<WalletResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDestination, setPayoutDestination] = useState("");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const loadWallet = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/owner/wallet", { cache: "no-store" });
      const result = (await response.json()) as WalletResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Wallet gagal dimuat.");
      }

      setData(result);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet gagal dimuat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const transactions = useMemo(() => data?.transactions ?? [], [data]);
  const payoutAmountValue = Number(payoutAmount);
  const canSubmitPayout =
    Boolean(data?.restaurant) &&
    Number.isFinite(payoutAmountValue) &&
    payoutAmountValue >= 10_000 &&
    payoutAmountValue <= (data?.balance ?? 0) &&
    payoutDestination.trim().length >= 8 &&
    !isSubmittingPayout;

  const handleRequestPayout = async () => {
    if (!canSubmitPayout) {
      return;
    }

    setIsSubmittingPayout(true);
    setNotice(null);
    setSuccessNotice(null);

    try {
      const response = await fetch("/api/owner/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: payoutAmountValue,
          destination: payoutDestination.trim(),
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Request pencairan gagal.");
      }

      setPayoutAmount("");
      setPayoutDestination("");
      setSuccessNotice("Request pencairan berhasil dikirim ke admin.");
      await loadWallet();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Request pencairan gagal.",
      );
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
          Owner Wallet
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
          Saldo Restoran
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Semua nominal mengikuti transaksi wallet terbaru.
        </p>
      </header>

      {notice ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {notice}
        </div>
      ) : null}
      {successNotice ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {successNotice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
          Memuat wallet...
        </div>
      ) : data?.restaurant ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <Wallet size={24} className="mb-4 text-emerald-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Saldo Tersedia
              </p>
              <p className="mt-2 text-3xl font-extrabold text-gray-950">
                {formatRp(data.balance)}
              </p>
            </div>
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <Clock3 size={24} className="mb-4 text-amber-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Income Pending
              </p>
              <p className="mt-2 text-3xl font-extrabold text-gray-950">
                {formatRp(data.pendingIncome ?? data.pending)}
              </p>
            </div>
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <Banknote size={24} className="mb-4 text-red-500" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Pencairan Pending
              </p>
              <p className="mt-2 text-3xl font-extrabold text-gray-950">
                {formatRp(data.pendingPayout ?? 0)}
              </p>
            </div>
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <Store size={24} className="mb-4 text-blue-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Restoran
              </p>
              <p className="mt-2 text-xl font-extrabold text-gray-950">
                {data.restaurant.name}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Send size={20} className="text-emerald-600" />
              <h2 className="text-lg font-extrabold text-gray-950">
                Request Pencairan
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Nominal
                </span>
                <input
                  type="number"
                  min={10000}
                  max={data.balance}
                  value={payoutAmount}
                  onChange={(event) => setPayoutAmount(event.target.value)}
                  placeholder="100000"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-extrabold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Tujuan Pencairan
                </span>
                <input
                  value={payoutDestination}
                  onChange={(event) => setPayoutDestination(event.target.value)}
                  placeholder="BCA 1234567890 a.n. Nama Pemilik"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleRequestPayout()}
                disabled={!canSubmitPayout}
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300 lg:mt-6"
              >
                <Send size={17} />
                {isSubmittingPayout ? "Mengirim..." : "Ajukan"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 font-bold text-gray-400">
              Minimum pencairan {formatRp(10_000)} dan maksimal mengikuti saldo
              tersedia setelah dikurangi pencairan pending.
            </p>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
              <WalletCards size={20} className="text-emerald-600" />
              Riwayat Transaksi
            </h2>
            {transactions.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                Belum ada transaksi wallet. Transaksi akan muncul setelah order
                dan pencairan tercatat.
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <article
                    key={transaction.id}
                    className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-gray-950">
                        {transaction.description || transaction.type}
                      </p>
                      <p className="mt-1 break-words text-xs font-bold text-gray-400">
                        {transaction.reference || "-"} - {formatTime(transaction.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p
                        className={`text-sm font-extrabold ${
                          transaction.amount < 0
                            ? "text-red-600"
                            : "text-gray-950"
                        }`}
                      >
                        {transaction.amount < 0
                          ? `- ${formatRp(Math.abs(transaction.amount))}`
                          : formatRp(transaction.amount)}
                      </p>
                      <p className="mt-1 text-xs font-extrabold text-gray-400">
                        {transaction.status}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-950">
            Restoran belum aktif
          </h2>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Wallet akan tersedia setelah pendaftaran mitra disetujui admin.
          </p>
        </div>
      )}
    </div>
  );
}
