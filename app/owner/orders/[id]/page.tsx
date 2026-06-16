"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Download,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Phone,
  Printer,
  QrCode,
  ReceiptText,
  Send,
  ShoppingBag,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useRealtimePolling } from "@/components/use-realtime-polling";
import {
  type PickupScannerResult,
  showPickupCodeScanner,
  showSweetError,
  showSweetToast,
} from "@/lib/sweet-alert";

type OwnerOrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "completed"
  | "noShow"
  | "rejected";
type FlowOrderStatus = Exclude<OwnerOrderStatus, "rejected" | "noShow">;
type ActiveModal = "chat" | "reject" | null;

type ApiOrderStatus =
  | "PENDING"
  | "PAYMENT_FAILED"
  | "PAID"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED"
  | "REFUNDED";

type ChatMessage = {
  id: string;
  sender: "owner" | "customer" | "system";
  text: string;
  time: string;
};

type ApiOrderMessage = {
  id: string;
  body: string;
  senderRole: "CUSTOMER" | "OWNER" | "ADMIN";
  createdAt: string;
  sender: {
    name: string;
    role: "CUSTOMER" | "OWNER" | "ADMIN";
  };
};

type ApiOwnerOrderDetail = {
  orderCode: string;
  status: ApiOrderStatus;
  paymentStatus: string;
  createdAt: string;
  pickupCode: string | null;
  pickupTime: string | null;
  note: string | null;
  serviceFee: number;
  taxFee: number;
  platformFee: number;
  total: number;
  pickupVerifiedAt: string | null;
  pickupVerifiedBy: string | null;
  pickupVerificationMethod: string | null;
  customer: {
    name: string;
    phone: string | null;
  };
  restaurant: {
    name: string;
    address: string;
    pickupStart: string | null;
    pickupEnd: string | null;
  };
  items: {
    menuNameSnapshot: string;
    quantity: number;
    priceSnapshot: number;
  }[];
};

type OwnerOrderDetail = {
  id: string;
  customer: string;
  phone: string;
  pickupCode: string;
  status: OwnerOrderStatus;
  time: string;
  pickupWindow: string;
  address: string;
  items: {
    name: string;
    qty: number;
    price: number;
  }[];
  note?: string;
  payment: string;
  serviceFee: number;
  taxFee: number;
  platformFee: number;
  total: number;
  pickupVerifiedAt: string | null;
  pickupVerifiedBy: string | null;
  pickupVerificationMethod: string | null;
};

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatOrderDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPickupVerificationMethod(method: string | null) {
  if (method === "SCANNER") {
    return "QR scanner";
  }

  if (method === "MANUAL") {
    return "Kode manual";
  }

  if (method === "SCANNER_OR_MANUAL") {
    return "Scanner/manual";
  }

  return "Belum ada metode";
}

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mapApiOrderMessage(message: ApiOrderMessage): ChatMessage {
  return {
    id: message.id,
    sender:
      message.senderRole === "OWNER"
        ? "owner"
        : message.senderRole === "CUSTOMER"
          ? "customer"
          : "system",
    text: message.body,
    time: formatChatTime(message.createdAt),
  };
}

function mapApiStatusToOwner(status: ApiOrderStatus): OwnerOrderStatus {
  switch (status) {
    case "PREPARING":
      return "preparing";
    case "READY":
      return "ready";
    case "COMPLETED":
      return "completed";
    case "NO_SHOW":
      return "noShow";
    case "CANCELLED":
    case "REFUNDED":
      return "rejected";
    default:
      return "new";
  }
}

const apiStatusByOwnerStatus: Record<FlowOrderStatus, ApiOrderStatus> = {
  new: "CONFIRMED",
  preparing: "PREPARING",
  ready: "READY",
  completed: "COMPLETED",
};

function mapApiOrderDetail(order: ApiOwnerOrderDetail): OwnerOrderDetail {
  const pickupWindow =
    order.pickupTime
      ? formatOrderTime(order.pickupTime)
      : order.restaurant.pickupStart && order.restaurant.pickupEnd
        ? `${order.restaurant.pickupStart} - ${order.restaurant.pickupEnd} WIB`
        : "Belum diatur";

  return {
    id: order.orderCode,
    customer: order.customer.name,
    phone: order.customer.phone ?? "-",
    pickupCode: order.pickupCode ?? "-",
    status: mapApiStatusToOwner(order.status),
    time: formatOrderTime(order.createdAt),
    pickupWindow,
    address: `Pickup di ${order.restaurant.name}, ${order.restaurant.address}`,
    items: order.items.map((item) => ({
      name: item.menuNameSnapshot,
      qty: item.quantity,
      price: item.priceSnapshot,
    })),
    note: order.note ?? undefined,
    payment: order.paymentStatus,
    serviceFee: order.serviceFee ?? 0,
    taxFee: order.taxFee ?? 0,
    platformFee: order.platformFee ?? 0,
    total: order.total,
    pickupVerifiedAt: order.pickupVerifiedAt,
    pickupVerifiedBy: order.pickupVerifiedBy,
    pickupVerificationMethod: order.pickupVerificationMethod,
  };
}

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
  noShow: {
    label: "Tidak Diambil",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Timer,
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
  },
  {
    status: "preparing",
    title: "Sedang Disiapkan",
    description: "Tim toko menyiapkan dan mengemas pesanan.",
  },
  {
    status: "ready",
    title: "Siap Diambil",
    description: "Customer bisa mengambil pesanan dengan QR pickup.",
  },
  {
    status: "completed",
    title: "Pickup Selesai",
    description: "QR sudah diverifikasi dan order selesai.",
  },
] as const;

const statusOrder: FlowOrderStatus[] = ["new", "preparing", "ready", "completed"];
const terminalOwnerOrderStatuses = new Set<OwnerOrderStatus>([
  "completed",
  "noShow",
  "rejected",
]);

const rejectReasons = [
  "Stok surplus sudah habis",
  "Toko sedang tutup lebih awal",
  "Produk tidak layak jual",
  "Kesalahan stok sistem",
] as const;

export default function OwnerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OwnerOrderDetail | null>(null);
  const [status, setStatus] = useState<OwnerOrderStatus>("new");
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const loadOrder = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingOrder(true);
      }

      try {
        const response = await fetch(`/api/orders/${params.id}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          order?: ApiOwnerOrderDetail;
        };

        if (!response.ok || !data.ok || !data.order) {
          throw new Error(data.message || "Order tidak ditemukan.");
        }

        const nextOrder = mapApiOrderDetail(data.order);
        setOrder(nextOrder);
        setStatus(nextOrder.status);
        setOrderNotice(null);
      } catch (error) {
        if (!silent) {
          setOrder(null);
          setOrderNotice(
            error instanceof Error ? error.message : "Order tidak ditemukan.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoadingOrder(false);
        }
      }
    },
    [params.id],
  );

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const shouldPollOrder =
    !order || !terminalOwnerOrderStatuses.has(order.status);

  useRealtimePolling({
    enabled: shouldPollOrder && !isUpdatingStatus,
    intervalMs: status === "ready" ? 6000 : 8000,
    onPoll: () => loadOrder({ silent: true }),
  });

  const loadMessages = useCallback(
    async (
      orderCode: string,
      { silent = false }: { silent?: boolean } = {},
    ) => {
      if (!silent) {
        setIsLoadingMessages(true);
      }

      try {
        const response = await fetch(`/api/orders/${orderCode}/messages`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          messages?: ApiOrderMessage[];
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Pesan order gagal dimuat.");
        }

        setChatMessages((data.messages ?? []).map(mapApiOrderMessage));
      } catch (error) {
        if (!silent) {
          setOrderNotice(
            error instanceof Error ? error.message : "Pesan order gagal dimuat.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoadingMessages(false);
        }
      }
    },
    [],
  );

  const orderCode = order?.id ?? null;

  useEffect(() => {
    if (!orderCode) {
      return;
    }

    void loadMessages(orderCode);
  }, [loadMessages, orderCode]);

  useRealtimePolling({
    enabled: Boolean(orderCode && activeModal === "chat"),
    intervalMs: 7000,
    onPoll: () =>
      orderCode ? loadMessages(orderCode, { silent: true }) : undefined,
  });

  if (isLoadingOrder) {
    return (
      <div className="mx-auto max-w-6xl rounded-[32px] border border-gray-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
        <h1 className="text-xl font-extrabold text-gray-950">
          Memuat detail pesanan
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Detail pesanan sedang dimuat.
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-6xl rounded-[32px] border border-red-100 bg-red-50 p-10 text-center shadow-sm">
        <h1 className="text-xl font-extrabold text-red-700">
          Order tidak ditemukan
        </h1>
        <p className="mt-2 text-sm font-bold text-red-600">
          {orderNotice ?? "ID order tidak tersedia untuk owner yang sedang login."}
        </p>
        <Link
          href="/owner/dashboard?tab=orders"
          className="mt-6 inline-flex rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white"
        >
          Kembali ke daftar pesanan
        </Link>
      </div>
    );
  }

  const total = order.total;
  const customerPlatformFee = order.serviceFee + order.taxFee;
  const merchantGrossAmount = Math.max(0, total - customerPlatformFee);
  const merchantCommission = Math.min(merchantGrossAmount, order.platformFee);
  const ownerNetAmount = Math.max(0, merchantGrossAmount - merchantCommission);
  const currentStatusIndex =
    status === "rejected" || status === "noShow"
      ? -1
      : statusOrder.indexOf(status);
  const StatusIcon = statusMeta[status].icon;

  const updateOrderStatus = async (
    nextStatus: ApiOrderStatus,
    pickupCode?: string,
    pickupVerificationMethod?: PickupScannerResult["method"],
  ) => {
    setOrderNotice(null);
    setIsUpdatingStatus(true);

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          pickupCode,
          pickupVerificationMethod:
            nextStatus === "COMPLETED" ? pickupVerificationMethod : undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        order?: ApiOwnerOrderDetail;
      };

      if (!response.ok || !data.ok || !data.order) {
        throw new Error(data.message || "Status order gagal diperbarui.");
      }

      const nextOrder = mapApiOrderDetail(data.order);
      setOrder(nextOrder);
      setStatus(nextOrder.status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const advanceStatus = async () => {
    if (isUpdatingStatus) {
      return;
    }

    if (status === "rejected" || status === "noShow") {
      return;
    }

    const nextStatus = statusOrder[currentStatusIndex + 1];

    if (nextStatus) {
      try {
        let pickupVerification: PickupScannerResult | null = null;

        if (nextStatus === "completed") {
          pickupVerification = await showPickupCodeScanner({
            title: "Verifikasi Pickup",
            text: `Minta customer menunjukkan kode pickup untuk order ${order.id}.`,
            orderId: order.id,
          });

          if (!pickupVerification) {
            return;
          }
        }

        await updateOrderStatus(
          apiStatusByOwnerStatus[nextStatus],
          pickupVerification?.code,
          pickupVerification?.method,
        );
        showSweetToast({
          icon: "success",
          title:
            nextStatus === "completed"
              ? "Pickup berhasil diverifikasi."
              : "Status order diperbarui.",
        });
      } catch (error) {
        void showSweetError({
          title: "Status order gagal diperbarui",
          text:
            error instanceof Error
              ? error.message
              : "Status order gagal diperbarui.",
        });
        setOrderNotice(
          error instanceof Error
            ? error.message
            : "Status order gagal diperbarui.",
        );
      }
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = chatDraft.trim();

    if (!trimmedMessage || isSendingChat) {
      return;
    }

    setIsSendingChat(true);
    setOrderNotice(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: trimmedMessage }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string | ApiOrderMessage;
      };
      const savedMessage = data.message;

      if (
        !response.ok ||
        !data.ok ||
        !savedMessage ||
        typeof savedMessage === "string"
      ) {
        throw new Error(
          typeof savedMessage === "string"
            ? savedMessage
            : "Pesan gagal dikirim.",
        );
      }

      setChatMessages((currentMessages) => [
        ...currentMessages,
        mapApiOrderMessage(savedMessage),
      ]);
      setChatDraft("");
    } catch (error) {
      setOrderNotice(
        error instanceof Error ? error.message : "Pesan gagal dikirim.",
      );
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectReason) {
      return;
    }

    try {
      await updateOrderStatus("CANCELLED");
      setAdminNote(
        `Order ditolak: ${rejectReason}${rejectNote.trim() ? ` - ${rejectNote.trim()}` : ""}`,
      );
      setActiveModal(null);
      setRejectReason("");
      setRejectNote("");
    } catch (error) {
      setOrderNotice(
        error instanceof Error ? error.message : "Order gagal ditolak.",
      );
    }
  };

  const handlePrintReceipt = () => {
    window.print();
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

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/api/orders/${order.id}/receipt`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-100"
          >
            <Download size={17} />
            Download PDF
          </Link>
          <button
            type="button"
            onClick={handlePrintReceipt}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Printer size={17} />
            Cetak Struk
          </button>
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold ${statusMeta[status].className}`}
          >
            <StatusIcon size={16} />
            {statusMeta[status].label}
          </span>
        </div>
      </header>

      {orderNotice ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {orderNotice}
        </div>
      ) : null}

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
                    {status === "completed"
                      ? "Pickup sudah terverifikasi"
                      : status === "noShow"
                        ? "Pickup melewati batas waktu"
                      : "Verifikasi kode pickup dari customer"}
                  </span>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-extrabold tracking-wider text-emerald-500 uppercase">
                    Status Staf Pickup
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-900">
                    {order.pickupVerifiedBy
                      ? `Diverifikasi oleh ${order.pickupVerifiedBy}`
                      : "Belum diverifikasi staf"}
                  </p>
                  {order.pickupVerifiedAt ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      {formatOrderDateTime(order.pickupVerifiedAt)}
                    </p>
                  ) : null}
                  {order.pickupVerificationMethod ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      Metode:{" "}
                      {formatPickupVerificationMethod(
                        order.pickupVerificationMethod,
                      )}
                    </p>
                  ) : null}
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
                <p className="text-sm font-bold text-gray-400">Masuk Saldo</p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {formatRp(ownerNetAmount)}
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
                <span className="text-gray-400">Pendapatan Menu</span>
                <span className="text-emerald-300">{formatRp(merchantGrossAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400">Komisi Platform</span>
                <span>{formatRp(merchantCommission)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-400">Total Customer</span>
                <span>{formatRp(total)}</span>
              </div>
            </div>
          </section>

          <section className="owner-order-print-area rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-dashed border-gray-200 pb-5">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                  ResQFood Receipt
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                  {order.id}
                </h2>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Dibuat {order.time} • {statusMeta[status].label}
                </p>
              </div>
              <ReceiptText size={26} className="text-emerald-500" />
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Customer
                </p>
                <p className="mt-1 font-extrabold text-gray-950">
                  {order.customer}
                </p>
                <p className="text-xs font-semibold text-gray-500">
                  {order.phone}
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                {order.items.map((item) => (
                  <div
                    key={`${item.name}-${item.qty}`}
                    className="flex justify-between gap-4 py-2 text-sm font-bold text-gray-700"
                  >
                    <span>
                      {item.qty}x {item.name}
                    </span>
                    <span>{formatRp(item.qty * item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-dashed border-gray-200 pt-4">
                <div className="flex justify-between font-bold text-gray-500">
                  <span>Pendapatan Menu</span>
                  <span>{formatRp(merchantGrossAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-500">
                  <span>Komisi Platform</span>
                  <span>{formatRp(merchantCommission)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-950">
                  <span>Masuk Saldo</span>
                  <span>{formatRp(ownerNetAmount)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-extrabold tracking-wider text-emerald-500 uppercase">
                  Pickup Verification
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-900">
                  {order.pickupVerifiedBy
                    ? `${order.pickupVerifiedBy} • ${
                        order.pickupVerifiedAt
                          ? formatOrderDateTime(order.pickupVerifiedAt)
                          : "waktu tidak tercatat"
                      } • ${formatPickupVerificationMethod(
                        order.pickupVerificationMethod,
                      )}`
                    : "Belum diverifikasi staf pickup"}
                </p>
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
                  status !== "noShow" &&
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
                          {step.status === "new"
                            ? order.time
                            : isDone
                              ? "Tercatat"
                              : "Menunggu"}
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
              {status !== "completed" &&
              status !== "rejected" &&
              status !== "noShow" ? (
                <button
                  type="button"
                  onClick={advanceStatus}
                  disabled={isUpdatingStatus}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                >
                  {isUpdatingStatus ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <PackageCheck size={18} />
                  )}
                  {isUpdatingStatus
                    ? "Memproses..."
                    : status === "new"
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
                  disabled={isUpdatingStatus}
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
              {isLoadingMessages ? (
                <div className="rounded-2xl bg-white p-5 text-center text-sm font-bold text-gray-500">
                  Memuat pesan order...
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center">
                  <MessageSquareText
                    size={28}
                    className="mx-auto mb-3 text-gray-300"
                  />
                  <p className="text-sm font-extrabold text-gray-900">
                    Belum ada pesan
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Pesan yang dikirim di sini akan tersimpan di database dan
                    mengirim notifikasi ke customer.
                  </p>
                </div>
              ) : (
                chatMessages.map((message) => {
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
                })
              )}
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
                  onClick={() => void handleSendMessage()}
                  disabled={!chatDraft.trim() || isSendingChat}
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
                disabled={!rejectReason || isUpdatingStatus}
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
