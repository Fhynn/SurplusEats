"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BadgeCheck,
  Building2,
  Clock3,
  CreditCard,
  Send,
  Store,
  Wallet,
  WalletCards,
} from "lucide-react";

import { InlineNotice, StateCard } from "@/components/ui-state";

type WalletTransaction = {
  id: string;
  type: string;
  status: string;
  amount: number;
  grossAmount: number | null;
  platformFee: number | null;
  netAmount: number | null;
  reference: string | null;
  payoutBatchReference: string | null;
  transferReference: string | null;
  transferProofUrl: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankValidationStatus: string | null;
  payoutFee: number | null;
  payoutNetAmount: number | null;
  description: string | null;
  createdAt: string;
};

type WalletResponse = {
  ok: boolean;
  message?: string;
  restaurant: {
    id: string;
    name: string;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    bankVerifiedAt: string | null;
  } | null;
  balance: number;
  pending: number;
  pendingIncome: number;
  pendingPayout: number;
  payoutFee: number;
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskAccountNumber(value: string | null) {
  const normalizedValue = onlyDigits(value ?? "");

  if (normalizedValue.length <= 4) {
    return normalizedValue || "-";
  }

  return `${"*".repeat(Math.max(0, normalizedValue.length - 4))}${normalizedValue.slice(-4)}`;
}

export default function OwnerWalletPage() {
  const [data, setData] = useState<WalletResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
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
      if (result.restaurant) {
        setBankName((currentValue) => currentValue || result.restaurant?.bankName || "");
        setAccountNumber((currentValue) =>
          currentValue || result.restaurant?.bankAccountNumber || "",
        );
        setAccountHolder((currentValue) =>
          currentValue || result.restaurant?.bankAccountHolder || "",
        );
      }
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
  const payoutFee = data?.payoutFee ?? 0;
  const payoutNetAmount = Math.max(0, payoutAmountValue - payoutFee);
  const normalizedAccountNumber = onlyDigits(accountNumber);
  const bankValidationMessage =
    !bankName.trim()
      ? "Nama bank wajib diisi."
      : normalizedAccountNumber.length < 8
        ? "Nomor rekening minimal 8 digit."
        : accountHolder.trim().length < 3
          ? "Nama pemilik rekening minimal 3 karakter."
          : null;
  const canSubmitPayout =
    Boolean(data?.restaurant) &&
    Number.isFinite(payoutAmountValue) &&
    payoutAmountValue >= 10_000 &&
    payoutAmountValue > payoutFee &&
    payoutAmountValue <= (data?.balance ?? 0) &&
    !bankValidationMessage &&
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
          bankName: bankName.trim(),
          accountNumber: normalizedAccountNumber,
          accountHolder: accountHolder.trim(),
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
        <InlineNotice variant="error" description={notice} />
      ) : null}
      {successNotice ? (
        <InlineNotice variant="success" description={successNotice} />
      ) : null}

      {isLoading ? (
        <StateCard
          title="Memuat wallet"
          description="Mengambil saldo, rekening, dan riwayat transaksi."
          variant="loading"
        />
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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Rekening Payout
                  </h2>
                  <p className="mt-1 text-sm font-bold text-gray-500">
                    {data.restaurant.bankName
                      ? `${data.restaurant.bankName} ${maskAccountNumber(
                          data.restaurant.bankAccountNumber,
                        )} a.n. ${data.restaurant.bankAccountHolder || "-"}`
                      : "Belum ada rekening tersimpan."}
                  </p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700">
                <BadgeCheck size={14} />
                {data.restaurant.bankVerifiedAt ? "Tervalidasi" : "Belum validasi"}
              </span>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Send size={20} className="text-emerald-600" />
              <h2 className="text-lg font-extrabold text-gray-950">
                Request Pencairan
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
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
                  Bank
                </span>
                <input
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder="BCA / Mandiri / BRI"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Nomor Rekening
                </span>
                <input
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(event) =>
                    setAccountNumber(onlyDigits(event.target.value))
                  }
                  placeholder="1234567890"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Nama Pemilik Rekening
                </span>
                <input
                  value={accountHolder}
                  onChange={(event) => setAccountHolder(event.target.value)}
                  placeholder="Nama sesuai rekening"
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <button
                type="button"
                onClick={() => void handleRequestPayout()}
                disabled={!canSubmitPayout}
                className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-2xl bg-gray-950 px-5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Send size={17} />
                {isSubmittingPayout ? "Mengirim..." : "Ajukan"}
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-xs font-bold text-gray-500 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-gray-400">
                  <Banknote size={14} />
                  Fee Payout
                </p>
                <p className="text-sm font-extrabold text-gray-950">
                  {formatRp(payoutFee)}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-gray-400">
                  <CreditCard size={14} />
                  Estimasi Transfer
                </p>
                <p className="text-sm font-extrabold text-emerald-600">
                  {formatRp(payoutNetAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-emerald-500">
                  <BadgeCheck size={14} />
                  Validasi Rekening
                </p>
                <p className="text-sm font-extrabold text-emerald-800">
                  {bankValidationMessage ?? "Siap diajukan"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 font-bold text-gray-400">
              Minimum pencairan {formatRp(10_000)}. Nomor rekening disimpan
              untuk payout berikutnya dan ditampilkan sebagai rekening tervalidasi.
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
                      {transaction.type === "PAYOUT" ? (
                        <div className="mt-3 grid gap-2 text-xs font-bold text-gray-500 sm:grid-cols-2">
                          <span className="rounded-xl bg-white px-3 py-2">
                            Rekening: {transaction.bankName || "-"}{" "}
                            {maskAccountNumber(transaction.bankAccountNumber)}
                          </span>
                          <span className="rounded-xl bg-white px-3 py-2">
                            Transfer bersih:{" "}
                            {formatRp(transaction.payoutNetAmount ?? 0)}
                          </span>
                          {transaction.payoutBatchReference ? (
                            <span className="rounded-xl bg-white px-3 py-2">
                              Batch: {transaction.payoutBatchReference}
                            </span>
                          ) : null}
                          {transaction.transferReference ? (
                            <span className="rounded-xl bg-white px-3 py-2">
                              Ref transfer: {transaction.transferReference}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {transaction.type === "ORDER_INCOME" ? (
                        <div className="mt-3 grid gap-2 text-xs font-bold text-gray-500 sm:grid-cols-3">
                          <span className="rounded-xl bg-white px-3 py-2">
                            Gross: {formatRp(transaction.grossAmount ?? transaction.amount)}
                          </span>
                          <span className="rounded-xl bg-white px-3 py-2">
                            Komisi: {formatRp(transaction.platformFee ?? 0)}
                          </span>
                          <span className="rounded-xl bg-white px-3 py-2">
                            Net: {formatRp(transaction.netAmount ?? transaction.amount)}
                          </span>
                        </div>
                      ) : null}
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
        <StateCard
          title="Restoran belum aktif"
          description="Wallet akan tersedia setelah pendaftaran mitra disetujui admin."
          variant="empty"
        />
      )}
    </div>
  );
}
