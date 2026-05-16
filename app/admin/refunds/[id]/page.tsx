"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCcw,
  Store,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

type RefundDetail = {
  id: string;
  reason: string;
  description: string;
  amount: number;
  method: string;
  status: "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED" | "PAID";
  adminNote: string | null;
  createdAt: string;
  evidence: Array<{
    id: string;
    asset: {
      url: string;
      pathname: string;
      contentType: string | null;
    };
  }>;
  customer: {
    name: string;
    email: string;
  };
  order: {
    orderCode: string;
    total: number;
    status: string;
    items: Array<{
      menuNameSnapshot: string;
      quantity: number;
      priceSnapshot: number;
    }>;
    restaurant: {
      name: string;
      owner: {
        email: string;
      };
    };
  };
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

export default function AdminRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const [refund, setRefund] = useState<RefundDetail | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRefund = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/refunds/${params.id}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        refund?: RefundDetail;
      };

      if (!response.ok || !data.ok || !data.refund) {
        throw new Error(data.message || "Refund tidak ditemukan.");
      }

      setRefund(data.refund);
      setAdminNote(data.refund.adminNote || "");
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Refund gagal dimuat.");
      setRefund(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadRefund();
  }, [loadRefund]);

  const updateRefund = async (
    status: "REVIEWING" | "APPROVED" | "REJECTED" | "PAID",
  ) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/refunds/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Refund gagal diperbarui.");
      }

      await loadRefund();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Refund gagal diperbarui.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/dashboard?tab=transactions"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
              Refund Review
            </p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-gray-950">
              {refund?.order.orderCode ||
                (isLoading ? "Memuat refund..." : "Refund tidak ditemukan")}
            </h1>
          </div>
        </div>

        {refund ? (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${
              refund.status === "APPROVED" || refund.status === "PAID"
                ? "bg-emerald-50 text-emerald-700"
                : refund.status === "REJECTED"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {refund.status === "REJECTED" ? (
              <XCircle size={16} />
            ) : refund.status === "APPROVED" || refund.status === "PAID" ? (
              <CheckCircle2 size={16} />
            ) : (
              <Clock3 size={16} />
            )}
            {refund.status}
          </span>
        ) : null}
      </header>

      {notice ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
          Memuat refund dari database...
        </div>
      ) : refund ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Nominal", value: formatRp(refund.amount), icon: WalletCards },
                { label: "Metode", value: refund.method, icon: RefreshCcw },
                { label: "Diajukan", value: formatTime(refund.createdAt), icon: Clock3 },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <Icon size={20} className="mb-3 text-emerald-600" />
                  <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-gray-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                Detail Kasus
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <UserRound size={19} className="mb-3 text-emerald-600" />
                  <p className="text-sm font-extrabold text-gray-950">
                    {refund.customer.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {refund.customer.email}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <Store size={19} className="mb-3 text-emerald-600" />
                  <p className="text-sm font-extrabold text-gray-950">
                    {refund.order.restaurant.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {refund.order.restaurant.owner.email}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Alasan
                </p>
                <p className="mt-2 text-sm font-extrabold text-gray-950">
                  {refund.reason}
                </p>
                <p className="mt-2 text-sm leading-6 font-medium text-gray-600">
                  {refund.description}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                Bukti Upload
              </h2>
              {refund.evidence.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                  Customer belum mengunggah bukti untuk refund ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {refund.evidence.map((item) => (
                    <a
                      key={item.id}
                      href={item.asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 text-sm font-extrabold text-gray-950"
                    >
                      <FileText size={18} className="text-emerald-600" />
                      {item.asset.pathname}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-gray-950">
              Keputusan Refund
            </h2>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              Status ini langsung disimpan ke tabel refund.
            </p>
            <label className="mt-5 block text-sm font-extrabold text-gray-700">
              Catatan admin
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-900 outline-none focus:border-emerald-300 focus:bg-white"
                placeholder="Tulis catatan keputusan..."
              />
            </label>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => updateRefund("REVIEWING")}
                disabled={isSubmitting}
                className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Tandai Review
              </button>
              <button
                type="button"
                onClick={() => updateRefund("APPROVED")}
                disabled={isSubmitting}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Setujui Refund
              </button>
              <button
                type="button"
                onClick={() => updateRefund("REJECTED")}
                disabled={isSubmitting}
                className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Tolak Refund
              </button>
            </div>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
