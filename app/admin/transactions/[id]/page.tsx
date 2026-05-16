"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Store,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type TransactionStatus = "completed" | "processing" | "pickup";
type SettlementStatus = "released" | "held" | "pending";
type TimelineTone = "emerald" | "blue" | "amber" | "red" | "gray";

type AdminTransaction = {
  id: string;
  orderId: string;
  customer: string;
  customerEmail: string;
  store: string;
  storeEmail: string;
  item: string;
  quantity: number;
  grossAmount: number;
  discount: number;
  platformFee: number;
  ownerReceivable: number;
  paymentMethod: string;
  paymentRef: string;
  pickupCode: string;
  orderedAt: string;
  pickupWindow: string;
  location: string;
  status: TransactionStatus;
  settlement: SettlementStatus;
  riskScore: number;
};

type TimelineItem = {
  title: string;
  description: string;
  time: string;
  tone: TimelineTone;
};

const transactions: AdminTransaction[] = [
  {
    id: "TRX-78291",
    orderId: "SE-8821",
    customer: "Nadia Putri",
    customerEmail: "nadia.putri@example.com",
    store: "Green Bowl Co.",
    storeEmail: "ops@greenbowl.example.com",
    item: "Salad Bowl Surplus x2",
    quantity: 2,
    grossAmount: 42000,
    discount: 13000,
    platformFee: 4200,
    ownerReceivable: 37800,
    paymentMethod: "GoPay",
    paymentRef: "GOPAY-8821-16MAY",
    pickupCode: "QR-99A2X",
    orderedAt: "16 Mei 2026, 09:12",
    pickupWindow: "19:00 - 20:00 WIB",
    location: "Green Bowl Co. Senopati",
    status: "completed",
    settlement: "held",
    riskScore: 42,
  },
  {
    id: "TRX-78262",
    orderId: "SE-8794",
    customer: "Arka Wijaya",
    customerEmail: "arka.wijaya@example.com",
    store: "Bakehouse Senopati",
    storeEmail: "support@bakehouse.example.com",
    item: "Pastry Rescue Pack x1",
    quantity: 1,
    grossAmount: 27500,
    discount: 8500,
    platformFee: 2750,
    ownerReceivable: 24750,
    paymentMethod: "QRIS",
    paymentRef: "QRIS-8794-16MAY",
    pickupCode: "QR-88B1Y",
    orderedAt: "16 Mei 2026, 08:40",
    pickupWindow: "20:00 - 21:00 WIB",
    location: "Bakehouse Senopati",
    status: "processing",
    settlement: "held",
    riskScore: 68,
  },
  {
    id: "TRX-78238",
    orderId: "SE-8739",
    customer: "Maya Lestari",
    customerEmail: "maya.lestari@example.com",
    store: "Dapur Bu Sari",
    storeEmail: "halo@dapur-busari.example.com",
    item: "Paket Nasi Rumahan x1",
    quantity: 1,
    grossAmount: 31000,
    discount: 9000,
    platformFee: 3100,
    ownerReceivable: 27900,
    paymentMethod: "OVO",
    paymentRef: "OVO-8739-15MAY",
    pickupCode: "QR-77C0Z",
    orderedAt: "15 Mei 2026, 18:30",
    pickupWindow: "19:00 - 20:30 WIB",
    location: "Dapur Bu Sari Cipete",
    status: "pickup",
    settlement: "pending",
    riskScore: 21,
  },
];

const timeline: TimelineItem[] = [
  {
    title: "Pembayaran diterima",
    description: "Gateway mengirim status paid ke sistem SurplusEats.",
    time: "09:12",
    tone: "emerald",
  },
  {
    title: "Order diteruskan ke restoran",
    description: "Owner menerima notifikasi dan mulai menyiapkan paket.",
    time: "09:13",
    tone: "blue",
  },
  {
    title: "Pickup window aktif",
    description: "Customer dapat menunjukkan QR pickup ke kasir.",
    time: "19:00",
    tone: "amber",
  },
  {
    title: "Settlement menunggu",
    description: "Saldo owner ditahan sampai dispute dan pickup final.",
    time: "Sekarang",
    tone: "gray",
  },
];

const toneClassName: Record<TimelineTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  gray: "bg-gray-100 text-gray-500 ring-gray-200",
};

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function StatusBadge({ status }: { status: TransactionStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700">
        <CheckCircle2 size={16} />
        Selesai
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-700">
        <Clock3 size={16} />
        Diproses
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-700">
      <PackageCheck size={16} />
      Pickup
    </span>
  );
}

function SettlementBadge({ settlement }: { settlement: SettlementStatus }) {
  if (settlement === "released") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
        Released
      </span>
    );
  }

  if (settlement === "held") {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
        Held
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
      Pending
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
        <Icon size={20} />
      </div>
      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 font-extrabold text-gray-950">
        {value}
      </p>
    </div>
  );
}

export default function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const transaction = useMemo(() => {
    return transactions.find((item) => item.id === params.id) ?? transactions[0];
  }, [params.id]);

  const [settlement, setSettlement] = useState<SettlementStatus>(
    transaction.settlement,
  );
  const [adminNote, setAdminNote] = useState(
    "Transaksi perlu dipantau sampai pickup, refund window, dan settlement owner final.",
  );

  const riskTone =
    transaction.riskScore >= 65
      ? "text-red-600"
      : transaction.riskScore >= 40
        ? "text-amber-600"
        : "text-emerald-600";

  const handleReleaseSettlement = () => {
    setSettlement("released");
    setAdminNote("Settlement dilepas. Saldo owner dapat masuk ke wallet.");
  };

  const handleHoldSettlement = () => {
    setSettlement("held");
    setAdminNote("Settlement ditahan sementara untuk proses audit transaksi.");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900 selection:bg-emerald-200">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-gray-900 text-white shadow-[12px_0_36px_rgba(0,0,0,0.08)] lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <ShieldCheck size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">
                  Surplus<span className="text-emerald-400">Admin</span>
                </p>
                <p className="text-xs font-semibold text-gray-400">
                  Transaction Review
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="px-3 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              Navigasi
            </p>
            <Link
              href="/admin/dashboard"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:bg-emerald-500/10 hover:text-white"
            >
              <ReceiptText size={20} className="text-gray-500" />
              Dashboard Admin
            </Link>
            <Link
              href={`/admin/transactions/${transaction.id}`}
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/10"
            >
              <CreditCard size={20} className="text-emerald-400" />
              Detail Transaksi
            </Link>
          </nav>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72">
          <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  aria-label="Kembali ke dashboard admin"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                    Transaction Detail
                  </p>
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-950 md:text-2xl">
                    {transaction.id}
                  </h1>
                </div>
              </div>

              <StatusBadge status={transaction.status} />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gray-950 text-white shadow-[0_14px_34px_rgba(17,24,39,0.18)]">
                        <CreditCard size={28} />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                            {transaction.paymentMethod}
                          </span>
                          <SettlementBadge settlement={settlement} />
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-extrabold text-gray-600">
                            {transaction.orderId}
                          </span>
                        </div>
                        <h2 className="truncate text-2xl font-extrabold tracking-tight text-gray-950">
                          {transaction.item}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
                          Detail pembayaran, pickup, dan settlement untuk
                          transaksi customer ke owner.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-700">
                      {transaction.orderedAt}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <SummaryCard
                      icon={UserRound}
                      label="Customer"
                      value={transaction.customer}
                    />
                    <SummaryCard
                      icon={Store}
                      label="Restoran"
                      value={transaction.store}
                    />
                    <SummaryCard
                      icon={MapPin}
                      label="Lokasi Pickup"
                      value={transaction.location}
                    />
                    <SummaryCard
                      icon={Clock3}
                      label="Pickup Window"
                      value={transaction.pickupWindow}
                    />
                    <SummaryCard
                      icon={PackageCheck}
                      label="Pickup Code"
                      value={transaction.pickupCode}
                    />
                    <SummaryCard
                      icon={CreditCard}
                      label="Payment Ref"
                      value={transaction.paymentRef}
                    />
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6">
                    <h2 className="text-xl font-extrabold text-gray-950">
                      Timeline Transaksi
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      Alur pembayaran sampai settlement owner.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {timeline.map((item, index) => (
                      <div key={item.title} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${toneClassName[item.tone]}`}
                          >
                            <Clock3 size={18} />
                          </div>
                          {index < timeline.length - 1 ? (
                            <div className="mt-3 h-full min-h-8 w-px bg-gray-100" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 pb-2">
                          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                            <h3 className="text-sm font-extrabold text-gray-950">
                              {item.title}
                            </h3>
                            <span className="text-xs font-bold text-gray-400">
                              {item.time}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Breakdown Dana
                  </h2>
                  <div className="mt-5 space-y-4">
                    {[
                      ["Gross Amount", formatRp(transaction.grossAmount)],
                      ["Diskon Customer", `-${formatRp(transaction.discount)}`],
                      ["Platform Fee", formatRp(transaction.platformFee)],
                      ["Saldo Owner", formatRp(transaction.ownerReceivable)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                      >
                        <span className="text-sm font-bold text-gray-500">
                          {label}
                        </span>
                        <strong className="text-sm font-extrabold text-gray-950">
                          {value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-500">
                        Risk Score
                      </p>
                      <h2 className={`mt-1 text-4xl font-extrabold ${riskTone}`}>
                        {transaction.riskScore}
                      </h2>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <AlertTriangle size={22} />
                    </div>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        transaction.riskScore >= 65
                          ? "bg-red-500"
                          : transaction.riskScore >= 40
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${transaction.riskScore}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm leading-6 font-medium text-gray-500">
                    Skor simulasi dari payment status, pickup, refund history,
                    dan settlement owner.
                  </p>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Tindakan Admin
                  </h2>
                  <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
                    Tindakan ini masih simulasi UI sampai backend tersedia.
                  </p>

                  <label
                    htmlFor="admin-note"
                    className="mt-5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase"
                  >
                    Catatan Internal
                  </label>
                  <textarea
                    id="admin-note"
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={handleReleaseSettlement}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(16,185,129,0.24)] transition-colors hover:bg-emerald-600"
                    >
                      <WalletCards size={17} />
                      Release Settlement
                    </button>
                    <button
                      type="button"
                      onClick={handleHoldSettlement}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <XCircle size={17} />
                      Hold Settlement
                    </button>
                    <Link
                      href={`/admin/refunds/${transaction.orderId}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <RefreshCcw size={17} />
                      Buka Refund
                    </Link>
                    <a
                      href={`mailto:${transaction.customerEmail}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <MessageSquareText size={17} />
                      Hubungi Customer
                    </a>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
