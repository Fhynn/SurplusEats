"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
  Save,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

const balance = 1250000;

const bankOptions = ["BCA", "BNI", "BRI", "Mandiri", "CIMB Niaga"] as const;

type BankAccount = {
  bank: (typeof bankOptions)[number];
  number: string;
  owner: string;
};

const transactions = [
  {
    id: "WD-99812",
    type: "withdraw",
    desc: "Penarikan ke BCA",
    amount: 500000,
    date: "22 Okt 2023, 10:00",
    status: "success",
  },
  {
    id: "SFM-99A2X",
    type: "income",
    desc: "Pendapatan Order (Alfhin)",
    amount: 45000,
    date: "21 Okt 2023, 19:30",
    status: "success",
  },
  {
    id: "SFM-88B1Y",
    type: "income",
    desc: "Pendapatan Order (Budi)",
    amount: 24000,
    date: "21 Okt 2023, 18:15",
    status: "success",
  },
  {
    id: "WD-88123",
    type: "withdraw",
    desc: "Penarikan ke BCA",
    amount: 1000000,
    date: "15 Okt 2023, 09:15",
    status: "pending",
  },
] as const;

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatAccountNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();

export default function OwnerWalletPage() {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccount, setBankAccount] = useState<BankAccount>({
    bank: "BCA",
    number: "1234567890",
    owner: "Bakehouse Bakery",
  });
  const [bankDraft, setBankDraft] = useState<BankAccount>(bankAccount);
  const [isBankSaved, setIsBankSaved] = useState(false);

  const withdrawAmountNumber = Number(withdrawAmount);
  const isWithdrawDisabled =
    !withdrawAmount || withdrawAmountNumber < 50000 || withdrawAmountNumber > balance;
  const isBankDraftInvalid =
    bankDraft.number.length < 8 || bankDraft.owner.trim().length < 3;

  const openBankModal = () => {
    setBankDraft(bankAccount);
    setIsBankSaved(false);
    setShowBankModal(true);
  };

  const handleWithdraw = () => {
    if (isWithdrawDisabled) {
      return;
    }

    alert("Permintaan pencairan dana berhasil dibuat! Dana akan masuk dalam 1x24 jam.");
    setShowWithdrawModal(false);
    setWithdrawAmount("");
  };

  const handleSaveBankAccount = () => {
    if (isBankDraftInvalid) {
      return;
    }

    setBankAccount({
      ...bankDraft,
      owner: bankDraft.owner.trim(),
    });
    setIsBankSaved(true);
  };

  return (
    <>
      {showWithdrawModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="relative border-b border-gray-100 bg-emerald-50/50 p-8 text-center">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-6 right-6 rounded-full bg-white p-2 text-gray-500 shadow-sm transition-colors hover:bg-gray-100"
                aria-label="Tutup modal tarik saldo"
              >
                <X size={20} />
              </button>

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 shadow-sm">
                <Landmark size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">
                Tarik Saldo
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Saldo tersedia:{" "}
                <span className="font-bold text-gray-900">{formatRp(balance)}</span>
              </p>
            </div>

            <div className="space-y-6 bg-white p-8">
              <div className="space-y-2">
                <label
                  htmlFor="withdraw-amount"
                  className="block text-sm font-bold text-gray-900"
                >
                  Nominal Penarikan
                </label>
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 text-lg font-extrabold text-gray-900">
                    Rp
                  </span>
                  <input
                    id="withdraw-amount"
                    type="text"
                    inputMode="numeric"
                    value={withdrawAmount}
                    onChange={(event) =>
                      setWithdrawAmount(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pr-4 pl-14 text-lg font-extrabold text-gray-900 shadow-sm transition-all outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
                <p className="text-[10px] font-medium text-gray-500">
                  *Minimal penarikan Rp 50.000. Biaya admin Rp 2.500/transaksi.
                </p>
              </div>

              <div className="space-y-2">
                <p className="block text-sm font-bold text-gray-900">
                  Tujuan Pencairan
                </p>
                <div className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]">
                  <div className="rounded-xl bg-blue-50 p-2.5">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {bankAccount.bank} - {bankAccount.number}
                    </p>
                    <p className="text-xs text-gray-500">A.n {bankAccount.owner}</p>
                  </div>
                  <div className="h-5 w-5 rounded-full border-[5px] border-emerald-500 bg-white" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 bg-gray-50 px-8 py-6">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawDisabled}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tarik Sekarang
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBankModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
            {isBankSaved ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={38} />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-950">
                  Rekening Diperbarui
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 font-medium text-gray-500">
                  Tujuan pencairan dana sekarang memakai rekening {bankAccount.bank}{" "}
                  atas nama {bankAccount.owner}.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankModal(false);
                      setShowWithdrawModal(true);
                    }}
                    className="rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-emerald-500"
                  >
                    Tarik Saldo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative border-b border-gray-100 bg-blue-50/50 p-8 text-center">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="absolute top-6 right-6 rounded-full bg-white p-2 text-gray-500 shadow-sm transition-colors hover:bg-gray-100"
                    aria-label="Tutup modal ganti rekening"
                  >
                    <X size={20} />
                  </button>

                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-200 bg-blue-100 shadow-sm">
                    <CreditCard size={28} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    Ganti Rekening Bank
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Pastikan nama pemilik rekening sama dengan data toko.
                  </p>
                </div>

                <div className="space-y-5 bg-white p-8">
                  <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex gap-3">
                      <ShieldCheck
                        size={20}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <p className="text-xs leading-5 font-semibold text-emerald-800">
                        Perubahan rekening akan dipakai untuk pencairan berikutnya.
                        Pencairan yang sudah diproses tidak berubah.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="bank-name"
                        className="block text-sm font-bold text-gray-900"
                      >
                        Bank
                      </label>
                      <select
                        id="bank-name"
                        value={bankDraft.bank}
                        onChange={(event) =>
                          setBankDraft((currentDraft) => ({
                            ...currentDraft,
                            bank: event.target.value as BankAccount["bank"],
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-extrabold text-gray-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                      >
                        {bankOptions.map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="account-number"
                        className="block text-sm font-bold text-gray-900"
                      >
                        Nomor Rekening
                      </label>
                      <input
                        id="account-number"
                        type="text"
                        inputMode="numeric"
                        value={formatAccountNumber(bankDraft.number)}
                        onChange={(event) =>
                          setBankDraft((currentDraft) => ({
                            ...currentDraft,
                            number: event.target.value.replace(/\D/g, ""),
                          }))
                        }
                        placeholder="1234 5678 90"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 font-mono text-sm font-extrabold tracking-widest text-gray-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="account-owner"
                      className="block text-sm font-bold text-gray-900"
                    >
                      Nama Pemilik Rekening
                    </label>
                    <input
                      id="account-owner"
                      type="text"
                      value={bankDraft.owner}
                      onChange={(event) =>
                        setBankDraft((currentDraft) => ({
                          ...currentDraft,
                          owner: event.target.value,
                        }))
                      }
                      placeholder="Bakehouse Bakery"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-extrabold text-gray-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-gray-100 bg-gray-50 px-8 py-6">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:bg-gray-100"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBankAccount}
                    disabled={isBankDraftInvalid}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={17} />
                    Simpan Rekening
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl space-y-6 text-gray-900">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="relative flex flex-col justify-between overflow-hidden rounded-[32px] border border-gray-800 bg-gray-900 p-8 shadow-xl lg:col-span-2">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500 opacity-20 blur-3xl" />

            <div className="relative z-10 mb-12 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-400 uppercase">
                  <Wallet size={16} />
                  Saldo Aktif
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {formatRp(balance)}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(true)}
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400 active:scale-95"
              >
                Tarik Saldo
                <ArrowUpRight size={18} />
              </button>
            </div>

            <div className="relative z-10 grid grid-cols-1 gap-4 border-t border-gray-800 pt-6 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-bold text-gray-500">
                  Total Pemasukan Bulan Ini
                </p>
                <p className="text-lg font-extrabold text-emerald-400">
                  {formatRp(3450000)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-gray-500">
                  Total Ditarik Bulan Ini
                </p>
                <p className="text-lg font-extrabold text-white">
                  {formatRp(2000000)}
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-sm font-extrabold tracking-wider text-gray-400 uppercase">
              Rekening Pencairan
            </h2>
            <div className="flex flex-1 flex-col justify-center gap-4">
              <div className="relative overflow-hidden rounded-[24px] border border-blue-100 bg-blue-50 p-5">
                <Building2
                  size={80}
                  className="absolute -right-4 -bottom-4 text-blue-100 opacity-50"
                />
                <p className="relative z-10 mb-1 text-lg font-extrabold text-blue-800">
                  {bankAccount.bank}
                </p>
                <p className="relative z-10 mb-3 font-mono font-bold tracking-widest text-blue-600">
                  {formatAccountNumber(bankAccount.number)}
                </p>
                <p className="relative z-10 text-xs font-medium text-blue-500 uppercase">
                  A.N {bankAccount.owner}
                </p>
              </div>
              <button
                type="button"
                onClick={openBankModal}
                className="w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
              >
                + Ganti Rekening Bank
              </button>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-50 bg-gray-50/50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">
              Riwayat Mutasi Saldo
            </h2>
            <button
              type="button"
              className="flex w-fit items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-emerald-600"
            >
              <Download size={16} />
              Download CSV
            </button>
          </div>
          <div className="p-2">
            {transactions.map((transaction) => {
              const isIncome = transaction.type === "income";

              return (
                <article
                  key={transaction.id}
                  className="flex flex-col gap-4 rounded-2xl p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                        isIncome
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownRight size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {transaction.desc}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <p className="text-[11px] text-gray-500">
                          {transaction.date}
                        </p>
                        <span className="text-gray-300">-</span>
                        <span className="font-mono text-[11px] text-gray-400">
                          {transaction.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p
                      className={`text-sm font-extrabold ${
                        isIncome ? "text-emerald-600" : "text-gray-900"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatRp(transaction.amount)}
                    </p>
                    <p
                      className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        transaction.status === "success"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {transaction.status === "success" ? "Berhasil" : "Diproses"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
