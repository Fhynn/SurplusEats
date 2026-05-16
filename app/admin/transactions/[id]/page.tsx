"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  CreditCard,
  PackageCheck,
  ReceiptText,
  Store,
  UserRound,
  WalletCards,
} from "lucide-react";

type AdminOrderDetail = {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  pickupCode: string | null;
  pickupTime: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  restaurant: {
    name: string;
    address: string;
    city: string;
    owner: {
      email: string;
    };
  };
  items: Array<{
    id: string;
    menuNameSnapshot: string;
    quantity: number;
    priceSnapshot: number;
    originalPriceSnapshot: number;
  }>;
  refundRequest?: {
    id: string;
    status: string;
    reason: string;
    amount: number;
  } | null;
};

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function formatTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadOrder() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/orders/${params.id}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          order?: AdminOrderDetail;
        };

        if (!response.ok || !data.ok || !data.order) {
          throw new Error(data.message || "Transaksi tidak ditemukan.");
        }

        if (!ignore) {
          setOrder(data.order);
          setNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setNotice(
            error instanceof Error ? error.message : "Transaksi gagal dimuat.",
          );
          setOrder(null);
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
  }, [params.id]);

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
              Transaction Review
            </p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-gray-950">
              {order?.orderCode ||
                (isLoading ? "Memuat transaksi..." : "Transaksi tidak ditemukan")}
            </h1>
          </div>
        </div>
        {order ? (
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700">
            {order.status}
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
          Memuat transaksi dari database...
        </div>
      ) : order ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total", value: formatRp(order.total), icon: WalletCards },
              { label: "Pembayaran", value: order.paymentStatus, icon: CreditCard },
              { label: "Pickup", value: order.pickupCode || "-", icon: PackageCheck },
              { label: "Dibuat", value: formatTime(order.createdAt), icon: Clock3 },
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
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
                <UserRound size={20} className="text-emerald-600" />
                Customer
              </h2>
              <p className="text-sm font-extrabold text-gray-950">
                {order.customer.name}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {order.customer.email}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {order.customer.phone || "-"}
              </p>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
                <Store size={20} className="text-emerald-600" />
                Restoran
              </h2>
              <p className="text-sm font-extrabold text-gray-950">
                {order.restaurant.name}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {order.restaurant.address}, {order.restaurant.city}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {order.restaurant.owner.email}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
              <ReceiptText size={20} className="text-emerald-600" />
              Item Order
            </h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 p-4"
                >
                  <div>
                    <p className="text-sm font-extrabold text-gray-950">
                      {item.menuNameSnapshot}
                    </p>
                    <p className="text-xs font-bold text-gray-400">
                      Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-gray-950">
                    {formatRp(item.priceSnapshot * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
