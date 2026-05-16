"use client";

import Link from "next/link";
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
import { useMemo, useState } from "react";

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

const initialVouchers: Voucher[] = [
  {
    id: "food-hero",
    code: "HERO50",
    tone: "emerald",
    label: "50%",
    title: "Diskon Food Hero",
    description: "Maks. diskon Rp 15.000. Berlaku untuk semua restoran.",
    meta: "Berakhir besok",
    minSpend: "Tanpa minimum transaksi",
    terms: [
      "Berlaku untuk 1 transaksi customer.",
      "Tidak bisa digabung dengan voucher lain.",
      "Voucher otomatis hangus setelah masa berlaku selesai.",
    ],
    status: "available",
  },
  {
    id: "free-delivery",
    code: "ONGKIRHEMAT",
    tone: "blue",
    label: "FREE",
    title: "Gratis Ongkir Biasa",
    description: "Khusus pesanan di atas Rp 50.000.",
    meta: "Hingga 31 Okt",
    minSpend: "Minimum transaksi Rp 50.000",
    terms: [
      "Berlaku untuk restoran dalam radius pickup terdekat.",
      "Tidak berlaku untuk biaya tambahan layanan.",
      "Kuota voucher dapat berubah sewaktu-waktu.",
    ],
    status: "available",
  },
  {
    id: "late-night",
    code: "MALAMHEMAT",
    tone: "gray",
    label: "25%",
    title: "Pickup Malam Hemat",
    description: "Diskon khusus setelah pukul 20:00 WIB.",
    meta: "Sudah dipakai",
    minSpend: "Minimum transaksi Rp 25.000",
    terms: [
      "Hanya berlaku pada jam pickup malam.",
      "Satu akun hanya bisa memakai voucher ini satu kali.",
    ],
    status: "used",
  },
];

const claimableVouchers: Record<string, Voucher> = {
  ALFHIN: {
    id: "alfhin-credit",
    code: "ALFHIN",
    tone: "amber",
    label: "35%",
    title: "Creator Credit Voucher",
    description: "Diskon spesial untuk prototype SurplusEats by Fhynn.",
    meta: "Berlaku 7 hari",
    minSpend: "Minimum transaksi Rp 20.000",
    terms: [
      "Voucher ini dibuat untuk demo frontend prototype.",
      "Tidak terhubung ke payment gateway asli.",
      "Credit dan nama project tetap milik Fhynn.",
    ],
    status: "available",
  },
  SAVEFOOD: {
    id: "save-food",
    code: "SAVEFOOD",
    tone: "emerald",
    label: "20%",
    title: "Save Good Food",
    description: "Diskon untuk pembelian makanan surplus pertama minggu ini.",
    meta: "Berlaku 3 hari",
    minSpend: "Minimum transaksi Rp 30.000",
    terms: [
      "Berlaku untuk restoran yang sedang aktif promo.",
      "Tidak dapat diuangkan.",
      "Berlaku selama kuota masih tersedia.",
    ],
    status: "available",
  },
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

export default function CustomerVouchersPage() {
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [promoCode, setPromoCode] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const availableCount = useMemo(
    () => vouchers.filter((voucher) => voucher.status === "available").length,
    [vouchers],
  );

  const handleClaimVoucher = () => {
    const normalizedCode = promoCode.trim().toUpperCase();

    if (!normalizedCode) {
      setFeedback({
        type: "error",
        message: "Masukkan kode promo terlebih dahulu.",
      });
      return;
    }

    const voucherTemplate = claimableVouchers[normalizedCode];

    if (!voucherTemplate) {
      setFeedback({
        type: "error",
        message: "Kode promo tidak ditemukan atau sudah tidak berlaku.",
      });
      return;
    }

    const isAlreadyClaimed = vouchers.some(
      (voucher) => voucher.code === normalizedCode,
    );

    if (isAlreadyClaimed) {
      setFeedback({
        type: "error",
        message: "Voucher ini sudah ada di akun kamu.",
      });
      return;
    }

    setVouchers((currentVouchers) => [voucherTemplate, ...currentVouchers]);
    setPromoCode("");
    setFeedback({
      type: "success",
      message: `${voucherTemplate.title} berhasil diklaim.`,
    });
  };

  const handleUseVoucher = (voucherId: string) => {
    setVouchers((currentVouchers) =>
      currentVouchers.map((voucher) =>
        voucher.id === voucherId
          ? {
              ...voucher,
              status: "used",
              meta: "Sudah dipakai",
            }
          : voucher,
      ),
    );
    setSelectedVoucher(null);
    setFeedback({
      type: "success",
      message: "Voucher ditandai dipakai di prototype UI.",
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
      <div className="relative flex min-h-full flex-1 flex-col bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-6 pt-10 pb-5 shadow-sm">
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
              onClick={handleClaimVoucher}
              className="rounded-xl bg-gray-900 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
            >
              Klaim
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-5 font-semibold text-gray-400">
            Coba kode: ALFHIN atau SAVEFOOD.
          </p>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

          {vouchers.map((voucher) => {
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

          <Link
            href="/browse"
            className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-gray-100 bg-white py-4 text-sm font-extrabold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Search size={18} />
            Cari makanan untuk pakai voucher
          </Link>
        </div>

        {selectedVoucher ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm">
            <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
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
