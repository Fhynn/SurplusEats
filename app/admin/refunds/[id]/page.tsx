"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  MessageSquareText,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Store,
  User,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

const refundCases = [
  {
    id: "SE-8821",
    customer: "Nadia Putri",
    customerEmail: "nadia.putri@example.com",
    store: "Green Bowl Co.",
    storeEmail: "ops@greenbowl.example.com",
    reason: "Makanan tidak sesuai foto",
    amount: 42000,
    paymentMethod: "GoPay",
    submittedAt: "16 Mei 2026, 09:12",
    orderTime: "15 Mei 2026, 19:30",
    pickupWindow: "19:00 - 20:00 WIB",
    status: "Investigasi",
    item: "Salad Bowl Surplus x2",
    customerNote:
      "Produk yang diterima berbeda dari foto dan salah satu bowl tidak memiliki topping protein seperti deskripsi.",
    storeResponse:
      "Stok topping ayam habis menjelang pickup. Tim toko mengganti dengan telur tanpa konfirmasi ke pelanggan.",
  },
  {
    id: "SE-8794",
    customer: "Arka Wijaya",
    customerEmail: "arka.wijaya@example.com",
    store: "Bakehouse Senopati",
    storeEmail: "support@bakehouse.example.com",
    reason: "Pickup dibatalkan restoran",
    amount: 27500,
    paymentMethod: "QRIS",
    submittedAt: "16 Mei 2026, 08:40",
    orderTime: "15 Mei 2026, 20:00",
    pickupWindow: "20:00 - 21:00 WIB",
    status: "Investigasi",
    item: "Pastry Rescue Pack x1",
    customerNote:
      "Toko menutup pickup lebih awal dan meminta saya membatalkan dari aplikasi.",
    storeResponse:
      "Outlet kehabisan stok dan staf menutup toko karena pemadaman listrik area setempat.",
  },
] as const;

const evidenceFiles = [
  {
    title: "Foto produk diterima",
    type: "image",
    filename: "customer_evidence_01.jpg",
    status: "Valid",
  },
  {
    title: "Struk pembayaran",
    type: "receipt",
    filename: "receipt_SE-8821.pdf",
    status: "Terverifikasi",
  },
  {
    title: "Catatan pickup toko",
    type: "document",
    filename: "store_pickup_log.pdf",
    status: "Perlu cek",
  },
] as const;

const timeline = [
  {
    title: "Refund diajukan customer",
    description: "Customer mengirim alasan dan bukti foto dari aplikasi.",
    time: "09:12",
    tone: "blue",
  },
  {
    title: "Sistem menahan saldo transaksi",
    description: "Saldo owner belum bisa dicairkan sampai dispute selesai.",
    time: "09:13",
    tone: "amber",
  },
  {
    title: "Menunggu keputusan admin",
    description: "Admin perlu menyetujui refund penuh, sebagian, atau menolak.",
    time: "Sekarang",
    tone: "emerald",
  },
] as const;

const messages = [
  {
    from: "Customer",
    text: "Saya menerima salad tanpa topping ayam, padahal di deskripsi tertulis lengkap.",
    time: "09:12",
  },
  {
    from: "Owner",
    text: "Kami mengganti topping karena stok habis. Seharusnya pelanggan dikonfirmasi dulu.",
    time: "09:25",
  },
  {
    from: "Admin Note",
    text: "Ada indikasi produk tidak sesuai deskripsi. Refund sebagian atau voucher kompensasi layak dipertimbangkan.",
    time: "09:38",
  },
] as const;

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function AdminRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const [decision, setDecision] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const [adminNote, setAdminNote] = useState(
    "Produk tidak sesuai deskripsi. Refund direkomendasikan karena penggantian item tidak dikonfirmasi ke customer.",
  );

  const refund = useMemo(() => {
    return refundCases.find((item) => item.id === params.id) ?? refundCases[0];
  }, [params.id]);

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
                  Refund Review
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
              href="/admin/dashboard"
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/10"
            >
              <RefreshCcw size={20} className="text-emerald-400" />
              Detail Refund
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
                    Refund Case
                  </p>
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-950 md:text-2xl">
                    {refund.id}
                  </h1>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold ${
                  decision === "approved"
                    ? "bg-emerald-50 text-emerald-700"
                    : decision === "rejected"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {decision === "approved" ? (
                  <CheckCircle2 size={16} />
                ) : decision === "rejected" ? (
                  <XCircle size={16} />
                ) : (
                  <Clock3 size={16} />
                )}
                {decision === "approved"
                  ? "Refund Disetujui"
                  : decision === "rejected"
                    ? "Refund Ditolak"
                    : refund.status}
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-950">
                        Ringkasan Dispute
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        Review data transaksi, alasan komplain, dan bukti sebelum
                        mengambil keputusan.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600">
                      {refund.reason}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] bg-gray-50 p-5">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                        <User size={21} />
                      </div>
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Customer
                      </p>
                      <h3 className="mt-1 text-sm font-extrabold text-gray-950">
                        {refund.customer}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {refund.customerEmail}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-gray-50 p-5">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                        <Store size={21} />
                      </div>
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Restoran
                      </p>
                      <h3 className="mt-1 text-sm font-extrabold text-gray-950">
                        {refund.store}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {refund.storeEmail}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-gray-900 p-5 text-white">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                        <WalletCards size={21} />
                      </div>
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Nominal Refund
                      </p>
                      <h3 className="mt-1 text-2xl font-extrabold">
                        {formatRp(refund.amount)}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        via {refund.paymentMethod}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
                      <FileText size={20} className="text-emerald-500" />
                      Detail Order
                    </h2>
                    <dl className="space-y-4">
                      {[
                        ["Item", refund.item],
                        ["Order dibuat", refund.orderTime],
                        ["Jadwal pickup", refund.pickupWindow],
                        ["Refund diajukan", refund.submittedAt],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3"
                        >
                          <dt className="text-xs font-bold text-gray-400">
                            {label}
                          </dt>
                          <dd className="max-w-[60%] text-right text-sm font-extrabold text-gray-900">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
                      <MessageSquareText size={20} className="text-blue-500" />
                      Pernyataan Pihak
                    </h2>
                    <div className="space-y-4">
                      <div className="rounded-[20px] border border-red-100 bg-red-50 p-4">
                        <p className="mb-2 text-xs font-extrabold text-red-600">
                          Catatan Customer
                        </p>
                        <p className="text-sm leading-6 font-semibold text-red-900">
                          {refund.customerNote}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-blue-100 bg-blue-50 p-4">
                        <p className="mb-2 text-xs font-extrabold text-blue-600">
                          Respons Owner
                        </p>
                        <p className="text-sm leading-6 font-semibold text-blue-900">
                          {refund.storeResponse}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                    Bukti & Lampiran
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {evidenceFiles.map((file) => {
                      const Icon =
                        file.type === "image"
                          ? ImageIcon
                          : file.type === "receipt"
                            ? ReceiptText
                            : FileText;

                      return (
                        <article
                          key={file.filename}
                          className="rounded-[24px] border border-gray-100 bg-gray-50 p-4"
                        >
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white text-emerald-600 shadow-sm">
                            <Icon size={25} />
                          </div>
                          <h3 className="text-sm font-extrabold text-gray-950">
                            {file.title}
                          </h3>
                          <p className="mt-1 truncate text-xs font-semibold text-gray-500">
                            {file.filename}
                          </p>
                          <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-extrabold text-gray-600 shadow-sm">
                            {file.status}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                    Log Percakapan
                  </h2>
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={`${message.from}-${message.time}`}
                        className="rounded-[20px] border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <p className="text-sm font-extrabold text-gray-950">
                            {message.from}
                          </p>
                          <span className="text-xs font-bold text-gray-400">
                            {message.time}
                          </span>
                        </div>
                        <p className="text-sm leading-6 font-medium text-gray-600">
                          {message.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                    Timeline Kasus
                  </h2>
                  <div className="relative space-y-5 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-0.5 before:bg-gray-100">
                    {timeline.map((item) => (
                      <div key={item.title} className="relative flex gap-4">
                        <div
                          className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white ${
                            item.tone === "blue"
                              ? "bg-blue-500"
                              : item.tone === "amber"
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                          }`}
                        >
                          <Clock3 size={15} className="text-white" />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-gray-950">
                              {item.title}
                            </h3>
                            <span className="text-[10px] font-bold text-gray-400">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-xs leading-5 font-medium text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="mb-3 text-lg font-extrabold text-gray-950">
                    Keputusan Admin
                  </h2>
                  <p className="mb-5 text-sm leading-6 font-medium text-gray-500">
                    Catatan ini akan masuk ke audit log dan dikirim ke customer
                    serta owner.
                  </p>
                  <textarea
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    rows={5}
                    className="mb-5 w-full resize-none rounded-[22px] border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setDecision("approved")}
                      disabled={!adminNote.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-200"
                    >
                      <CheckCircle2 size={18} />
                      Approve Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision("rejected")}
                      disabled={!adminNote.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle size={18} />
                      Tolak Refund
                    </button>
                  </div>
                </section>

                <section className="rounded-[28px] border border-amber-100 bg-amber-50 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <h3 className="text-sm font-extrabold text-amber-900">
                        Risiko Operasional
                      </h3>
                      <p className="mt-1 text-xs leading-5 font-semibold text-amber-800">
                        Jika refund disetujui, saldo owner untuk transaksi ini
                        akan dikurangi dan customer menerima dana kembali sesuai
                        metode pembayaran.
                      </p>
                    </div>
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
