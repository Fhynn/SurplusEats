"use client";

import Link from "next/link";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  CircleCheck,
  CreditCard,
  FileText,
  ImageIcon,
  MessageSquareText,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";
import type { ApiOrder } from "@/lib/order-mapper";

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

const evidenceGuidelines = [
  "Foto makanan atau item yang bermasalah",
  "Kemasan atau label pesanan jika masih ada",
  "Jelaskan masalah tanpa data sensitif rekening di catatan",
];

const reviewTimeline = [
  "Pengajuan diterima",
  "Admin meninjau bukti",
  "Keputusan refund dikirim",
];

export default function CustomerRefundRequestPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [selectedMethod, setSelectedMethod] =
    useState<(typeof refundMethods)[number]["id"]>("gopay");
  const [description, setDescription] = useState("");
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [evidencePreview, setEvidencePreview] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const trimmedDescription = description.trim();
  const hasValidDescription = trimmedDescription.length >= 12;
  const selectedRefundMethod = refundMethods.find(
    (method) => method.id === selectedMethod,
  );
  const refundAmount = order?.total ?? 0;
  const restaurantName = order?.restaurant.name ?? "Restoran";
  const completionItems = useMemo(
    () => [
      { label: "Alasan dipilih", done: Boolean(selectedReason) },
      { label: "Detail masalah jelas", done: hasValidDescription },
      { label: "Metode refund siap", done: Boolean(selectedRefundMethod) },
      { label: "Bukti pendukung", done: Boolean(evidenceFileName) },
    ],
    [
      evidenceFileName,
      hasValidDescription,
      selectedReason,
      selectedRefundMethod,
    ],
  );
  const requiredCompletion = completionItems.filter(
    (item) => item.label !== "Bukti pendukung",
  );
  const completedCount = completionItems.filter((item) => item.done).length;
  const completionPercent = Math.round(
    (completedCount / completionItems.length) * 100,
  );
  const canSubmit = requiredCompletion.every((item) => item.done);

  useEffect(() => {
    let ignore = false;

    async function loadOrder() {
      setIsLoadingOrder(true);

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          order?: ApiOrder;
        };

        if (!response.ok || !data.ok || !data.order) {
          throw new Error(data.message || "Order tidak ditemukan.");
        }

        if (!ignore) {
          setOrder(data.order);
          setNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setNotice(error instanceof Error ? error.message : "Order gagal dimuat.");
          setOrder(null);
        }
      } finally {
        if (!ignore) {
          setIsLoadingOrder(false);
        }
      }
    }

    void loadOrder();

    return () => {
      ignore = true;
    };
  }, [orderId]);

  const handleSubmitRefund = async () => {
    if (!canSubmit || !order) {
      return;
    }

    try {
      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCode: order.orderCode,
          reason: selectedReason,
          description: trimmedDescription,
          method: selectedMethod === "gopay" ? "GOPAY" : "BANK_TRANSFER",
        }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Pengajuan refund gagal.");
      }

      setIsSubmitted(true);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Pengajuan refund gagal.",
      );
    }
  };

  useEffect(() => {
    return () => {
      if (evidencePreview) {
        URL.revokeObjectURL(evidencePreview);
      }
    };
  }, [evidencePreview]);

  const handleEvidenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }

    setEvidenceFileName(file.name);
    setEvidencePreview(URL.createObjectURL(file));
  };

  const clearEvidence = () => {
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }

    setEvidenceFileName("");
    setEvidencePreview("");

    if (evidenceInputRef.current) {
      evidenceInputRef.current.value = "";
    }
  };

  if (isLoadingOrder || !order) {
    return (
      <MobileDeviceFrame backgroundClassName="bg-white">
        <div className="flex min-h-full flex-1 items-center justify-center bg-white px-6 text-center">
          <div>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <RefreshCcw size={30} />
            </div>
            <h1 className="text-xl font-extrabold text-gray-950">
              {isLoadingOrder ? "Memuat order..." : "Order tidak ditemukan"}
            </h1>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              {notice || "Refund hanya bisa diajukan dari order asli di database."}
            </p>
            {!isLoadingOrder ? (
              <Link
                href="/orders"
                className="mt-6 inline-flex rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white"
              >
                Buka Pesanan
              </Link>
            ) : null}
          </div>
        </div>
      </MobileDeviceFrame>
    );
  }

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

            <div className="mt-8 w-full max-w-xs rounded-[24px] border border-white/20 bg-white/10 p-4 text-left backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <ReceiptText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-emerald-100">
                    {orderId}
                  </p>
                  <p className="mt-1 text-sm font-extrabold">
                    {formatRp(refundAmount)} via {selectedRefundMethod?.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 font-medium text-emerald-50">
                    {selectedReason}
                  </p>
                </div>
              </div>
            </div>
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
          {notice ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {notice}
            </div>
          ) : null}

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
                <span className="font-bold text-gray-700">{restaurantName}</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 text-sm font-extrabold text-gray-950">
                <span>Estimasi Refund</span>
                <span>{formatRp(refundAmount)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-emerald-950">
                  Kelengkapan Pengajuan
                </h2>
                <p className="mt-1 text-xs leading-5 font-medium text-emerald-700">
                  Lengkapi data wajib supaya admin bisa meninjau tanpa bolak
                  balik meminta detail.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-emerald-700 shadow-sm">
                {completionPercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {completionItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[11px] font-bold text-gray-700"
                >
                  <CircleCheck
                    size={14}
                    className={
                      item.done ? "text-emerald-500" : "text-gray-300"
                    }
                  />
                  <span className="min-w-0 truncate">{item.label}</span>
                </div>
              ))}
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
                    <span className="flex items-center justify-between gap-3">
                      <span>{reason}</span>
                      {isActive ? <CheckCircle2 size={16} /> : null}
                    </span>
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
            {evidenceFileName ? (
              <div className="overflow-hidden rounded-[24px] border border-emerald-100 bg-emerald-50">
                <div className="relative aspect-[16/10] bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evidencePreview}
                    alt="Preview bukti refund"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearEvidence}
                    className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Hapus bukti refund"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                    <ImageIcon size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-gray-900">
                      {evidenceFileName}
                    </p>
                    <button
                      type="button"
                      onClick={() => evidenceInputRef.current?.click()}
                      className="mt-1 text-xs font-extrabold text-emerald-600"
                    >
                      Ganti foto bukti
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/50">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm">
                  <Upload size={22} />
                </div>
                <p className="text-sm font-extrabold text-gray-900">
                  Upload foto bukti
                </p>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Opsional, tapi membantu proses review.
                </p>
                <input
                  ref={evidenceInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEvidenceChange}
                  className="sr-only"
                />
              </label>
            )}
            {evidenceFileName ? (
              <input
                ref={evidenceInputRef}
                type="file"
                accept="image/*"
                onChange={handleEvidenceChange}
                className="sr-only"
              />
            ) : null}
            <div className="mt-4 space-y-2">
              {evidenceGuidelines.map((guideline) => (
                <div
                  key={guideline}
                  className="flex items-start gap-2 text-xs leading-5 font-medium text-gray-500"
                >
                  <CheckCircle2
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  <span>{guideline}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-gray-950">
                <FileText size={18} className="text-purple-500" />
                Detail Masalah
              </h2>
              <span
                className={`text-xs font-extrabold ${
                  hasValidDescription ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                {trimmedDescription.length}/12
              </span>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Jelaskan kronologi singkat agar tim admin bisa meninjau dengan tepat..."
              rows={4}
              className="w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
            {!hasValidDescription ? (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs leading-5 font-medium text-amber-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>
                  Minimal 12 karakter agar kronologi cukup jelas untuk
                  ditinjau.
                </span>
              </div>
            ) : null}
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

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-extrabold text-gray-950">
              Estimasi Proses
            </h2>
            <div className="space-y-4">
              {reviewTimeline.map((step, index) => {
                const isFirst = index === 0;

                return (
                  <div key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isFirst
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <CheckCircle2 size={16} />
                      </div>
                      {index < reviewTimeline.length - 1 ? (
                        <div className="mt-2 h-7 w-px bg-gray-200" />
                      ) : null}
                    </div>
                    <div className="pt-1">
                      <p className="text-sm font-extrabold text-gray-900">
                        {step}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-gray-500">
                        {isFirst
                          ? "Langsung aktif setelah pengajuan dikirim"
                          : "Estimasi maksimal 1x24 jam"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="absolute right-0 bottom-0 left-0 border-t border-gray-100 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <button
            type="button"
            onClick={handleSubmitRefund}
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {canSubmit ? "Kirim Pengajuan Refund" : "Lengkapi Data Wajib"}
          </button>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
