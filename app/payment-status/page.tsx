"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock3,
  CreditCard,
  Home,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";

type PaymentStatusPayload = {
  ok: boolean;
  message?: string;
  payment?: {
    attemptId: string;
    reference: string | null;
    methodName: string | null;
    status: string;
    amount: number | null;
    customerFee: number | null;
    checkoutUrl: string | null;
    expiresAt: string | null;
    errorMessage: string | null;
  };
  orders?: Array<{
    orderCode: string;
    paymentStatus: string;
    status: string;
  }>;
};

function PaymentStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCustomerApp();
  const attemptId = searchParams.get("attempt")?.trim() || "";
  const [payload, setPayload] = useState<PaymentStatusPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  const loadStatus = useCallback(async () => {
    if (!attemptId) {
      setErrorMessage("Referensi pembayaran tidak tersedia.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/payments/tripay/status?attempt=${encodeURIComponent(attemptId)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as PaymentStatusPayload;

      if (!response.ok || !data.ok || !data.payment) {
        throw new Error(data.message || "Status pembayaran gagal dimuat.");
      }

      setPayload(data);
      setErrorMessage(null);

      if (
        data.payment.status === "PAID" &&
        !redirectedRef.current &&
        (data.orders?.length ?? 0) > 0
      ) {
        redirectedRef.current = true;
        await clearCart();
        const orderCodes = data.orders?.map((order) => order.orderCode) ?? [];

        router.replace(
          `/payment-success?orders=${encodeURIComponent(orderCodes.join(","))}`,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Status pembayaran gagal dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, clearCart, router]);

  useEffect(() => {
    void loadStatus();
    const interval = window.setInterval(() => {
      void loadStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [loadStatus]);

  const status = payload?.payment?.status || "UNPAID";
  const isFailed = status === "FAILED" || status === "EXPIRED";

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="flex min-h-dvh flex-col bg-gray-50">
        <header className="border-b border-gray-100 bg-white px-5 py-5 sm:px-8">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
            <Link href="/home" className="font-extrabold text-gray-950">
              ResQFood
            </Link>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
              <ShieldCheck size={16} />
              Pembayaran aman
            </span>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-5 py-10 sm:px-8">
          <section className="w-full rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-9">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                isFailed
                  ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {isFailed ? <AlertCircle size={32} /> : <Clock3 size={32} />}
            </div>

            <p className="mt-6 text-xs font-extrabold tracking-[0.18em] text-gray-400 uppercase">
              Tripay Payment
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
              {isLoading
                ? "Memeriksa pembayaran"
                : isFailed
                  ? "Pembayaran belum berhasil"
                  : "Menunggu konfirmasi pembayaran"}
            </h1>
            <p className="mt-3 text-sm leading-6 font-medium text-gray-600">
              {errorMessage ||
                (isFailed
                  ? payload?.payment?.errorMessage ||
                    "Transaksi gagal atau melewati batas waktu pembayaran."
                  : "Status diperbarui otomatis setelah Tripay mengirim konfirmasi pembayaran. Jangan membuat transaksi baru selama pembayaran ini masih aktif.")}
            </p>

            {payload?.payment ? (
              <div className="mt-7 space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-bold text-gray-600">
                <div className="flex justify-between gap-4">
                  <span>Metode</span>
                  <span className="text-right text-gray-950">
                    {payload.payment.methodName || "Tripay"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Total</span>
                  <span className="text-gray-950">
                    {formatRp(
                      (payload.payment.amount || 0) +
                        (payload.payment.customerFee || 0),
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Status</span>
                  <span
                    className={
                      isFailed ? "text-red-600" : "text-amber-600"
                    }
                  >
                    {status}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {!isFailed && payload?.payment?.checkoutUrl ? (
                <a
                  href={payload.payment.checkoutUrl}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600"
                >
                  <CreditCard size={18} />
                  Buka pembayaran
                  <ArrowRight size={17} />
                </a>
              ) : (
                <Link
                  href={isFailed ? "/checkout" : "/home"}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600"
                >
                  <Home size={18} />
                  {isFailed ? "Coba checkout lagi" : "Kembali ke beranda"}
                </Link>
              )}
              <button
                type="button"
                onClick={() => void loadStatus()}
                disabled={isLoading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCcw
                  size={18}
                  className={isLoading ? "animate-spin" : ""}
                />
                Periksa status
              </button>
            </div>
          </section>
        </main>
      </div>
    </MobileDeviceFrame>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={null}>
      <PaymentStatusContent />
    </Suspense>
  );
}
