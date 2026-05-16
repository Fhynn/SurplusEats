"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  QrCode,
  ReceiptText,
  Store,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import type { ApiOrder } from "@/lib/order-mapper";

type OrderStatus = "preparing" | "ready";
type TimelineKey = "confirmed" | "preparing" | "ready";

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
  mapQuery: string;
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

function apiOrderToTracking(order: ApiOrder): TrackingOrder {
  const firstItem = order.items[0];
  const pickupStart = firstItem?.menuItem?.pickupStart || "18:00";
  const pickupEnd = firstItem?.menuItem?.pickupEnd || "21:00";

  return {
    id: order.orderCode,
    restaurant: order.restaurant.name,
    address: `${order.restaurant.address}, ${order.restaurant.city}`,
    item: firstItem?.menuNameSnapshot || "Order tanpa item",
    quantity: firstItem?.quantity || 1,
    total: order.total,
    status: order.status === "READY" ? "ready" : "preparing",
    pickupWindow: `${pickupStart} - ${pickupEnd} WIB`,
    deadline: `${pickupEnd} WIB`,
    image: firstItem?.menuItem?.imageUrl || "/placeholder-food.svg",
    mapQuery: `${order.restaurant.name} ${order.restaurant.city}`,
  };
}

const getTimelineSteps = (status: OrderStatus) =>
  [
    {
      key: "confirmed",
      title: "Pesanan Dikonfirmasi",
      description: "Restoran sudah menerima detail pesananmu.",
      time: "19:05",
      icon: CheckCircle2,
    },
    {
      key: "preparing",
      title: "Sedang Disiapkan",
      description:
        status === "ready"
          ? "Owner sudah selesai mengemas makanan surplusmu."
          : "Owner sedang mengemas makanan surplusmu.",
      time: status === "ready" ? "19:15" : "Sekarang",
      icon: Package,
    },
    {
      key: "ready",
      title: "Pesanan Siap Diambil",
      description:
        status === "ready"
          ? "Tunjukkan QR ke kasir sebelum batas pickup."
          : "QR pickup akan aktif setelah owner menandai pesanan siap.",
      time: status === "ready" ? "19:30" : "Menunggu",
      icon: QrCode,
    },
  ] satisfies Array<{
    key: TimelineKey;
    title: string;
    description: string;
    time: string;
    icon: typeof CheckCircle2;
  }>;

export default function CustomerOrderTrackingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [isCancelSubmitted, setIsCancelSubmitted] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadOrder() {
      setIsLoadingOrder(true);

      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          ok: boolean;
          order?: ApiOrder;
        };

        if (!ignore) {
          setOrder(result.order ? apiOrderToTracking(result.order) : null);
        }
      } catch {
        if (!ignore) {
          setOrder(null);
        }
      } finally {
        if (!ignore) {
          setIsLoadingOrder(false);
        }
      }
    }

    loadOrder();

    return () => {
      ignore = true;
    };
  }, [orderId]);

  if (isLoadingOrder || !order) {
    return (
      <MobileDeviceFrame backgroundClassName="bg-white">
        <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto bg-white px-6 text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Package size={32} />
            </div>
            <h1 className="text-xl font-extrabold text-gray-950">
              {isLoadingOrder ? "Memuat pesanan..." : "Pesanan tidak ditemukan"}
            </h1>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              {isLoadingOrder
                ? "Data tracking diambil dari database."
                : "Cek kembali ID pesanan atau buka riwayat pesanan."}
            </p>
            {!isLoadingOrder ? (
              <button
                type="button"
                onClick={() => router.push("/orders")}
                className="mt-6 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-extrabold text-white"
              >
                Buka Riwayat
              </button>
            ) : null}
          </div>
        </div>
      </MobileDeviceFrame>
    );
  }

  const isReady = order.status === "ready";
  const activeStepIndex = isReady ? 2 : 1;
  const timelineSteps = getTimelineSteps(order.status);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    order.mapQuery,
  )}`;

  const closeCancelModal = () => {
    setIsCancelOpen(false);
    setSelectedReason("");
    setCancelNote("");
    setIsCancelSubmitted(false);
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <section className="absolute top-0 h-72 w-full overflow-hidden bg-emerald-50">
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
                isReady ? "animate-bounce bg-emerald-500" : "bg-blue-500"
              }`}
            >
              <Store size={15} className="text-white" />
            </div>
          </div>
        </section>

        <header className="relative z-20 flex items-center justify-between px-6 pt-10 pb-4">
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

        <div className="relative z-20 mt-12 min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="mb-6 text-center">
              <div
                className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  isReady
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                {isReady ? <QrCode size={32} /> : <Package size={32} />}
              </div>
              <p
                className={`text-xs font-extrabold tracking-[0.18em] uppercase ${
                  isReady ? "text-emerald-600" : "text-blue-600"
                }`}
              >
                {isReady ? "Ready for Pickup" : "In Preparation"}
              </p>
              <h1
                className={`mt-2 text-2xl font-extrabold ${
                  isReady ? "text-emerald-600" : "text-blue-600"
                }`}
              >
                {isReady ? "Siap Diambil!" : "Sedang Disiapkan"}
              </h1>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                {isReady
                  ? `Datang ke toko sebelum ${order.deadline} dan tunjukkan QR pickup.`
                  : "Restoran sedang mengemas pesanan. QR pickup akan aktif saat status siap diambil."}
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
                {isReady ? (
                  <QrCode size={120} className="text-gray-900" />
                ) : (
                  <Package size={112} className="text-gray-300" />
                )}
              </div>
              <p className="relative z-10 text-center text-xs font-bold tracking-widest text-gray-500 uppercase">
                {isReady ? "Tunjukkan QR ke Kasir" : "QR Belum Aktif"}
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
              <div className="grid grid-cols-1 gap-2 border-t border-white p-4">
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
                  {activeStepIndex + 1}/3
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    isReady ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${((activeStepIndex + 1) / 3) * 100}%` }}
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
                          ? isCurrent && !isReady
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

            <div className="grid grid-cols-2 gap-3">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-50 p-4 text-blue-600 transition-colors hover:bg-blue-100"
              >
                <Navigation size={20} />
                <span className="text-xs font-bold">Arahkan Lokasi</span>
              </a>
              <Link
                href={`/support?order=${order.id}`}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 p-4 text-gray-600 transition-colors hover:bg-gray-100"
              >
                <MessageCircle size={20} />
                <span className="text-xs font-bold">Chat Restoran</span>
              </Link>
            </div>

            <Link
              href="/payment-success"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 py-4 text-sm font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <ReceiptText size={18} />
              Lihat Receipt
            </Link>

            <button
              type="button"
              onClick={() => setIsCancelOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-4 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-100"
            >
              <X size={18} />
              Batalkan Pesanan
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 font-medium text-gray-400">
              {isReady
                ? "Pembatalan setelah pesanan siap diambil akan direview sebagai refund manual."
                : "Pembatalan sebelum pesanan siap diproses lebih cepat oleh support."}
            </p>
          </section>
        </div>

        {isCancelOpen ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm">
            <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

              {isCancelSubmitted ? (
                <div className="text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={34} />
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-950">
                    Pembatalan Diajukan
                  </h2>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 font-medium text-gray-500">
                    Tim SurplusEats akan memeriksa status pesanan dan mengirim
                    update refund ke notifikasi kamu.
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
                        {isReady ? "Siap diambil" : "Sedang disiapkan"}
                      </span>
                      . Refund akan mengikuti status terakhir restoran.
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

                  <button
                    type="button"
                    onClick={() => setIsCancelSubmitted(true)}
                    disabled={!selectedReason}
                    className="w-full rounded-2xl bg-red-500 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(239,68,68,0.18)] transition-all hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-red-200 disabled:shadow-none"
                  >
                    Ajukan Pembatalan
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
