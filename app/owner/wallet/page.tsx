"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Store, Wallet, WalletCards } from "lucide-react";

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

  useEffect(() => {
    let ignore = false;

    async function loadWallet() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/owner/wallet", { cache: "no-store" });
        const result = (await response.json()) as WalletResponse;

        if (!response.ok || !result.ok) {
          throw new Error(result.message || "Wallet gagal dimuat.");
        }

        if (!ignore) {
          setData(result);
          setNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setNotice(error instanceof Error ? error.message : "Wallet gagal dimuat.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadWallet();

    return () => {
      ignore = true;
    };
  }, []);

  const transactions = useMemo(() => data?.transactions ?? [], [data]);

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

      {isLoading ? (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
          Memuat wallet...
        </div>
      ) : data?.restaurant ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
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
                Pending
              </p>
              <p className="mt-2 text-3xl font-extrabold text-gray-950">
                {formatRp(data.pending)}
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
                      <p className="text-sm font-extrabold text-gray-950">
                        {formatRp(transaction.amount)}
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
