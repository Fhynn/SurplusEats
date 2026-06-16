"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  Navigation,
  Package,
  QrCode,
  RefreshCcw,
  ShoppingBag,
  Store,
} from "lucide-react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { PickupQrCode } from "@/components/pickup-qr-code";
import { InlineNotice, StateCard } from "@/components/ui-state";
import { useRealtimePolling } from "@/components/use-realtime-polling";
import { formatRp } from "@/lib/customer-data";
import {
  apiOrderToCard,
  type ApiOrder,
  type CustomerOrderCard,
  type UiOrderStatus,
} from "@/lib/order-mapper";

type TrackingOrder = CustomerOrderCard & {
  rawStatus: string;
  pickupCode: string | null;
  pickupTime: string | null;
  createdAt: string;
  restaurantAddress: string;
  restaurantCity: string;
};

type TrackingStep = {
  label: string;
  description: string;
  rank: number;
};

const finalStatuses = new Set([
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "REFUNDED",
  "PAYMENT_FAILED",
]);

const statusClassNameByStatus: Record<UiOrderStatus, string> = {
  ready: "bg-emerald-50 text-emerald-700",
  preparing: "bg-blue-50 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-700",
  noShow: "bg-amber-50 text-amber-700",
};

const trackingSteps: TrackingStep[] = [
  {
    label: "Order dikonfirmasi",
    description: "Pembayaran valid dan order sudah masuk ke restoran.",
    rank: 1,
  },
  {
    label: "Restoran menyiapkan",
    description: "Mitra menyiapkan paket surplus sesuai pickup window.",
    rank: 2,
  },
  {
    label: "Siap diambil",
    description: "Datang ke titik restoran dan tunjukkan kode pickup.",
    rank: 3,
  },
  {
    label: "Selesai",
    description: "Order selesai setelah paket berhasil diambil.",
    rank: 4,
  },
];

const statusRankByRawStatus: Record<string, number> = {
  PENDING: 0,
  PAID: 1,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  COMPLETED: 4,
  NO_SHOW: 4,
  CANCELLED: 4,
  REFUNDED: 4,
  PAYMENT_FAILED: 0,
};

function isActiveOrder(order: ApiOrder) {
  return !finalStatuses.has(order.status);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Menunggu jadwal pickup";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mapTrackingOrder(
  order: ApiOrder,
  customerCoordinates: Parameters<typeof apiOrderToCard>[1],
): TrackingOrder {
  const card = apiOrderToCard(order, customerCoordinates);

  return {
    ...card,
    rawStatus: order.status,
    pickupCode: order.pickupCode,
    pickupTime: order.pickupTime,
    createdAt: order.createdAt,
    restaurantAddress: order.restaurant.address,
    restaurantCity: order.restaurant.city,
  };
}

export function CustomerOrderTrackingScreen() {
  const router = useRouter();
  const { customerLocation } = useCustomerApp();
  const [requestedOrderId, setRequestedOrderId] = useState<string | null>(null);
  const [apiOrders, setApiOrders] = useState<ApiOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const orders = useMemo(
    () =>
      apiOrders
        .filter(isActiveOrder)
        .map((order) => mapTrackingOrder(order, customerLocation.coordinates)),
    [apiOrders, customerLocation.coordinates],
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setRequestedOrderId(query.get("order") || query.get("id"));
  }, []);

  const loadTrackingOrders = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
        setNotice(null);
      }

      try {
        const ordersResponse = await fetch("/api/orders", {
          cache: "no-store",
        });
        const ordersData = (await ordersResponse.json()) as {
          ok: boolean;
          message?: string;
          orders?: ApiOrder[];
        };

        if (!ordersResponse.ok || !ordersData.ok) {
          throw new Error(ordersData.message || "Tracking pesanan gagal dimuat.");
        }

        setApiOrders(ordersData.orders ?? []);
        setNotice(null);
      } catch (error) {
        if (!silent) {
          setApiOrders([]);
          setNotice(
            error instanceof Error
              ? error.message
              : "Tracking pesanan gagal dimuat.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadTrackingOrders();
  }, [loadTrackingOrders]);

  useRealtimePolling({
    enabled: !isLoading,
    intervalMs: orders.length > 0 ? 8000 : 30000,
    onPoll: () => loadTrackingOrders({ silent: true }),
  });

  useEffect(() => {
    if (orders.length === 0) {
      setSelectedOrderId("");
      return;
    }

    const requestedOrder = requestedOrderId
      ? orders.find((order) => order.id === requestedOrderId)
      : null;
    const currentOrder = orders.find((order) => order.id === selectedOrderId);

    if (!currentOrder) {
      setSelectedOrderId(requestedOrder?.id ?? orders[0].id);
    }
  }, [orders, requestedOrderId, selectedOrderId]);

  const selectedOrder = useMemo(
    () =>
      orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId],
  );
  const currentRank = selectedOrder
    ? (statusRankByRawStatus[selectedOrder.rawStatus] ?? 1)
    : 0;

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-5 pt-10 pb-5 shadow-sm sm:px-6 md:mx-auto md:w-full md:max-w-6xl md:px-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={() => void loadTrackingOrders()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              aria-label="Muat ulang tracking"
            >
              <RefreshCcw size={18} />
            </button>
          </div>
          <div className="mt-5 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
              <Package size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">
                Tracking Pesanan
              </h1>
              <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                Pantau order aktif, kode pickup, dan rute menuju titik restoran.
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-24 [scrollbar-width:none] sm:px-6 md:mx-auto md:w-full md:max-w-6xl md:px-8 [&::-webkit-scrollbar]:hidden">
          {notice ? (
            <InlineNotice
              variant="error"
              description={notice}
              className="mb-5"
            />
          ) : null}

          {isLoading ? (
            <div className="flex min-h-[55vh] items-center justify-center text-center">
              <StateCard
                title="Memuat tracking"
                description="Mengambil pesanan aktif dari akun kamu."
                variant="loading"
                className="w-full max-w-md"
              />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[55vh] items-center justify-center text-center">
              <StateCard
                title="Belum ada pesanan aktif"
                description="Tracking akan muncul setelah kamu checkout dan order masuk ke restoran."
                variant="empty"
                className="w-full max-w-md"
                action={{
                  label: "Cari Makanan",
                  href: "/browse",
                }}
              />
            </div>
          ) : selectedOrder ? (
            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <article className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-extrabold text-emerald-600">
                        {selectedOrder.id}
                      </p>
                      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-950">
                        {selectedOrder.resto}
                      </h2>
                      <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                        {selectedOrder.items}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${statusClassNameByStatus[selectedOrder.status]}`}
                    >
                      {selectedOrder.status === "ready" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Clock3 size={14} />
                      )}
                      {selectedOrder.statusText}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <Clock3 size={18} className="mb-2 text-blue-600" />
                      <p className="text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
                        Pickup
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-gray-950">
                        {formatDateTime(
                          selectedOrder.pickupTime || selectedOrder.createdAt,
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <QrCode size={18} className="mb-2 text-emerald-600" />
                      <p className="text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
                        Kode Pickup
                      </p>
                      <p
                        className={`mt-1 font-black text-gray-950 ${
                          selectedOrder.status === "ready"
                            ? "font-mono text-lg"
                            : "text-xs leading-5"
                        }`}
                      >
                        {selectedOrder.status === "ready"
                          ? selectedOrder.pickupCode || "-"
                          : "Aktif saat siap"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <ShoppingBag size={18} className="mb-2 text-purple-600" />
                      <p className="text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">
                        Total
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-gray-950">
                        {formatRp(selectedOrder.total)}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.status === "ready" ? (
                    <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4">
                      <div className="flex flex-col items-center gap-3">
                        <PickupQrCode
                          orderId={selectedOrder.id}
                          pickupCode={selectedOrder.pickupCode}
                          isActive={Boolean(selectedOrder.pickupCode)}
                        />
                        <p className="text-center text-xs leading-5 font-bold text-emerald-700">
                          Tunjukkan QR atau kode pickup ini ke mitra saat
                          mengambil pesanan.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex gap-3">
                      <MapPin
                        size={20}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-emerald-950">
                          Titik pickup restoran
                        </p>
                        <p className="mt-1 text-xs leading-5 font-semibold text-emerald-700">
                          {selectedOrder.restaurantAddress},{" "}
                          {selectedOrder.restaurantCity}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <a
                        href={selectedOrder.pickupRouteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(16,185,129,0.22)]"
                      >
                        <Navigation size={18} />
                        {selectedOrder.pickupRouteLabel}
                      </a>
                      <Link
                        href={`/orders/${selectedOrder.id}`}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-extrabold text-emerald-700 shadow-sm"
                      >
                        Detail Order
                      </Link>
                    </div>
                  </div>
                </article>

                <article className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="text-lg font-extrabold text-gray-950">
                    Progres Order
                  </h3>
                  <div className="mt-5 space-y-4">
                    {trackingSteps.map((step, index) => {
                      const isDone = currentRank >= step.rank;

                      return (
                        <div key={step.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                isDone
                                  ? "bg-emerald-500 text-white"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              <CheckCircle2 size={17} />
                            </div>
                            {index < trackingSteps.length - 1 ? (
                              <div
                                className={`mt-2 h-8 w-px ${
                                  currentRank > step.rank
                                    ? "bg-emerald-300"
                                    : "bg-gray-200"
                                }`}
                              />
                            ) : null}
                          </div>
                          <div className="pt-1">
                            <p
                              className={`text-sm font-extrabold ${
                                isDone ? "text-gray-950" : "text-gray-400"
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-950">
                        Pesanan Aktif
                      </h3>
                      <p className="mt-1 text-xs font-medium text-gray-500">
                        Pilih order yang ingin dipantau.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                      {orders.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {orders.map((order) => {
                      const isSelected = selectedOrder.id === order.id;

                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-emerald-300 bg-emerald-50 ring-4 ring-emerald-50"
                              : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                                isSelected
                                  ? "bg-white text-emerald-600"
                                  : "bg-white text-gray-500"
                              }`}
                            >
                              <Store size={19} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-[11px] font-extrabold text-gray-400">
                                {order.id}
                              </p>
                              <p className="mt-1 truncate text-sm font-extrabold text-gray-950">
                                {order.resto}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 font-medium text-gray-500">
                                {order.items}
                              </p>
                              <span
                                className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClassNameByStatus[order.status]}`}
                              >
                                {order.statusText}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[28px] border border-amber-100 bg-amber-50 p-5">
                  <div className="flex gap-3">
                    <AlertCircle
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />
                    <p className="text-xs leading-5 font-semibold text-amber-800">
                      Jika restoran tutup atau makanan tidak sesuai, buka detail
                      order untuk mengajukan refund dari order yang sama.
                    </p>
                  </div>
                </div>
              </aside>
            </section>
          ) : null}
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
