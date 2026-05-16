"use client";

import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  FileText,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

const refundReasons = [
  "Makanan tidak sesuai deskripsi",
  "Kualitas makanan tidak layak",
  "Restoran membatalkan pickup",
  "Item pesanan kurang",
] as const;

const refundMethods = [
  {
    id: "gopay",
    title: "Refund ke GoPay",
    description: "Estimasi 1x24 jam setelah disetujui",
    icon: Wallet,
  },
  {
    id: "bank",
    title: "Transfer Bank",
    description: "Butuh verifikasi rekening aktif",
    icon: CreditCard,
  },
] as const;

export default function CustomerRefundRequestPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id ?? "SFM-77C0Z";
  const [selectedReason, setSelectedReason] = useState("");
  const [selectedMethod, setSelectedMethod] =
    useState<(typeof refundMethods)[number]["id"]>("gopay");
  const [description, setDescription] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <MobileDeviceFrame backgroundClassName="bg-emerald-500">
        <div className="flex min-h-full flex-1 flex-col bg-emerald-500 px-6 py-12 text-white">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
              <CheckCircle2 size={50} className="text-emerald-500" />
            </div>
            <p className="mb-2 text-xs font-extrabold tracking-[0.24em] text-emerald-100 uppercase">
              Refund Submitted
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Pengajuan Refund
              <br />
              Terkirim
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 font-medium text-emerald-50">
              Tim SurplusEats akan meninjau bukti dan memberi keputusan melalui
              notifikasi dalam 1x24 jam.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/notifications"
              className="block w-full rounded-2xl bg-white py-4 text-center text-sm font-extrabold text-emerald-600 shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all active:scale-[0.98]"
            >
              Cek Notifikasi
            </Link>
            <Link
              href="/orders"
              className="block w-full rounded-2xl border border-white/30 py-4 text-center text-sm font-extrabold text-white transition-colors hover:bg-white/10"
            >
              Kembali ke Riwayat
            </Link>
          </div>
        </div>
      </MobileDeviceFrame>
    );
  }

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="flex min-h-full flex-1 flex-col bg-[#f8fafc]">
        <header className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4 shadow-sm">
          <Link
            href="/orders"
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke riwayat pesanan"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </Link>
          <div className="ml-2">
            <h1 className="text-lg font-extrabold text-gray-900">
              Ajukan Refund
            </h1>
            <p className="font-mono text-[11px] font-bold text-gray-400">
              Order {orderId}
            </p>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 pb-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <RefreshCcw size={23} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-950">
                  Ringkasan Refund
                </h2>
                <p className="text-xs font-medium text-gray-500">
                  Nominal maksimal yang bisa diajukan
                </p>
              </div>
            </div>
            <div className="rounded-[20px] bg-gray-50 p-4">
              <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>Order ID</span>
                <span className="font-mono font-bold">{orderId}</span>
              </div>
              <div className="mt-3 flex justify-between text-xs font-medium text-gray-500">
                <span>Restoran</span>
                <span className="font-bold text-gray-700">Bakehouse Bakery</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 text-sm font-extrabold text-gray-950">
                <span>Estimasi Refund</span>
                <span>{formatRp(17000)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-950">
              <MessageSquareText size={18} className="text-emerald-500" />
              Alasan Refund
            </h2>
            <div className="space-y-2">
              {refundReasons.map((reason) => {
                const isActive = selectedReason === reason;

                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full rounded-2xl border p-3 text-left text-xs font-bold transition-all ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-50"
                        : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-950">
              <Camera size={18} className="text-amber-500" />
              Bukti Pendukung
            </h2>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/50">
              <input type="file" accept="image/*" className="sr-only" />
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
                <Upload size={22} />
              </div>
              <p className="text-sm font-extrabold text-gray-900">
                Upload foto bukti
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Opsional, tapi membantu proses review.
              </p>
            </label>
          </section>

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-950">
              <FileText size={18} className="text-purple-500" />
              Detail Masalah
            </h2>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Jelaskan kronologi singkat agar tim admin bisa meninjau dengan tepat..."
              rows={4}
              className="w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </section>

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-950">
              <ShieldCheck size={18} className="text-blue-500" />
              Metode Pengembalian
            </h2>
            <div className="space-y-2">
              {refundMethods.map((method) => {
                const Icon = method.icon;
                const isActive = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-50"
                        : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-gray-900">
                        {method.title}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-gray-500">
                        {method.description}
                      </p>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-[5px] ${
                        isActive
                          ? "border-emerald-500 bg-white"
                          : "border-gray-200 bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="absolute right-0 bottom-0 left-0 border-t border-gray-100 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsSubmitted(true)}
            disabled={!selectedReason}
            className="w-full rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            Kirim Pengajuan Refund
          </button>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
