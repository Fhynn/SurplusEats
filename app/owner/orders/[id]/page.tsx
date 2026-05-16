"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Phone,
  QrCode,
  ReceiptText,
  Send,
  ShoppingBag,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type OwnerOrderStatus = "new" | "preparing" | "ready" | "completed" | "rejected";
type FlowOrderStatus = Exclude<OwnerOrderStatus, "rejected">;
type ActiveModal = "chat" | "reject" | null;

type ChatMessage = {
  id: number;
  sender: "owner" | "customer" | "system";
  text: string;
  time: string;
};

const orders = [
  {
    id: "SFM-99A2X",
    customer: "Alfhin Pratama",
    phone: "0812-3456-7890",
    pickupName: "Alfhin",
    pickupCode: "7721",
    status: "new",
    time: "18:30",
    pickupWindow: "19:00 - 20:00 WIB",
    address: "Pickup di kasir Bakehouse Bakery, Jl. Sudirman No. 45",
    items: [
      { name: "Roti Sourdough", qty: 1, price: 15000 },
      { name: "Croissant Butter", qty: 2, price: 15000 },
    ],
    note: "Tolong pisahkan roti manis dan asin.",
    payment: "GoPay",
  },
  {
    id: "SFM-88B1Y",
    customer: "Budi Santoso",
    phone: "0821-8877-2211",
    pickupName: "Budi",
    pickupCode: "2190",
    status: "new",
    time: "18:18",
    pickupWindow: "20:00 - 21:00 WIB",
    address: "Pickup di kasir Bakehouse Bakery, Jl. Sudirman No. 45",
    items: [
      { name: "Nasi Ayam Bakar", qty: 2, price: 12000 },
      { name: "Es Teh", qty: 1, price: 0 },
    ],
    note: undefined,
    payment: "QRIS",
  },
  {
    id: "SFM-77C0Z",
    customer: "Siti Aminah",
    phone: "0852-4410-7721",
    pickupName: "Siti",
    pickupCode: "7721",
    status: "preparing",
    time: "18:02",
    pickupWindow: "19:30 - 20:30 WIB",
    address: "Pickup di kasir Bakehouse Bakery, Jl. Sudirman No. 45",
    items: [
      { name: "Assorted Sushi", qty: 1, price: 35000 },
      { name: "Miso Soup", qty: 1, price: 0 },
    ],
    note: "Pickup atas nama Siti, nomor belakang 7721.",
    payment: "GoPay",
  },
] as const;

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const statusMeta = {
  new: {
    label: "Pesanan Baru",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ShoppingBag,
  },
  preparing: {
    label: "Sedang Disiapkan",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: ChefHat,
  },
  ready: {
    label: "Siap Diambil",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: PackageCheck,
  },
  completed: {
    label: "Selesai",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Ditolak",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: X,
  },
} as const;

const timeline = [
  {
    status: "new",
    title: "Pesanan Masuk",
    description: "Customer sudah membayar dan menunggu konfirmasi toko.",
    time: "18:30",
  },
  {
    status: "preparing",
    title: "Sedang Disiapkan",
    description: "Tim toko menyiapkan dan mengemas pesanan.",
    time: "19:05",
  },
  {
    status: "ready",
    title: "Siap Diambil",
    description: "Customer bisa mengambil pesanan dengan QR pickup.",
    time: "19:30",
  },
  {
    status: "completed",
    title: "Pickup Selesai",
    description: "QR sudah diverifikasi dan order selesai.",
    time: "20:00",
  },
] as const;

const statusOrder: FlowOrderStatus[] = ["new", "preparing", "ready", "completed"];

const rejectReasons = [
  "Stok surplus sudah habis",
  "Toko sedang tutup lebih awal",
  "Produk tidak layak jual",
  "Kesalahan stok sistem",
] as const;

export default function OwnerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const order = useMemo(() => {
    return orders.find((item) => item.id === params.id) ?? orders[0];
  }, [params.id]);
  const [status, setStatus] = useState<OwnerOrderStatus>(
    order.status as OwnerOrderStatus,
  );
  const [adminNote, setAdminNote] = useState("");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "system",
      text: `Order ${order.id} dibuat dan customer menunggu update dari toko.`,
      time: order.time,
    },
    {
      id: 2,
      sender: "customer",
      text: order.note ?? "Halo, apakah pesanan saya sudah bisa diambil sesuai jadwal?",
      time: "Baru saja",
    },
  ]);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const total = order.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const currentStatusIndex =
    status === "rejected" ? -1 : statusOrder.indexOf(status);
  const StatusIcon = statusMeta[status].icon;

  const advanceStatus = () => {
    if (status === "rejected") {
      return;
    }

    const nextStatus = statusOrder[currentStatusIndex + 1];

    if (nextStatus) {
      setStatus(nextStatus);
    }
  };

  const handleSendMessage = () => {
    const trimmedMessage = chatDraft.trim();

    if (!trimmedMessage) {
      return;
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: currentMessages.length + 1,
        sender: "owner",
        text: trimmedMessage,
        time: "Sekarang",
      },
      {
        id: currentMessages.length + 2,
        sender: "system",
        text: "Pesan owner tercatat di prototype UI.",
        time: "Sekarang",
      },
    ]);
    setChatDraft("");
  };

  const handleRejectOrder = () => {
    if (!rejectReason) {
      return;
    }

    setStatus("rejected");
    setAdminNote(
      `Order ditolak: ${rejectReason}${rejectNote.trim() ? ` - ${rejectNote.trim()}` : ""}`,
    );
    setActiveModal(null);
    setRejectReason("");
    setRejectNote("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-gray-900">
      <header className="flex flex-col gap-4 rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/owner/dashboard?tab=orders"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Kembali ke daftar pesanan"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="font-mono text-xs font-extrabold tracking-wider text-emerald-600 uppercase">
              {order.id}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950">
              Detail Pesanan
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Pantau detail customer, item, catatan, pembayaran, dan status pickup.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold ${statusMeta[status].className}`}
        >
          <StatusIcon size={16} />
          {statusMeta[status].label}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <main className="space-y-6">
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <article className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-gray-950">
                  Customer
                </h2>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <UserRound size={24} />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                    Nama
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-gray-950">
                    {order.customer}
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
                  <Phone size={18} className="text-emerald-500" />
                  <span className="text-sm font-bold text-gray-700">
                    {order.phone}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
                  <QrCode size={18} className="text-gray-500" />
                  <span className="text-sm font-bold text-gray-700">
                    Pickup code {order.pickupCode}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-gray-950">
                  Pickup
                </h2>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Timer size={24} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
                  <Clock size={18} className="text-amber-500" />
                  <span className="text-sm font-bold text-gray-700">
                    {order.pickupWindow}
                  </span>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-blue-500" />
                  <span className="text-sm leading-6 font-bold text-gray-700">
                    {order.address}
                  </span>
                </div>
              </div>
            </article>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-6">
              <h2 className="text-lg font-extrabold text-gray-950">
                Item Pesanan
              </h2>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Pastikan jumlah dan varian sesuai sebelum customer pickup.
              </p>
            </div>
            <div className="p-2">
              {order.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-4 rounded-2xl p-4 transition-colors hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-extrabold text-gray-950">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      Qty {item.qty}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-600">
                    {formatRp(item.qty * item.price)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 p-6">
              <span className="text-sm font-bold text-gray-500">
                Total Dibayar
              </span>
              <span className="text-xl font-extrabold text-gray-950">
                {formatRp(total)}
              </span>
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-extrabold text-gray-950">
              Catatan & Internal Note
            </h2>
            {order.note ? (
              <div className="mb-5 rounded-[24px] border border-amber-100 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-500" />
                  <p className="text-sm leading-6 font-semibold text-amber-900">
                    {order.note}
                  </p>
                </div>
              </div>
            ) : null}
            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              rows={4}
              placeholder="Tambahkan catatan internal untuk staf pickup..."
              className="w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-gray-100 bg-gray-900 p-6 text-white shadow-xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-gray-400">Pembayaran</p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {formatRp(total)}
                </h2>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 text-emerald-300">
                <ReceiptText size={23} />
              </div>
            </div>
            <div className="space-y-3 rounded-[24px] bg-white/10 p-4">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400">Metode</span>
                <span>{order.payment}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400">Masuk Saldo</span>
                <span className="text-emerald-300">{formatRp(total - 2000)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400">Fee Platform</span>
                <span>{formatRp(2000)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-extrabold text-gray-950">
              Timeline
            </h2>
            <div className="relative space-y-5 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-0.5 before:bg-gray-100">
              {timeline.map((step) => {
                const isDone =
                  status !== "rejected" &&
                  statusOrder.indexOf(step.status as FlowOrderStatus) <=
                    currentStatusIndex;

                return (
                  <div key={step.status} className="relative flex gap-4">
                    <div
                      className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white ${
                        isDone ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isDone ? <Check size={15} /> : <Clock size={15} />}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-gray-950">
                          {step.title}
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400">
                          {step.time}
                        </span>
                      </div>
                      <p className="text-xs leading-5 font-medium text-gray-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-extrabold text-gray-950">
              Aksi Cepat
            </h2>
            <div className="space-y-3">
              {status !== "completed" && status !== "rejected" ? (
                <button
                  type="button"
                  onClick={advanceStatus}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                >
                  <PackageCheck size={18} />
                  {status === "new"
                    ? "Terima Order"
                    : status === "preparing"
                      ? "Tandai Siap Diambil"
                      : "Konfirmasi Pickup"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setActiveModal("chat")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <MessageSquareText size={18} />
                Chat Customer
              </button>
              {status === "new" ? (
                <button
                  type="button"
                  onClick={() => setActiveModal("reject")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3.5 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-100"
                >
                  <X size={18} />
                  Tolak Order
                </button>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      {activeModal === "chat" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                  Customer Chat
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                  {order.customer}
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Order {order.id} • {order.pickupWindow}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                aria-label="Tutup chat customer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-6">
              {chatMessages.map((message) => {
                const isOwner = message.sender === "owner";
                const isSystem = message.sender === "system";

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwner ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-[24px] p-4 ${
                        isOwner
                          ? "rounded-br-md bg-emerald-500 text-white"
                          : isSystem
                            ? "rounded-bl-md border border-gray-200 bg-white text-gray-600"
                            : "rounded-bl-md bg-gray-900 text-white"
                      }`}
                    >
                      <p className="text-sm leading-6 font-semibold">
                        {message.text}
                      </p>
                      <p
                        className={`mt-2 text-[10px] font-bold ${
                          isOwner ? "text-emerald-50" : "text-gray-400"
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-100 bg-white p-5">
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2 focus-within:border-emerald-500 focus-within:bg-white">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Tulis pesan untuk customer..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!chatDraft.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                  aria-label="Kirim pesan"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeModal === "reject" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="bg-red-50/60 px-6 pt-8 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <X size={30} />
              </div>
              <h2 className="text-xl font-extrabold text-gray-950">
                Tolak Order?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 font-semibold text-gray-600">
                Customer akan menerima update bahwa order {order.id} tidak bisa
                diproses oleh toko.
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <p className="mb-3 text-sm font-extrabold text-gray-800">
                  Alasan Penolakan
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {rejectReasons.map((reason) => {
                    const isSelected = rejectReason === reason;

                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setRejectReason(reason)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
                          isSelected
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-gray-800">
                  Catatan Tambahan
                </span>
                <textarea
                  value={rejectNote}
                  onChange={(event) => setRejectNote(event.target.value)}
                  rows={4}
                  placeholder="Tulis detail tambahan untuk internal atau customer..."
                  className="w-full resize-none rounded-[22px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setRejectReason("");
                  setRejectNote("");
                }}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectOrder}
                disabled={!rejectReason}
                className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-200"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
