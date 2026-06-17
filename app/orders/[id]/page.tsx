"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Clock3,
  Download,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Navigation,
  Package,
  QrCode,
  ReceiptText,
  Send,
  Store,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { PickupQrCode } from "@/components/pickup-qr-code";
import { InlineNotice, StateCard } from "@/components/ui-state";
import { useRealtimePolling } from "@/components/use-realtime-polling";
import {
  getPickupRouteUrl,
  type Coordinates,
} from "@/lib/geo-distance";
import type { ApiOrder } from "@/lib/order-mapper";

type OrderStatus =
  | "pendingPayment"
  | "preparing"
  | "ready"
  | "cancelled"
  | "noShow";
type TimelineKey = "payment" | "confirmed" | "preparing" | "ready";

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

const terminalApiOrderStatuses = new Set([
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "REFUNDED",
  "PAYMENT_FAILED",
]);

type TrackingOrder = {
  id: string;
  restaurant: string;
  address: string;
  item: string;
  quantity: number;
  total: number;
  status: OrderStatus;
  pickupWindow: string;
  deadline: string;
  image: string;
  pickupRouteUrl: string;
  pickupRouteLabel: string;
  apiStatus: string;
  paymentStatus: string;
  checkoutAttemptId: string | null;
  createdAt: string;
  pickupTime: string | null;
  pickupCode: string | null;
};

const cancelReasons = [
  "Salah pilih jadwal pickup",
  "Lokasi terlalu jauh",
  "Restoran belum merespon",
  "Ingin ganti pesanan",
] as const;

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function formatClock(value: string | null) {
  if (!value) {
    return "Menunggu";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
      message.senderRole === "CUSTOMER"
        ? "customer"
        : message.senderRole === "OWNER"
          ? "owner"
          : "system",
    text: message.body,
    time: formatChatTime(message.createdAt),
  };
}

function getRestaurantCoordinates(order: ApiOrder) {
  if (order.restaurant.latitude === null || order.restaurant.longitude === null) {
    return null;
  }

  return {
    latitude: order.restaurant.latitude,
    longitude: order.restaurant.longitude,
  };
}

function apiOrderToTracking(
  order: ApiOrder,
  customerCoordinates: Coordinates | null = null,
): TrackingOrder {
  const firstItem = order.items[0];
  const pickupStart = firstItem?.menuItem?.pickupStart || "18:00";
  const pickupEnd = firstItem?.menuItem?.pickupEnd || "21:00";
  const pickupRoute = getPickupRouteUrl(
    customerCoordinates,
    getRestaurantCoordinates(order),
    `${order.restaurant.name} ${order.restaurant.city}`,
  );

  return {
    id: order.orderCode,
    restaurant: order.restaurant.name,
    address: `${order.restaurant.address}, ${order.restaurant.city}`,
    item: firstItem?.menuNameSnapshot || "Order tanpa item",
    quantity: firstItem?.quantity || 1,
    total: order.total,
    status:
      order.status === "PENDING" || order.paymentStatus === "PENDING"
        ? "pendingPayment"
        : order.status === "NO_SHOW"
        ? "noShow"
        : order.status === "CANCELLED" || order.status === "REFUNDED"
        ? "cancelled"
        : order.status === "READY"
          ? "ready"
          : "preparing",
    pickupWindow: `${pickupStart} - ${pickupEnd} WIB`,
    deadline: `${pickupEnd} WIB`,
    image: firstItem?.menuItem?.imageUrl || "/placeholder-food.svg",
    pickupRouteUrl: pickupRoute.url,
    pickupRouteLabel: pickupRoute.label,
    apiStatus: order.status,
    paymentStatus: order.paymentStatus,
    checkoutAttemptId: order.checkoutAttemptId,
    createdAt: order.createdAt,
    pickupTime: order.pickupTime,
    pickupCode: order.pickupCode,
  };
}

const getTimelineSteps = (order: TrackingOrder) => {
  if (order.status === "pendingPayment") {
    return [
      {
        key: "payment",
        title: "Menunggu Pembayaran",
        description:
          "Selesaikan pembayaran dulu agar order masuk ke restoran.",
        time: "Berjalan",
        icon: CreditCard,
      },
      {
        key: "confirmed",
        title: "Pembayaran Dikonfirmasi",
        description: "Tripay akan mengirim konfirmasi setelah pembayaran valid.",
        time: "Menunggu",
        icon: CheckCircle2,
      },
      {
        key: "preparing",
        title: "Restoran Menyiapkan",
        description: "Mitra mulai menyiapkan setelah pembayaran valid.",
        time: "Menunggu",
        icon: Package,
      },
      {
        key: "ready",
        title: "Pesanan Siap Diambil",
        description: "Kode pickup aktif setelah owner menandai pesanan siap.",
        time: "Menunggu",
        icon: QrCode,
      },
    ] satisfies Array<{
      key: TimelineKey;
      title: string;
      description: string;
      time: string;
      icon: typeof CheckCircle2;
    }>;
  }

  return [
    {
      key: "confirmed",
      title: "Pesanan Dikonfirmasi",
      description: "Restoran sudah menerima detail pesananmu.",
      time: formatClock(order.createdAt),
      icon: CheckCircle2,
    },
    {
      key: "preparing",
      title: "Sedang Disiapkan",
      description:
        order.status === "ready"
          ? "Owner sudah selesai mengemas makanan surplusmu."
          : "Owner sedang mengemas makanan surplusmu.",
      time: order.status === "ready" ? "Selesai" : "Berjalan",
      icon: Package,
    },
    {
      key: "ready",
      title: "Pesanan Siap Diambil",
      description:
        order.status === "ready"
          ? "Tunjukkan kode pickup ke kasir sebelum batas pickup."
          : "Kode pickup akan aktif setelah owner menandai pesanan siap.",
      time: order.status === "ready" ? formatClock(order.pickupTime) : "Menunggu",
      icon: QrCode,
    },
  ] satisfies Array<{
    key: TimelineKey;
    title: string;
    description: string;
    time: string;
    icon: typeof CheckCircle2;
  }>;
};

export default function CustomerOrderTrackingPage() {
  const router = useRouter();
  const { customerLocation } = useCustomerApp();
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [apiOrder, setApiOrder] = useState<ApiOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [isCancelSubmitted, setIsCancelSubmitted] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatNotice, setChatNotice] = useState<string | null>(null);
  const order = apiOrder
    ? apiOrderToTracking(apiOrder, customerLocation.coordinates)
    : null;

  const loadOrder = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingOrder(true);
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          ok: boolean;
          message?: string;
          order?: ApiOrder;
        };

        if (!response.ok || !result.ok || !result.order) {
          throw new Error(result.message || "Pesanan tidak ditemukan.");
        }

        setApiOrder(result.order);
      } catch {
        if (!silent) {
          setApiOrder(null);
        }
      } finally {
        if (!silent) {
          setIsLoadingOrder(false);
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const shouldPollOrder =
    !apiOrder || !terminalApiOrderStatuses.has(apiOrder.status);

  useRealtimePolling({
    enabled: shouldPollOrder,
    intervalMs: order?.status === "ready" ? 6000 : 10000,
    onPoll: () => loadOrder({ silent: true }),
  });

  const loadMessages = useCallback(
    async (
      currentOrderId: string,
      { silent = false }: { silent?: boolean } = {},
    ) => {
      if (!silent) {
        setIsLoadingMessages(true);
        setChatNotice(null);
      }

      try {
        const response = await fetch(`/api/orders/${currentOrderId}/messages`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          messages?: ApiOrderMessage[];
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Pesan restoran gagal dimuat.");
        }

        setChatMessages((data.messages ?? []).map(mapApiOrderMessage));
      } catch (error) {
        if (!silent) {
          setChatNotice(
            error instanceof Error
              ? error.message
              : "Pesan restoran gagal dimuat.",
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

  const currentOrderCode = order?.id ?? null;

  useRealtimePolling({
    enabled: Boolean(currentOrderCode && isChatOpen),
    intervalMs: 7000,
    onPoll: () =>
      currentOrderCode
        ? loadMessages(currentOrderCode, { silent: true })
        : undefined,
  });

  if (isLoadingOrder || !order) {
    return (
      <MobileDeviceFrame backgroundClassName="bg-white">
        <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto bg-white px-5 py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <StateCard
            className="w-full max-w-sm"
            variant={isLoadingOrder ? "loading" : "error"}
            title={isLoadingOrder ? "Memuat pesanan" : "Pesanan tidak ditemukan"}
            description={
              isLoadingOrder
                ? "Data tracking sedang dimuat."
                : "Cek kembali ID pesanan atau buka riwayat pesanan."
            }
            action={
              isLoadingOrder
                ? undefined
                : {
                    label: "Buka Riwayat",
                    onClick: () => router.push("/orders"),
                  }
            }
          />
        </div>
      </MobileDeviceFrame>
    );
  }

  const isReady = order.status === "ready";
  const isPaymentPending = order.status === "pendingPayment";
  const isCancelled = order.status === "cancelled";
  const isNoShow = order.status === "noShow";
  const canCancelOrder =
    order.paymentStatus === "PAID" &&
    ["PAID", "CONFIRMED", "PREPARING"].includes(order.apiStatus);
  const activeStepIndex = isPaymentPending
    ? 0
    : isReady
      ? 2
      : isCancelled || isNoShow
        ? 0
        : 1;
  const timelineSteps = getTimelineSteps(order);
  const closeCancelModal = () => {
    setIsCancelOpen(false);
    setSelectedReason("");
    setCancelNote("");
    setIsCancelSubmitted(false);
    setCancelError(null);
  };
  const openChatModal = () => {
    setIsChatOpen(true);
    setChatNotice(null);
    void loadMessages(order.id);
  };
  const closeChatModal = () => {
    setIsChatOpen(false);
    setChatDraft("");
    setChatNotice(null);
  };
  const handleSendMessage = async () => {
    const trimmedMessage = chatDraft.trim();

    if (!trimmedMessage || isSendingChat) {
      return;
    }

    setIsSendingChat(true);
    setChatNotice(null);

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
      setChatNotice(
        error instanceof Error ? error.message : "Pesan gagal dikirim.",
      );
    } finally {
      setIsSendingChat(false);
    }
  };
  const handleCancelOrder = async () => {
    if (!selectedReason || isSubmittingCancel) {
      return;
    }

    setIsSubmittingCancel(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: selectedReason,
          note: cancelNote.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        order?: ApiOrder;
      };

      if (!response.ok || !data.ok || !data.order) {
        throw new Error(data.message || "Pesanan gagal dibatalkan.");
      }

      setApiOrder(data.order);
      setIsCancelSubmitted(true);
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Pesanan gagal dibatalkan.",
      );
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <section className="absolute top-0 h-72 w-full overflow-hidden bg-emerald-50 md:h-80">
          <Image
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600&auto=format&fit=crop"
            alt={`Peta lokasi ${order.restaurant}`}
            fill
            sizes="400px"
            priority
            className="object-cover opacity-60 grayscale mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />

          <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div className="mb-2 rounded-full bg-gray-900 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg">
              {order.restaurant}
            </div>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-4 border-white shadow-xl ${
                isCancelled || isNoShow
                  ? "bg-red-500"
                  : isPaymentPending
                    ? "bg-amber-500"
                  : isReady
                    ? "animate-bounce bg-emerald-500"
                    : "bg-blue-500"
              }`}
            >
              <Store size={15} className="text-white" />
            </div>
          </div>
        </section>

        <header className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-10 pb-4 sm:px-6 md:px-8">
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="-ml-2 rounded-full bg-white/80 p-2 text-gray-800 shadow-sm backdrop-blur-md transition-colors hover:bg-gray-100"
            aria-label="Kembali ke riwayat pesanan"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-gray-700 shadow-sm backdrop-blur-md">
            ID: {order.id}
          </div>
        </header>

        <div className="relative z-20 mx-auto mt-12 min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] sm:px-6 md:px-8 [&::-webkit-scrollbar]:hidden">
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="mb-6 text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  isCancelled || isNoShow
                    ? "bg-red-50 text-red-600"
                    : isPaymentPending
                      ? "bg-amber-50 text-amber-600"
                    : isReady
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {isCancelled || isNoShow ? (
                  <X size={32} />
                ) : isPaymentPending ? (
                  <CreditCard size={32} />
                ) : isReady ? (
                  <QrCode size={32} />
                ) : (
                  <Package size={32} />
                )}
              </div>
              <p
                className={`text-xs font-extrabold tracking-[0.18em] uppercase ${
                  isCancelled || isNoShow
                    ? "text-red-600"
                    : isPaymentPending
                      ? "text-amber-600"
                    : isReady
                      ? "text-emerald-600"
                      : "text-blue-600"
                }`}
              >
                {isNoShow
                  ? "No Show"
                  : isCancelled
                    ? "Cancelled"
                  : isPaymentPending
                    ? "Waiting Payment"
                  : isReady
                    ? "Ready for Pickup"
                    : "In Preparation"}
              </p>
              <h1
                className={`mt-2 text-2xl font-extrabold ${
                  isCancelled || isNoShow
                    ? "text-red-600"
                    : isPaymentPending
                      ? "text-amber-600"
                    : isReady
                      ? "text-emerald-600"
                      : "text-blue-600"
                }`}
              >
                {isNoShow
                  ? "Pesanan Tidak Diambil"
                  : isCancelled
                    ? "Pesanan Dibatalkan"
                  : isPaymentPending
                    ? "Menunggu Pembayaran"
                  : isReady
                    ? "Siap Diambil!"
                    : "Sedang Disiapkan"}
              </h1>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                {isNoShow
                  ? "Pesanan melewati batas pickup dan sudah ditandai tidak diambil."
                  : isCancelled
                    ? "Pesanan ini sudah dibatalkan dan tidak perlu diambil ke restoran."
                  : isPaymentPending
                    ? "Selesaikan pembayaran dulu. Setelah pembayaran valid, order baru masuk ke restoran."
                  : isReady
                    ? `Datang ke toko sebelum ${order.deadline} dan tunjukkan kode pickup.`
                    : "Restoran sedang mengemas pesanan. Kode pickup akan aktif saat status siap diambil."}
              </p>
            </div>

            <div
              className={`relative mb-6 flex flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed p-6 ${
                isReady
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-gray-200 bg-[#f8fafc]"
              }`}
            >
              <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500 opacity-20 blur-[50px]" />
              <div className="absolute bottom-0 left-0 h-20 w-20 bg-blue-500 opacity-20 blur-[50px]" />

              <div className="relative z-10 mb-3 rounded-2xl bg-white p-3 shadow-sm">
                {isCancelled || isNoShow ? (
                  <X size={112} className="text-red-300" />
                ) : isPaymentPending ? (
                  <CreditCard size={112} className="text-amber-300" />
                ) : isReady ? (
                  <PickupQrCode
                    orderId={order.id}
                    pickupCode={order.pickupCode}
                    isActive={Boolean(order.pickupCode)}
                  />
                ) : (
                  <Package size={112} className="text-gray-300" />
                )}
              </div>
              <p className="relative z-10 text-center text-xs font-bold tracking-widest text-gray-500 uppercase">
                {isNoShow
                  ? "Pickup Tidak Diambil"
                  : isCancelled
                    ? "Pickup Dibatalkan"
                  : isPaymentPending
                    ? "Pembayaran Belum Selesai"
                  : isReady
                    ? "Tunjukkan Kode ke Kasir"
                    : "Kode Belum Aktif"}
              </p>
            </div>

            <div className="mb-6 overflow-hidden rounded-[24px] border border-gray-100 bg-gray-50">
              <div className="flex gap-4 p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                  <Image
                    src={order.image}
                    alt={order.item}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-extrabold text-gray-950">
                    {order.item} x{order.quantity}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {order.restaurant}
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-gray-950">
                    {formatRp(order.total)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 border-t border-white p-4 md:grid-cols-2">
                <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-bold text-gray-600">
                  <Clock3 size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>Pickup {order.pickupWindow}</span>
                </div>
                <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-bold text-gray-600">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>{order.address}</span>
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-[24px] border border-gray-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-extrabold text-gray-950">
                  Progress pesanan
                </h2>
                <span className="text-xs font-bold text-gray-400">
                  {activeStepIndex + 1}/{timelineSteps.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    isPaymentPending
                      ? "bg-amber-500"
                      : isReady
                        ? "bg-emerald-500"
                        : "bg-blue-500"
                  }`}
                  style={{
                    width: `${((activeStepIndex + 1) / timelineSteps.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="relative mb-8 space-y-6 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-emerald-200 before:to-gray-200">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isDone = index <= activeStepIndex;
                const isCurrent = index === activeStepIndex;

                return (
                  <div
                    key={step.title}
                    className="relative flex items-center gap-4"
                  >
                    <div
                      className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow ${
                        isDone
                          ? isCurrent && isPaymentPending
                            ? "bg-amber-500 text-white"
                            : isCurrent && !isReady
                            ? "bg-blue-500 text-white"
                            : "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div
                      className={`flex-1 rounded-2xl p-4 ${
                        isCurrent
                          ? isReady
                            ? "border border-emerald-100 bg-emerald-50 shadow-sm"
                            : isPaymentPending
                              ? "border border-amber-100 bg-amber-50 shadow-sm"
                            : "border border-blue-100 bg-blue-50 shadow-sm"
                          : "bg-white"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h2
                          className={`text-sm font-bold ${
                            isCurrent
                              ? isReady
                                ? "text-emerald-900"
                                : isPaymentPending
                                  ? "text-amber-900"
                                : "text-blue-900"
                              : isDone
                                ? "text-gray-900"
                                : "text-gray-400"
                          }`}
                        >
                          {step.title}
                        </h2>
                        <span
                          className={`text-[10px] font-bold ${
                            isCurrent
                              ? isReady
                                ? "text-emerald-600"
                                : isPaymentPending
                                  ? "text-amber-600"
                                : "text-blue-600"
                              : "text-gray-400"
                          }`}
                        >
                          {step.time}
                        </span>
                      </div>
                      <p
                        className={`text-xs ${
                          isCurrent
                            ? isReady
                              ? "text-emerald-700"
                              : isPaymentPending
                                ? "text-amber-800"
                              : "text-blue-700"
                            : "text-gray-500"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isPaymentPending ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href={
                    order.checkoutAttemptId
                      ? `/payment-status?attempt=${order.checkoutAttemptId}`
                      : "/orders"
                  }
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-amber-500 p-4 text-white shadow-[0_10px_24px_rgba(245,158,11,0.22)] transition-colors hover:bg-amber-600"
                >
                  <CreditCard size={20} />
                  <span className="text-xs font-bold">Lanjut Pembayaran</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void loadOrder()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 p-4 text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <Clock3 size={20} />
                  <span className="text-xs font-bold">Periksa Status</span>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <a
                    href={order.pickupRouteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-50 p-4 text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <Navigation size={20} />
                    <span className="text-xs font-bold">
                      {order.pickupRouteLabel}
                    </span>
                  </a>
                  <button
                    type="button"
                    onClick={openChatModal}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 p-4 text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    <MessageCircle size={20} />
                    <span className="text-xs font-bold">Chat Restoran</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Link
                    href={`/payment-success?order=${order.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 py-4 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <ReceiptText size={18} />
                    Lihat Receipt
                  </Link>
                  <a
                    href={`/api/orders/${order.id}/receipt`}
                    download
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-4 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Download size={18} />
                    Download PDF
                  </a>
                </div>
              </>
            )}

            {canCancelOrder ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-4 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-100"
                >
                  <X size={18} />
                  Batalkan Pesanan
                </button>
                <p className="mt-3 text-center text-[11px] leading-5 font-medium text-gray-400">
                  Pembatalan sebelum pesanan siap akan mengembalikan stok dan
                  memperbarui status pembayaran.
                </p>
              </>
            ) : isReady ? (
              <Link
                href={`/orders/${order.id}/refund`}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 py-4 text-sm font-extrabold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <AlertTriangle size={18} />
                Ajukan Refund
              </Link>
            ) : null}
          </section>
        </div>

        {isChatOpen ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm md:items-center md:justify-center md:p-6">
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[40px] bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.22)] md:max-w-2xl md:rounded-[32px] md:shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
              <div className="border-b border-gray-100 px-6 pt-5 pb-4">
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200 md:hidden" />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase">
                      Chat Restoran
                    </p>
                    <h2 className="mt-1 truncate text-xl font-extrabold text-gray-950">
                      {order.restaurant}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      Order {order.id} • {order.pickupWindow}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeChatModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                    aria-label="Tutup chat restoran"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="min-h-[320px] flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5 [scrollbar-width:none] md:p-6 [&::-webkit-scrollbar]:hidden">
                {chatNotice ? (
                  <InlineNotice variant="error" description={chatNotice} />
                ) : null}

                {isLoadingMessages ? (
                  <StateCard
                    variant="loading"
                    size="sm"
                    title="Memuat pesan restoran"
                    description="Percakapan terbaru sedang diambil."
                  />
                ) : chatMessages.length === 0 ? (
                  <StateCard
                    variant="empty"
                    size="sm"
                    icon={MessageSquareText}
                    title="Belum ada percakapan"
                    description="Tanyakan status pickup, catatan pengambilan, atau info toko langsung ke restoran."
                  />
                ) : (
                  chatMessages.map((message) => {
                    const isCustomer = message.sender === "customer";
                    const isSystem = message.sender === "system";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-[24px] p-4 ${
                            isCustomer
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
                              isCustomer ? "text-emerald-50" : "text-gray-400"
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
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder="Tulis pesan untuk restoran..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={!chatDraft.trim() || isSendingChat}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                    aria-label="Kirim pesan ke restoran"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isCancelOpen ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm md:items-center md:justify-center md:p-6">
            <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)] [scrollbar-width:none] md:max-w-xl md:rounded-[32px] md:p-7 [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

              {isCancelSubmitted ? (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={34} />
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-950">
                    Pesanan Dibatalkan
                  </h2>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 font-medium text-gray-500">
                    Status pesanan sudah diperbarui, stok dikembalikan, dan
                    notifikasi dikirim ke restoran.
                  </p>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/orders")}
                      className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Riwayat
                    </button>
                    <button
                      type="button"
                      onClick={closeCancelModal}
                      className="rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-gray-950">
                          Batalkan Pesanan?
                        </h2>
                        <p className="mt-0.5 text-xs font-semibold text-gray-500">
                          Order {order.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeCancelModal}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="Tutup modal pembatalan"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mb-5 rounded-[24px] border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm leading-6 font-semibold text-amber-800">
                      Status saat ini:{" "}
                      <span className="font-extrabold">
                        {isReady
                          ? "Siap diambil"
                          : order.apiStatus === "PAID" ||
                              order.apiStatus === "CONFIRMED"
                            ? "Pesanan baru"
                            : "Sedang disiapkan"}
                      </span>
                      . Pembatalan akan langsung memperbarui status pesanan.
                    </p>
                  </div>

                  <div className="mb-5 space-y-2">
                    <p className="text-sm font-extrabold text-gray-900">
                      Pilih alasan
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {cancelReasons.map((reason) => {
                        const isActive = selectedReason === reason;

                        return (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setSelectedReason(reason)}
                            className={`rounded-2xl border p-3 text-left text-xs font-bold transition-all ${
                              isActive
                                ? "border-red-300 bg-red-50 text-red-700 ring-4 ring-red-50"
                                : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {reason}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label
                    htmlFor="cancel-note"
                    className="mb-2 block text-sm font-extrabold text-gray-900"
                  >
                    Catatan Tambahan
                  </label>
                  <textarea
                    id="cancel-note"
                    value={cancelNote}
                    onChange={(event) => setCancelNote(event.target.value)}
                    placeholder="Tuliskan detail jika diperlukan..."
                    rows={3}
                    className="mb-5 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
                  />

                  {cancelError ? (
                    <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                      {cancelError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleCancelOrder()}
                    disabled={!selectedReason || isSubmittingCancel}
                    className="w-full rounded-2xl bg-red-500 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(239,68,68,0.18)] transition-all hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-red-200 disabled:shadow-none"
                  >
                    {isSubmittingCancel ? "Membatalkan..." : "Batalkan Pesanan"}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
