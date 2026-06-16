"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  Headphones,
  LifeBuoy,
  Mail,
  MessageCircle,
  PackageCheck,
  Paperclip,
  ReceiptText,
  RefreshCcw,
  Send,
  ShieldCheck,
  TicketCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { StateCard } from "@/components/ui-state";
import { useRealtimePolling } from "@/components/use-realtime-polling";

type SupportMode = "ticket" | "form";
type SupportCategory = "ORDER" | "REFUND" | "PAYMENT" | "ACCOUNT" | "OTHER";
type SupportTicketStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
type SupportPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type SupportAttachment = {
  id: string;
  label: string | null;
  asset: {
    id: string;
    url: string;
    pathname: string;
    contentType: string | null;
    size: number | null;
  };
};

type SupportThreadMessage = {
  id: string;
  senderRole: "CUSTOMER" | "OWNER" | "ADMIN";
  body: string;
  createdAt: string;
  sender: {
    name: string;
    email: string;
    role: string;
  } | null;
  attachments: SupportAttachment[];
};

type SupportTicket = {
  id: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  adminNote: string | null;
  orderCode: string | null;
  slaState: string;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
  messages: SupportThreadMessage[];
  attachments: SupportAttachment[];
  order: {
    orderCode: string;
    status: string;
    restaurant: {
      name: string;
    };
  } | null;
};

type ChatMessage = {
  id: string;
  source: "system" | "user";
  text: string;
  time: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "intro",
    source: "system",
    text: "Kirim masalah singkat di sini. Sistem akan membuat tiket support real untuk admin.",
    time: "Sekarang",
  },
];

const categoryLabel: Record<SupportCategory, string> = {
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

const priorityLabel: Record<SupportPriority, string> = {
  HIGH: "Tinggi",
  LOW: "Rendah",
  NORMAL: "Normal",
  URGENT: "Urgent",
};

const priorityClassName: Record<SupportPriority, string> = {
  HIGH: "bg-orange-50 text-orange-700",
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-50 text-blue-700",
  URGENT: "bg-red-50 text-red-700",
};

const slaLabel: Record<string, string> = {
  DONE: "Selesai",
  FIRST_RESPONSE_OVERDUE: "Respons terlambat",
  IN_SLA: "Dalam SLA",
  RESOLUTION_OVERDUE: "Penyelesaian terlambat",
  WAITING_FIRST_RESPONSE: "Menunggu respons",
};

const quickTopics: Array<{
  title: string;
  category: SupportCategory;
  description: string;
  icon: typeof PackageCheck;
}> = [
  {
    title: "Pesanan & Pickup",
    category: "ORDER",
    description: "Tanya status order, QR, atau lokasi restoran.",
    icon: PackageCheck,
  },
  {
    title: "Refund",
    category: "REFUND",
    description: "Laporkan makanan tidak sesuai atau toko tutup.",
    icon: RefreshCcw,
  },
  {
    title: "Pembayaran",
    category: "PAYMENT",
    description: "Cek struk, metode bayar, atau transaksi gagal.",
    icon: ReceiptText,
  },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CustomerSupportPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SupportMode>("ticket");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [category, setCategory] = useState<SupportCategory>("ORDER");
  const [priority, setPriority] = useState<SupportPriority>("NORMAL");
  const [subject, setSubject] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketFiles, setTicketFiles] = useState<File[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [createdTicketId, setCreatedTicketId] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const hasValidForm = subject.trim().length >= 4 && ticketMessage.trim().length >= 12;
  const latestTickets = useMemo(() => tickets.slice(0, 4), [tickets]);
  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ??
    latestTickets[0] ??
    null;

  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true);

    try {
      const response = await fetch("/api/support", { cache: "no-store" });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        tickets?: SupportTicket[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Tiket support gagal dimuat.");
      }

      setTickets(data.tickets ?? []);
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Tiket support gagal dimuat.",
      });
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useRealtimePolling({
    enabled: true,
    intervalMs: 10000,
    onPoll: loadTickets,
  });

  useEffect(() => {
    if (!selectedTicketId && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [selectedTicketId, tickets]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    const orderParam = params.get("order");

    if (
      categoryParam === "ORDER" ||
      categoryParam === "REFUND" ||
      categoryParam === "PAYMENT" ||
      categoryParam === "ACCOUNT" ||
      categoryParam === "OTHER"
    ) {
      setCategory(categoryParam);
      setMode("form");
    }

    if (orderParam) {
      const normalizedOrderCode = orderParam.trim().toUpperCase();
      setOrderCode(normalizedOrderCode);

      if (categoryParam === "REFUND") {
        setSubject(`Konsultasi refund ${normalizedOrderCode}`);
        setTicketMessage(
          `Saya ingin menanyakan proses refund untuk order ${normalizedOrderCode}.`,
        );
      }
    }
  }, []);

  const uploadSupportFiles = async (files: File[], ticketId?: string) => {
    const uploadedAssetIds: string[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "support");
      formData.set("entityType", "support_ticket");

      if (ticketId) {
        formData.set("entityId", ticketId);
      }

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        asset?: { id: string };
      };

      if (!response.ok || !data.ok || !data.asset) {
        throw new Error(data.message || "Upload lampiran gagal.");
      }

      uploadedAssetIds.push(data.asset.id);
    }

    return uploadedAssetIds;
  };

  const createTicket = async (payload: {
    category: SupportCategory;
    subject: string;
    message: string;
    priority?: SupportPriority;
    orderCode?: string;
    files?: File[];
  }) => {
    const attachmentAssetIds = payload.files?.length
      ? await uploadSupportFiles(payload.files)
      : [];
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: payload.category,
        subject: payload.subject,
        message: payload.message,
        priority: payload.priority,
        orderCode: payload.orderCode,
        attachmentAssetIds,
      }),
    });
    const data = (await response.json()) as {
      ok: boolean;
      message?: string;
      ticket?: SupportTicket;
    };

    if (!response.ok || !data.ok || !data.ticket) {
      throw new Error(data.message || "Tiket support gagal dibuat.");
    }

    setTickets((currentTickets) => [data.ticket as SupportTicket, ...currentTickets]);
    setCreatedTicketId(data.ticket.id);
    setSelectedTicketId(data.ticket.id);

    return data.ticket;
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 12 || isSubmitting) {
      setNotice({
        type: "error",
        message: "Pesan tiket cepat minimal 12 karakter.",
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const ticket = await createTicket({
        category: "OTHER",
        subject: "Tiket cepat dari support",
        message: trimmedMessage,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `user-${Date.now()}`,
          source: "user",
          text: trimmedMessage,
          time: "Sekarang",
        },
        {
          id: `system-${ticket.id}`,
          source: "system",
          text: `Tiket ${ticket.id.slice(0, 8).toUpperCase()} dibuat dan masuk ke admin.`,
          time: "Sekarang",
        },
      ]);
      setMessage("");
      setNotice({
        type: "success",
        message: "Tiket support berhasil dibuat.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Tiket support gagal dibuat.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTicketSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidForm || isSubmitting) {
      setNotice({
        type: "error",
        message: "Isi subjek minimal 4 karakter dan detail minimal 12 karakter.",
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      await createTicket({
        category,
        subject: subject.trim(),
        message: ticketMessage.trim(),
        priority,
        orderCode: orderCode.trim() || undefined,
        files: ticketFiles,
      });
      setSubject("");
      setOrderCode("");
      setTicketMessage("");
      setTicketFiles([]);
      setPriority("NORMAL");
      setNotice({
        type: "success",
        message: "Tiket support berhasil dikirim ke admin.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Tiket support gagal dibuat.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTicket || replyMessage.trim().length < 2 || isReplying) {
      setNotice({
        type: "error",
        message: "Balasan minimal 2 karakter.",
      });
      return;
    }

    setIsReplying(true);
    setNotice(null);

    try {
      const attachmentAssetIds = replyFiles.length
        ? await uploadSupportFiles(replyFiles, selectedTicket.id)
        : [];
      const response = await fetch(
        `/api/support/${selectedTicket.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: replyMessage.trim(),
            attachmentAssetIds,
          }),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        ticket?: SupportTicket;
      };

      if (!response.ok || !data.ok || !data.ticket) {
        throw new Error(data.message || "Balasan support gagal dikirim.");
      }

      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === data.ticket!.id ? data.ticket! : ticket,
        ),
      );
      setReplyMessage("");
      setReplyFiles([]);
      setNotice({
        type: "success",
        message: "Balasan support terkirim.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Balasan support gagal dikirim.",
      });
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-5 pt-10 pb-5 shadow-sm sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </button>
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="min-h-11 rounded-full bg-emerald-50 px-4 py-2 text-[10px] font-extrabold tracking-wider text-emerald-600 uppercase"
            >
              Refresh
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
              <Headphones size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-gray-950">
                Support Center
              </h1>
              <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                Buat tiket support untuk pesanan, refund, pembayaran, dan akun.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("ticket")}
              className={`rounded-xl py-2.5 text-sm font-extrabold transition-colors ${
                mode === "ticket"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Tiket Cepat
            </button>
            <button
              type="button"
              onClick={() => setMode("form")}
              className={`rounded-xl py-2.5 text-sm font-extrabold transition-colors ${
                mode === "form"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Form Detail
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-40 [scrollbar-width:none] sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8 [&::-webkit-scrollbar]:hidden">
          {notice ? (
            <div
              className={`mb-5 rounded-2xl border p-4 text-sm font-bold ${
                notice.type === "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              {notice.message}
            </div>
          ) : null}

          {createdTicketId ? (
            <div className="mb-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex gap-3">
                <TicketCheck
                  size={21}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />
                <div>
                  <p className="text-sm font-extrabold text-emerald-950">
                    Tiket aktif: {createdTicketId.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-xs leading-5 font-semibold text-emerald-700">
                    Admin akan membalas lewat notifikasi support di akun kamu.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {quickTopics.map(({ title, description, icon: Icon, category: topic }) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  setMode("form");
                  setCategory(topic);
                  setSubject(title);
                  setPriority(topic === "REFUND" || topic === "PAYMENT" ? "HIGH" : "NORMAL");
                }}
                className="flex items-center gap-4 rounded-[24px] border border-gray-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-emerald-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold text-gray-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                    {description}
                  </p>
                </div>
              </button>
            ))}
          </section>

          {mode === "ticket" ? (
            <section className="space-y-4">
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <p className="text-xs leading-5 font-semibold text-emerald-800">
                    Tiket cepat akan langsung masuk ke admin. Untuk refund,
                    tetap lampirkan bukti dari halaman pengajuan refund.
                  </p>
                </div>
              </div>

              {messages.map((chat) => {
                const isUser = chat.source === "user";

                return (
                  <article
                    key={chat.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-[24px] p-4 shadow-sm ${
                        isUser
                          ? "rounded-br-md bg-emerald-500 text-white"
                          : "rounded-bl-md border border-gray-100 bg-white text-gray-950"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        {isUser ? (
                          <MessageCircle size={15} />
                        ) : (
                          <LifeBuoy size={15} />
                        )}
                        <span className="text-xs font-extrabold">
                          {isUser ? "Kamu" : "Sistem Support"}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-6 font-medium ${
                          isUser ? "text-white" : "text-current"
                        }`}
                      >
                        {chat.text}
                      </p>
                      <p
                        className={`mt-2 text-[10px] font-bold ${
                          isUser ? "text-emerald-50" : "text-gray-400"
                        }`}
                      >
                        {chat.time}
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <form className="space-y-4" onSubmit={handleTicketSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="support-category"
                      className="mb-2 block text-sm font-extrabold text-gray-800"
                    >
                      Kategori
                    </label>
                    <select
                      id="support-category"
                      value={category}
                      onChange={(event) =>
                        setCategory(event.target.value as SupportCategory)
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      <option value="ORDER">Pesanan</option>
                      <option value="REFUND">Refund</option>
                      <option value="PAYMENT">Pembayaran</option>
                      <option value="ACCOUNT">Akun</option>
                      <option value="OTHER">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="support-order"
                      className="mb-2 block text-sm font-extrabold text-gray-800"
                    >
                      Order ID
                    </label>
                    <input
                      id="support-order"
                      type="text"
                      value={orderCode}
                      onChange={(event) => setOrderCode(event.target.value)}
                      placeholder="Opsional"
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="support-priority"
                    className="mb-2 block text-sm font-extrabold text-gray-800"
                  >
                    Prioritas
                  </label>
                  <select
                    id="support-priority"
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as SupportPriority)
                    }
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="LOW">Rendah</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="support-subject"
                    className="mb-2 block text-sm font-extrabold text-gray-800"
                  >
                    Subjek
                  </label>
                  <input
                    id="support-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Contoh: Restoran tutup saat pickup"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-message"
                    className="mb-2 block text-sm font-extrabold text-gray-800"
                  >
                    Detail Masalah
                  </label>
                  <textarea
                    id="support-message"
                    value={ticketMessage}
                    onChange={(event) => setTicketMessage(event.target.value)}
                    placeholder="Tulis kronologi singkat agar tim support bisa membantu lebih cepat..."
                    className="min-h-36 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                  <label
                    htmlFor="support-attachments"
                    className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold text-gray-800"
                  >
                    <span className="flex items-center gap-2">
                      <Paperclip size={17} className="text-emerald-600" />
                      Lampiran bukti
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      Maks 5 file
                    </span>
                  </label>
                  <input
                    id="support-attachments"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={(event) =>
                      setTicketFiles(
                        Array.from(event.target.files ?? []).slice(0, 5),
                      )
                    }
                    className="mt-3 w-full text-xs font-semibold text-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-gray-700"
                  />
                  {ticketFiles.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticketFiles.map((file) => (
                        <span
                          key={`${file.name}-${file.size}`}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600"
                        >
                          {file.name}
                          <button
                            type="button"
                            onClick={() =>
                              setTicketFiles((currentFiles) =>
                                currentFiles.filter(
                                  (item) =>
                                    item.name !== file.name ||
                                    item.size !== file.size,
                                ),
                              )
                            }
                            aria-label={`Hapus ${file.name}`}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={!hasValidForm || isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Mail size={18} />
                  {isSubmitting ? "Mengirim Tiket..." : "Kirim Tiket Support"}
                </button>
              </form>
            </section>
          )}

          <section className="mt-6 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-950">
                  Riwayat Support
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Tiket yang pernah kamu kirim ke admin.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-600">
                {tickets.length}
              </span>
            </div>

            {isLoadingTickets ? (
              <StateCard
                title="Memuat tiket"
                description="Mengambil tiket support dan percakapan terbaru."
                variant="loading"
                size="sm"
              />
            ) : latestTickets.length === 0 ? (
              <StateCard
                title="Belum ada tiket support"
                description="Tiket akan muncul setelah kamu mengirim laporan."
                variant="empty"
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {latestTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      selectedTicket?.id === ticket.id
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
                          {categoryLabel[ticket.category]} -{" "}
                          {formatTime(ticket.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClassName[ticket.status]}`}
                      >
                        {statusLabel[ticket.status]}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${priorityClassName[ticket.priority]}`}
                      >
                        {priorityLabel[ticket.priority]}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-gray-500">
                        {slaLabel[ticket.slaState] ?? ticket.slaState}
                      </span>
                    </div>
                    {ticket.orderCode || ticket.order?.orderCode ? (
                      <p className="mt-2 text-xs font-bold text-emerald-700">
                        Order {ticket.orderCode || ticket.order?.orderCode}
                      </p>
                    ) : null}
                    {ticket.adminNote ? (
                      <p className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 font-semibold text-gray-600">
                        Admin: {ticket.adminNote}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedTicket ? (
            <section className="mt-6 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClassName[selectedTicket.status]}`}
                    >
                      {statusLabel[selectedTicket.status]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${priorityClassName[selectedTicket.priority]}`}
                    >
                      {priorityLabel[selectedTicket.priority]}
                    </span>
                  </div>
                  <h2 className="mt-3 text-base font-extrabold text-gray-950">
                    {selectedTicket.subject}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    SLA: {slaLabel[selectedTicket.slaState] ?? selectedTicket.slaState}
                    {selectedTicket.firstResponseDueAt
                      ? ` - respons ${formatTime(selectedTicket.firstResponseDueAt)}`
                      : ""}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500">
                  {selectedTicket.assignee
                    ? `Admin: ${selectedTicket.assignee.name}`
                    : "Belum ditugaskan"}
                </div>
              </div>

              <div className="space-y-3">
                {selectedTicket.messages.map((threadMessage) => {
                  const isCustomer = threadMessage.senderRole === "CUSTOMER";

                  return (
                    <article
                      key={threadMessage.id}
                      className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-[24px] p-4 ${
                          isCustomer
                            ? "rounded-br-md bg-emerald-500 text-white"
                            : "rounded-bl-md bg-gray-50 text-gray-900"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-extrabold">
                            {isCustomer
                              ? "Kamu"
                              : threadMessage.sender?.name ?? "Admin Support"}
                          </p>
                          <p
                            className={`text-[10px] font-bold ${
                              isCustomer ? "text-emerald-50" : "text-gray-400"
                            }`}
                          >
                            {formatTime(threadMessage.createdAt)}
                          </p>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6 font-medium">
                          {threadMessage.body}
                        </p>
                        {threadMessage.attachments.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {threadMessage.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.asset.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                                  isCustomer
                                    ? "bg-white/15 text-white"
                                    : "bg-white text-gray-600"
                                }`}
                              >
                                <Paperclip size={12} />
                                Lampiran
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              {selectedTicket.status === "CLOSED" ? (
                <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-500">
                  Tiket ini sudah ditutup. Buat tiket baru jika masih butuh bantuan.
                </div>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={handleReplySubmit}>
                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder="Balas thread support..."
                    className="min-h-28 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-medium text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      onChange={(event) =>
                        setReplyFiles(
                          Array.from(event.target.files ?? []).slice(0, 5),
                        )
                      }
                      className="text-xs font-semibold text-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-gray-700"
                    />
                    <button
                      type="submit"
                      disabled={replyMessage.trim().length < 2 || isReplying}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <Send size={17} />
                      {isReplying ? "Mengirim..." : "Balas"}
                    </button>
                  </div>
                  {replyFiles.length > 0 ? (
                    <p className="text-xs font-bold text-gray-500">
                      {replyFiles.length} lampiran siap dikirim.
                    </p>
                  ) : null}
                </form>
              )}
            </section>
          ) : null}

          <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/orders"
              className="rounded-2xl border border-gray-100 bg-white p-4 text-sm font-extrabold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Riwayat Order
            </Link>
            <Link
              href="/orders"
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
            >
              Refund
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>

        {mode === "ticket" ? (
          <form
            onSubmit={handleSendMessage}
            className="absolute right-0 bottom-0 left-0 z-20 border-t border-gray-100 bg-white px-5 py-4 sm:px-6"
          >
            <div className="mx-auto flex w-full max-w-5xl items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2 focus-within:border-emerald-500 focus-within:bg-white">
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tulis masalah singkat..."
                className="min-h-11 min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={message.trim().length < 12 || isSubmitting}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                aria-label="Kirim tiket cepat"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
