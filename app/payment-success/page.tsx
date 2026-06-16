"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Home,
  Navigation,
  PackageCheck,
  QrCode,
  ReceiptText,
  Store,
} from "lucide-react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp } from "@/lib/customer-data";
import { getPickupRouteUrl } from "@/lib/geo-distance";
import type { ApiOrder } from "@/lib/order-mapper";

function formatDate(value: string | null) {
  if (!value) {
    return "Menunggu jadwal pickup";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { customerLocation } = useCustomerApp();
  const ordersParam = searchParams.get("orders");
  const legacyOrderCode = searchParams.get("order");
  const orderCodes = useMemo(
    () =>
      (ordersParam || legacyOrderCode || "")
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    [legacyOrderCode, ordersParam],
  );
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [isLoading, setIsLoading] = useState(orderCodes.length > 0);

  useEffect(() => {
    if (orderCodes.length === 0) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    let ignore = false;

    async function loadOrder() {
      setIsLoading(true);

      try {
        const orderResponses = await Promise.all(
          orderCodes.map((orderCode) =>
            fetch(`/api/orders/${orderCode}`, {
              cache: "no-store",
            }),
          ),
        );
        const orderPayloads = await Promise.all(
          orderResponses.map(async (response) => {
            if (!response.ok) {
              return null;
            }

            const data = (await response.json()) as {
              ok: boolean;
              order?: ApiOrder;
            };

            return data.ok ? (data.order ?? null) : null;
          }),
        );

        if (!ignore) {
          setOrders(orderPayloads.filter((order): order is ApiOrder => Boolean(order)));
        }
      } catch {
        if (!ignore) {
          setOrders([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      ignore = true;
    };
  }, [orderCodes]);

  const itemSubtotal = useMemo(
    () =>
      orders.reduce(
        (orderTotal, currentOrder) =>
          orderTotal +
          currentOrder.items.reduce(
            (itemTotal, item) => itemTotal + item.priceSnapshot * item.quantity,
            0,
          ),
        0,
      ),
    [orders],
  );
  const totalDiscount = useMemo(
    () => orders.reduce((total, order) => total + order.discount, 0),
    [orders],
  );
  const totalServiceFee = useMemo(
    () => orders.reduce((total, order) => total + order.serviceFee, 0),
    [orders],
  );
  const totalTaxFee = useMemo(
    () => orders.reduce((total, order) => total + (order.taxFee ?? 0), 0),
    [orders],
  );
  const totalPaid = useMemo(
    () => orders.reduce((total, order) => total + order.total, 0),
    [orders],
  );
  const order = orders[0] ?? null;

  if (isLoading || !order) {
    return (
      <MobileDeviceFrame backgroundClassName="bg-white">
        <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto bg-white px-6 text-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ReceiptText size={30} />
            </div>
            <h1 className="text-xl font-extrabold text-gray-950">
              {isLoading ? "Memuat struk..." : "Order tidak ditemukan"}
            </h1>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              {isLoading
                ? "Struk pesanan sedang dimuat."
                : "Buka halaman pesanan untuk melihat order yang berhasil dibuat."}
            </p>
            {!isLoading ? (
              <Link
                href="/orders"
                className="mt-6 inline-flex rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white"
              >
                Buka Pesanan
              </Link>
            ) : null}
          </div>
        </div>
      </MobileDeviceFrame>
    );
  }

  const restaurantCoordinates =
    order.restaurant.latitude !== null && order.restaurant.longitude !== null
      ? {
          latitude: order.restaurant.latitude,
          longitude: order.restaurant.longitude,
        }
      : null;
  const pickupRoute = getPickupRouteUrl(
    customerLocation.coordinates,
    restaurantCoordinates,
    `${order.restaurant.name} ${order.restaurant.city}`,
  );

  return (
    <MobileDeviceFrame backgroundClassName="bg-emerald-500">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-emerald-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="mx-auto w-full max-w-4xl px-5 pt-12 pb-8 text-center text-white sm:px-6 md:px-8">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
            <CheckCircle2 size={50} className="text-emerald-500" />
          </div>
          <p className="mb-2 text-xs font-extrabold tracking-[0.24em] text-emerald-100 uppercase">
            Payment Success
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Pembayaran
            <br />
            Berhasil
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 font-medium text-emerald-50">
            {orders.length > 1
              ? `${orders.length} order sudah tersimpan dan bisa dipantau dari halaman pesanan.`
              : "Order sudah tersimpan dan bisa dipantau dari halaman pesanan."}
          </p>
        </section>

        <section className="flex-1 rounded-t-[40px] bg-[#f8fafc] px-5 pt-6 pb-8 sm:px-6 md:px-8">
          <div className="mx-auto w-full max-w-4xl">
          <div className="mb-5 rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ReceiptText size={22} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Struk Pesanan
                  </h2>
                  <p className="font-mono text-[11px] font-bold text-gray-400">
                    {orders.length > 1
                      ? `${order.orderCode} +${orders.length - 1} order`
                      : order.orderCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-[1fr_auto] gap-4 rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50 p-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-emerald-600 uppercase">
                  Pickup QR
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-emerald-950">
                  {order.pickupCode || "Menunggu kode"}
                </h3>
                <p className="mt-1 text-xs leading-5 font-medium text-emerald-700">
                  Tunjukkan kode pickup ke kasir saat order sudah siap.
                </p>
              </div>
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-gray-900 shadow-sm">
                <QrCode size={68} />
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <Store size={18} className="mt-0.5 text-gray-400" />
                <div>
                  <p className="text-sm font-extrabold text-gray-900">
                    {order.restaurant.name}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    {order.restaurant.address}, {order.restaurant.city}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarClock size={18} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-600">
                  {formatDate(order.pickupTime)}
                </p>
              </div>
              <a
                href={pickupRoute.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-extrabold text-blue-600 transition-colors hover:bg-blue-50"
              >
                <Navigation size={15} />
                {pickupRoute.label}
              </a>
            </div>

            <div className="my-5 space-y-4">
              {orders.map((receiptOrder) => (
                <div
                  key={receiptOrder.orderCode}
                  className={orders.length > 1 ? "rounded-2xl bg-gray-50 p-4" : ""}
                >
                  {orders.length > 1 ? (
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-gray-900">
                          {receiptOrder.restaurant.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] font-bold text-gray-400">
                          {receiptOrder.orderCode}
                        </p>
                      </div>
                      <Link
                        href={`/orders/${receiptOrder.orderCode}`}
                        className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold text-emerald-600"
                      >
                        Lacak
                      </Link>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    {receiptOrder.items.map((item, itemIndex) => (
                      <div
                        key={`${receiptOrder.orderCode}-${item.menuNameSnapshot}-${itemIndex}`}
                        className="flex items-start justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {item.menuNameSnapshot}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-gray-400">
                            Qty {item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-extrabold text-gray-900">
                          {formatRp(item.priceSnapshot * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-dashed border-gray-200 pt-4">
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Subtotal</span>
                <span>{formatRp(itemSubtotal)}</span>
              </div>
              {totalDiscount > 0 ? (
                <div className="flex justify-between text-sm font-extrabold text-blue-600">
                  <span>Voucher</span>
                  <span>- {formatRp(totalDiscount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Biaya Layanan</span>
                <span>{formatRp(totalServiceFee)}</span>
              </div>
              {totalTaxFee > 0 ? (
                <div className="flex justify-between text-sm font-medium text-gray-500">
                  <span>Pajak Platform</span>
                  <span>{formatRp(totalTaxFee)}</span>
                </div>
              ) : null}
              <div className="flex justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
                <span>Total Dibayar</span>
                <span>{formatRp(totalPaid)}</span>
              </div>
            </div>
          </div>

          <div className="mb-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-gray-950">
                  {orders.length > 1 ? "Status Order Utama" : "Status Pesanan"}
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Status terbaru mengikuti pesanan di halaman order.
                </p>
              </div>
              <PackageCheck size={22} className="text-emerald-500" />
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-extrabold text-emerald-700">
              {order.status}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={orders.length > 1 ? "/orders" : `/orders/${order.orderCode}`}
              className="rounded-2xl bg-gray-900 px-4 py-3 text-center text-sm font-extrabold text-white"
            >
              {orders.length > 1 ? "Lihat Semua Order" : "Lacak Order"}
            </Link>
            <Link
              href="/home"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-gray-700"
            >
              <Home size={17} />
              Home
            </Link>
          </div>
          </div>
        </section>
      </div>
    </MobileDeviceFrame>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-500" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
