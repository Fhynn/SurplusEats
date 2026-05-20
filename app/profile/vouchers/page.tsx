"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Copy,
  Gift,
  Search,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type VoucherStatus = "available" | "used" | "expired";
type VoucherTone = "emerald" | "amber" | "blue" | "gray";

type Voucher = {
  id: string;
  code: string;
  tone: VoucherTone;
  label: string;
  title: string;
  description: string;
  meta: string;
  minSpend: string;
  terms: string[];
  status: VoucherStatus;
};

const toneClassName: Record<VoucherTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  gray: "bg-gray-400",
};

const statusLabel: Record<VoucherStatus, string> = {
  available: "Aktif",
  used: "Dipakai",
  expired: "Expired",
};

const SELECTED_VOUCHER_KEY = "resqfood-selected-voucher";

export default function CustomerVouchersPage() {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const loadVouchers = useCallback(async () => {
    setIsLoadingVouchers(true);

    try {
      const response = await fetch("/api/vouchers", { cache: "no-store" });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        vouchers?: Voucher[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Voucher gagal dimuat.");
      }

      setVouchers(data.vouchers || []);
      setFeedback(null);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Voucher gagal dimuat.",
      });
    } finally {
      setIsLoadingVouchers(false);
    }
  }, []);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

  const availableCount = useMemo(
    () => vouchers.filter((voucher) => voucher.status === "available").length,
    [vouchers],
  );

  const handleClaimVoucher = async () => {
    const normalizedCode = promoCode.trim().toUpperCase();

    if (!normalizedCode) {
      setFeedback({
        type: "error",
        message: "Masukkan kode promo terlebih dahulu.",
      });
      return;
    }

    setIsClaiming(true);

    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: normalizedCode }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Voucher gagal diklaim.");
      }

      setPromoCode("");
      setFeedback({
        type: "success",
        message: data.message || "Voucher berhasil diklaim.",
      });
      await loadVouchers();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Voucher gagal diklaim.",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleUseVoucher = (voucherId: string) => {
    const voucher = vouchers.find((item) => item.id === voucherId);

    if (voucher) {
      window.localStorage.setItem(SELECTED_VOUCHER_KEY, voucher.code);
      router.push(`/cart?voucher=${encodeURIComponent(voucher.code)}`);
      return;
    }

    setSelectedVoucher(null);
    setFeedback({
      type: "success",
      message: "Voucher siap dipakai saat checkout.",
    });
  };

  const handleCopyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setFeedback({
      type: "success",
      message: `Kode ${code} siap digunakan.`,
    });
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-5 pt-10 pb-5 shadow-sm sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center">
              <Link
                href="/profile/settings"
                className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
                aria-label="Kembali ke pengaturan akun"
              >
                <ChevronLeft size={24} className="text-gray-800" />
              </Link>
              <div className="ml-2 min-w-0">
                <h1 className="text-lg font-extrabold text-gray-900">
                  Voucher Saya
                </h1>
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  {availableCount} voucher aktif
                </p>
              </div>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Ticket size={22} />
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(event) => {
                setPromoCode(event.target.value.toUpperCase());
                setFeedback(null);
              }}
              placeholder="Masukkan kode promo..."
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold uppercase shadow-sm outline-none placeholder:font-medium placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => void handleClaimVoucher()}
              disabled={isClaiming}
              className="rounded-xl bg-gray-900 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isClaiming ? "Klaim..." : "Klaim"}
            </button>
          </div>

        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6 pb-28 [scrollbar-width:none] sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8 [&::-webkit-scrollbar]:hidden">
          {feedback ? (
            <div
              className={`flex gap-3 rounded-[20px] border p-4 ${
                feedback.type === "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 size={20} className="shrink-0" />
              ) : (
                <AlertCircle size={20} className="shrink-0" />
              )}
              <p className="text-xs leading-5 font-bold">{feedback.message}</p>
            </div>
          ) : null}

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
              <Gift size={20} className="mb-3 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-700">
                Voucher aktif
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-800">
                {availableCount}
              </p>
            </div>
            <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
              <Clock3 size={20} className="mb-3 text-gray-500" />
              <p className="text-xs font-bold text-gray-500">Riwayat</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">
                {vouchers.length}
              </p>
            </div>
          </section>

          {isLoadingVouchers ? (
            <div className="rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
              <p className="text-sm font-extrabold text-gray-950">
                Memuat voucher
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Voucher aktif sedang dimuat.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
          {!isLoadingVouchers && vouchers.map((voucher) => {
            const isAvailable = voucher.status === "available";
            const isInactive = voucher.status !== "available";

            return (
              <article
                key={voucher.id}
                className={`group relative flex overflow-hidden rounded-[20px] border bg-white shadow-sm ${
                  isAvailable
                    ? "border-emerald-100"
                    : "border-gray-200 opacity-75"
                }`}
              >
                <div
                  className={`relative flex w-24 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-white p-4 text-white ${toneClassName[voucher.tone]}`}
                >
                  <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-[#f8fafc]" />
                  <div className="absolute -right-3 -bottom-3 h-6 w-6 rounded-full bg-[#f8fafc]" />
                  <Ticket size={28} className="mb-2 opacity-80" />
                  <span
                    className={`font-extrabold ${
                      voucher.label === "FREE"
                        ? "text-lg tracking-wider"
                        : "text-xl"
                    }`}
                  >
                    {voucher.label}
                  </span>
                </div>

                <div className="min-w-0 flex-1 p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h2 className="text-sm font-extrabold text-gray-900">
                      {voucher.title}
                    </h2>
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-bold ${
                        isAvailable
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {statusLabel[voucher.status]}
                    </span>
                  </div>
                  <p className="mb-3 text-[10px] leading-4 text-gray-500">
                    {voucher.description}
                  </p>
                  <div className="mb-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-extrabold text-gray-700">
                      {voucher.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(voucher.code)}
                      className="text-gray-400 transition-colors hover:text-emerald-600"
                      aria-label={`Salin kode ${voucher.code}`}
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-bold ${
                        isAvailable
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {voucher.meta}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedVoucher(voucher)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        isInactive
                          ? "border border-gray-200 bg-gray-50 text-gray-600"
                          : "bg-emerald-500 text-white shadow-sm group-hover:bg-emerald-600"
                      }`}
                    >
                      {isAvailable ? "Pakai" : "Detail"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          </div>

          {!isLoadingVouchers && vouchers.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-6 text-center">
              <Gift size={30} className="mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-extrabold text-gray-950">
                Belum ada voucher aktif
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Voucher akan tampil otomatis saat tersedia.
              </p>
            </div>
          ) : null}

          <Link
            href="/browse"
            className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-gray-100 bg-white py-4 text-sm font-extrabold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Search size={18} />
            Cari makanan untuk pakai voucher
          </Link>
        </div>

        {selectedVoucher ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm md:items-center md:justify-center md:p-6">
            <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)] md:max-w-xl md:rounded-[32px] md:p-7">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                    Voucher Detail
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                    {selectedVoucher.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                  aria-label="Tutup detail voucher"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                    <Ticket size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-extrabold text-emerald-900">
                      {selectedVoucher.code}
                    </p>
                    <p className="mt-1 text-xs font-bold text-emerald-700">
                      {selectedVoucher.minSpend}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedVoucher.terms.map((term) => (
                  <div key={term} className="flex gap-3 rounded-2xl bg-gray-50 p-4">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                    <p className="text-xs leading-5 font-semibold text-gray-600">
                      {term}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Tutup
                </button>
                {selectedVoucher.status === "available" ? (
                  <button
                    type="button"
                    onClick={() => handleUseVoucher(selectedVoucher.id)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                  >
                    <ShoppingBag size={17} />
                    Pakai
                  </button>
                ) : (
                  <Link
                    href="/browse"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500"
                  >
                    Cari Menu
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
