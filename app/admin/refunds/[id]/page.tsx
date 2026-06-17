"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
  Store,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  getRefundReasonOption,
  getRefundSlaState,
  getRefundStatusLabel,
  refundAdminDecisionTemplates,
  type RefundStatusValue,
} from "@/lib/refund-policy";
import { InlineNotice, StateCard } from "@/components/ui-state";

type RefundDetail = {
  id: string;
  reason: string;
  description: string;
  amount: number;
  method: string;
  status: RefundStatusValue;
  adminNote: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
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
    supportTickets: Array<{
      id: string;
      subject: string;
      status: string;
      priority: string;
      updatedAt: string;
      assignee: {
        name: string;
        email: string;
      } | null;
    }>;
  };
};

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTimelineItems(refund: RefundDetail) {
  return [
    {
      label: "Pengajuan masuk",
      description: "Customer mengirim alasan, kronologi, dan bukti pendukung.",
      done: true,
      time: formatTime(refund.createdAt),
    },
    {
      label: "Admin meninjau",
      description: "Admin memeriksa bukti, order, dan catatan restoran.",
      done: ["REVIEWING", "APPROVED", "REJECTED", "PAID"].includes(
        refund.status,
      ),
      time: refund.reviewedAt ? formatTime(refund.reviewedAt) : "Menunggu",
    },
    {
      label: "Keputusan dikirim",
      description: "Customer menerima hasil review refund.",
      done: ["APPROVED", "REJECTED", "PAID"].includes(refund.status),
      time: refund.reviewedAt ? formatTime(refund.reviewedAt) : "Menunggu",
    },
    {
      label: "Refund dibayarkan",
      description: "Saldo/order/wallet disesuaikan setelah admin menandai paid.",
      done: refund.status === "PAID",
      time: refund.paidAt ? formatTime(refund.paidAt) : "Menunggu approval",
    },
  ];
}

export default function AdminRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const [refund, setRefund] = useState<RefundDetail | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeType, setNoticeType] = useState<"error" | "success">("error");

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
      setNoticeType("error");
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
      setNoticeType("success");
      setNotice(
        status === "PAID"
          ? "Refund ditandai dibayarkan. Order, payment, dan wallet sudah disesuaikan."
          : "Status refund berhasil diperbarui.",
      );
    } catch (error) {
      setNoticeType("error");
      setNotice(
        error instanceof Error ? error.message : "Refund gagal diperbarui.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const refundReasonOption = refund ? getRefundReasonOption(refund.reason) : null;
  const refundSlaState = refund
    ? getRefundSlaState({
        createdAt: refund.createdAt,
        reviewedAt: refund.reviewedAt,
        status: refund.status,
      })
    : null;
  const refundTimelineItems = refund ? getTimelineItems(refund) : [];
  const refundSupportTicket = refund?.order.supportTickets[0] ?? null;

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
            {getRefundStatusLabel(refund.status)}
          </span>
        ) : null}
      </header>

      {notice ? (
        <InlineNotice variant={noticeType} description={notice} />
      ) : null}

      {isLoading ? (
        <StateCard
          variant="loading"
          title="Memuat refund"
          description="Detail refund, bukti, SLA, dan tiket terkait sedang disiapkan."
        />
      ) : refund ? (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Nominal", value: formatRp(refund.amount), icon: WalletCards },
                { label: "Metode", value: refund.method, icon: RefreshCcw },
                { label: "Diajukan", value: formatTime(refund.createdAt), icon: Clock3 },
                {
                  label: "SLA",
                  value: refundSlaState?.dueAt
                    ? refundSlaState.isBreached
                      ? "Lewat SLA"
                      : formatTime(refundSlaState.dueAt)
                    : "Selesai",
                  icon: refundSlaState?.isBreached ? AlertTriangle : ShieldCheck,
                },
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
                  {label === "SLA" && refundSlaState ? (
                    <p
                      className={`mt-1 text-xs font-bold ${
                        refundSlaState.isBreached
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {refundSlaState.label}
                    </p>
                  ) : null}
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
                {refundReasonOption ? (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 font-semibold text-emerald-800">
                    <p>{refundReasonOption.description}</p>
                    <p className="mt-1">Bukti ideal: {refundReasonOption.evidenceHint}</p>
                  </div>
                ) : null}
                <p className="mt-2 text-sm leading-6 font-medium text-gray-600">
                  {refund.description}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                Timeline Refund
              </h2>
              <div className="space-y-4">
                {refundTimelineItems.map((item, index) => (
                  <div key={item.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          item.done
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <CheckCircle2 size={17} />
                      </div>
                      {index < refundTimelineItems.length - 1 ? (
                        <div className="mt-2 h-8 w-px bg-gray-200" />
                      ) : null}
                    </div>
                    <div className="min-w-0 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-gray-950">
                          {item.label}
                        </p>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-500">
                          {item.time}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
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
              Status ini langsung memengaruhi refund. Saat ditandai dibayarkan,
              order, payment, dan wallet mitra ikut diperbarui.
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
            <div className="mt-3 space-y-2">
              {refundAdminDecisionTemplates.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setAdminNote(template)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-left text-xs leading-5 font-bold text-gray-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {template}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href={`mailto:${refund.customer.email}?subject=Refund ${refund.order.orderCode}`}
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <MessageSquareText size={17} />
                Email Customer
              </a>
              <Link
                href={
                  refundSupportTicket
                    ? `/admin/support?ticket=${refundSupportTicket.id}`
                    : "/admin/support"
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                Support Refund
              </Link>
            </div>
            <div className="mt-5 rounded-3xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Ticket Support Refund
              </p>
              {refund.order.supportTickets.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {refund.order.supportTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/admin/support?ticket=${ticket.id}`}
                      className="block rounded-2xl bg-white p-3 transition-colors hover:bg-emerald-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-gray-950">
                            {ticket.subject}
                          </p>
                          <p className="mt-1 text-xs font-bold text-gray-500">
                            {ticket.assignee?.name ?? "Unassigned"} -{" "}
                            {formatTime(ticket.updatedAt)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-600">
                          {ticket.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 font-semibold text-gray-500">
                  Belum ada ticket support refund untuk order ini.
                </p>
              )}
            </div>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => updateRefund("REVIEWING")}
                disabled={isSubmitting || refund.status === "PAID"}
                className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Tandai Review
              </button>
              <button
                type="button"
                onClick={() => updateRefund("APPROVED")}
                disabled={isSubmitting || refund.status === "PAID"}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Setujui Refund
              </button>
              <button
                type="button"
                onClick={() => updateRefund("PAID")}
                disabled={
                  isSubmitting ||
                  refund.status === "PAID" ||
                  refund.status !== "APPROVED"
                }
                className="rounded-2xl bg-gray-950 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Tandai Dibayarkan
              </button>
              <button
                type="button"
                onClick={() => updateRefund("REJECTED")}
                disabled={isSubmitting || refund.status === "PAID"}
                className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Tolak Refund
              </button>
            </div>
          </aside>
        </section>
      ) : (
        <StateCard
          variant="error"
          title="Refund tidak ditemukan"
          description={notice || "Data refund ini tidak tersedia atau sudah dipindahkan."}
          action={{
            label: "Coba lagi",
            onClick: () => void loadRefund(),
          }}
        />
      )}
    </div>
  );
}
