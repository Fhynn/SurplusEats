"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Mail,
  MessageSquareText,
  PackageCheck,
  RefreshCcw,
  Search,
  UserRound,
} from "lucide-react";

type SupportTicketStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

type SupportTicket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminNote: string | null;
  orderCode: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  order: {
    orderCode: string;
    status: string;
    total: number;
    restaurant: {
      name: string;
    };
  } | null;
};

type SupportMetrics = {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
};

const categoryLabel: Record<string, string> = {
  ACCOUNT: "Akun",
  ORDER: "Pesanan",
  OTHER: "Lainnya",
  PAYMENT: "Pembayaran",
  REFUND: "Refund",
};

const statusLabel: Record<SupportTicketStatus, string> = {
  CLOSED: "Ditutup",
  IN_REVIEW: "Ditinjau",
  OPEN: "Baru",
  RESOLVED: "Selesai",
};

const statusClassName: Record<SupportTicketStatus, string> = {
  CLOSED: "bg-gray-100 text-gray-600",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  OPEN: "bg-blue-50 text-blue-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function AdminSupportPage() {
  const searchParams = useSearchParams();
  const requestedTicketId = searchParams.get("ticket");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics>({
    total: 0,
    open: 0,
    inReview: 0,
    resolved: 0,
  });
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SupportTicketStatus>(
    "ALL",
  );
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/support", { cache: "no-store" });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        tickets?: SupportTicket[];
        metrics?: SupportMetrics;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Tiket support gagal dimuat.");
      }

      setTickets(data.tickets ?? []);
      setMetrics(
        data.metrics ?? {
          total: 0,
          open: 0,
          inReview: 0,
          resolved: 0,
        },
      );
      setNotice(null);
    } catch (error) {
      setTickets([]);
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "Tiket support gagal dimuat.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (tickets.length === 0) {
      setSelectedTicketId("");
      return;
    }

    const requestedTicket = requestedTicketId
      ? tickets.find((ticket) => ticket.id === requestedTicketId)
      : null;
    const currentTicket = tickets.find((ticket) => ticket.id === selectedTicketId);

    if (!currentTicket) {
      setSelectedTicketId(requestedTicket?.id ?? tickets[0].id);
    }
  }, [requestedTicketId, selectedTicketId, tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === "ALL" || ticket.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          ticket.id,
          ticket.subject,
          ticket.message,
          ticket.user.name,
          ticket.user.email,
          ticket.orderCode ?? "",
          ticket.order?.restaurant.name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, tickets]);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ??
    filteredTickets[0] ??
    null;

  useEffect(() => {
    setAdminNote(selectedTicket?.adminNote ?? "");
  }, [selectedTicket?.adminNote, selectedTicket?.id]);

  const updateTicket = async (status: SupportTicketStatus) => {
    if (!selectedTicket || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicket.id,
          status,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Status tiket gagal diperbarui.");
      }

      await loadTickets();
      setNotice({
        type: "success",
        message: "Status tiket berhasil diperbarui.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Status tiket gagal diperbarui.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <LifeBuoy size={28} />
            </div>
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                Support Desk
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
                Tiket Support Customer
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
                Semua laporan dari halaman support customer masuk ke sini dan
                bisa diproses tanpa data dummy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadTickets()}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>
      </header>

      {notice ? (
        <div
          className={`rounded-2xl border p-4 text-sm font-bold ${
            notice.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Tiket", value: metrics.total, icon: LifeBuoy },
          { label: "Baru", value: metrics.open, icon: Mail },
          { label: "Ditinjau", value: metrics.inReview, icon: Clock3 },
          { label: "Selesai", value: metrics.resolved, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm"
          >
            <Icon size={21} className="mb-4 text-emerald-600" />
            <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-gray-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                size={17}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari tiket, customer, order..."
                className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-11 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              className="h-12 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPEN">Baru</option>
              <option value="IN_REVIEW">Ditinjau</option>
              <option value="RESOLVED">Selesai</option>
              <option value="CLOSED">Ditutup</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm font-bold text-gray-500">
                Memuat tiket support...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm font-bold text-gray-500">
                Tidak ada tiket support.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50 ring-4 ring-emerald-50"
                        : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-gray-950">
                          {ticket.subject}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-500">
                          {ticket.user.name} -{" "}
                          {categoryLabel[ticket.category] ?? ticket.category}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClassName[ticket.status]}`}
                      >
                        {statusLabel[ticket.status]}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 font-medium text-gray-500">
                      {ticket.message}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <aside className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          {selectedTicket ? (
            <div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${statusClassName[selectedTicket.status]}`}
                  >
                    {statusLabel[selectedTicket.status]}
                  </span>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-950">
                    {selectedTicket.subject}
                  </h2>
                  <p className="mt-2 text-xs font-bold text-gray-400">
                    {formatTime(selectedTicket.createdAt)}
                  </p>
                </div>
                {selectedTicket.order ? (
                  <Link
                    href={`/admin/transactions/${selectedTicket.order.orderCode}`}
                    className="rounded-2xl bg-gray-950 px-4 py-3 text-center text-sm font-extrabold text-white"
                  >
                    Buka Order
                  </Link>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <UserRound size={19} className="mb-3 text-emerald-600" />
                  <p className="text-sm font-extrabold text-gray-950">
                    {selectedTicket.user.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {selectedTicket.user.email}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {selectedTicket.user.phone || "Nomor HP belum diisi"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <PackageCheck size={19} className="mb-3 text-emerald-600" />
                  <p className="text-sm font-extrabold text-gray-950">
                    {selectedTicket.order?.orderCode ||
                      selectedTicket.orderCode ||
                      "Tanpa order"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {selectedTicket.order?.restaurant.name ||
                      "Tidak terkait restoran"}
                  </p>
                  {selectedTicket.order ? (
                    <p className="mt-1 text-xs font-bold text-gray-500">
                      {formatRp(selectedTicket.order.total)} -{" "}
                      {selectedTicket.order.status}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] bg-gray-50 p-5">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Pesan Customer
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 font-medium text-gray-700">
                  {selectedTicket.message}
                </p>
              </div>

              <label className="mt-5 block text-sm font-extrabold text-gray-700">
                Catatan admin untuk customer
                <textarea
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  placeholder="Tulis tindakan atau keputusan support..."
                  className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-semibold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                />
              </label>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateTicket("IN_REVIEW")}
                  disabled={isUpdating}
                  className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
                >
                  Tandai Ditinjau
                </button>
                <button
                  type="button"
                  onClick={() => updateTicket("RESOLVED")}
                  disabled={isUpdating}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
                >
                  Selesaikan
                </button>
                <button
                  type="button"
                  onClick={() => updateTicket("OPEN")}
                  disabled={isUpdating}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-700 disabled:text-gray-300"
                >
                  Buka Lagi
                </button>
                <button
                  type="button"
                  onClick={() => updateTicket("CLOSED")}
                  disabled={isUpdating}
                  className="rounded-2xl bg-gray-950 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
                >
                  Tutup Tiket
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-96 items-center justify-center text-center">
              <div>
                <MessageSquareText
                  size={38}
                  className="mx-auto mb-4 text-gray-300"
                />
                <h2 className="text-lg font-extrabold text-gray-950">
                  Pilih tiket
                </h2>
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Detail support akan tampil di sini.
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
