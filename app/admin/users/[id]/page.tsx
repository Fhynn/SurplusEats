"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Store,
  UserCheck,
  UserRound,
  UserX,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type AccountRole = "customer" | "owner";
type AccountStatus = "active" | "banned";
type ActivityTone = "emerald" | "blue" | "amber" | "red" | "gray";

type AdminUserDetail = {
  id: string;
  joinedAt: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: AccountRole;
  status: AccountStatus;
  banReason?: string;
  lastLogin: string;
  verification: string;
  accountHealth: string;
  totalOrders: number;
  totalSpent: number;
  refundRequests: number;
  pickupRate: number;
  riskScore: number;
  linkedStore?: string;
};

type AccountActivity = {
  id: string;
  userId: string;
  title: string;
  description: string;
  time: string;
  tone: ActivityTone;
};

const adminUsers: AdminUserDetail[] = [
  {
    id: "USR-10481",
    joinedAt: "30 Apr 2026",
    name: "Nadia Putri",
    email: "nadia.putri@example.com",
    phone: "+62 812-4401-9210",
    city: "Jakarta Selatan",
    role: "customer",
    status: "active",
    lastLogin: "16 Mei 2026, 09:40",
    verification: "Email & nomor HP terverifikasi",
    accountHealth: "Normal",
    totalOrders: 28,
    totalSpent: 684000,
    refundRequests: 1,
    pickupRate: 96,
    riskScore: 18,
  },
  {
    id: "OWN-09342",
    joinedAt: "28 Apr 2026",
    name: "Bakehouse Bakery",
    email: "owner@bakehouse.example.com",
    phone: "+62 811-2219-7004",
    city: "Senopati, Jakarta Selatan",
    role: "owner",
    status: "active",
    lastLogin: "16 Mei 2026, 10:18",
    verification: "Dokumen toko disetujui",
    accountHealth: "Toko aktif",
    totalOrders: 142,
    totalSpent: 4920000,
    refundRequests: 2,
    pickupRate: 94,
    riskScore: 22,
    linkedStore: "Bakehouse Bakery",
  },
  {
    id: "USR-10227",
    joinedAt: "24 Apr 2026",
    name: "Arka Wijaya",
    email: "arka.wijaya@example.com",
    phone: "+62 857-7731-2048",
    city: "Tangerang Selatan",
    role: "customer",
    status: "banned",
    banReason: "Penyalahgunaan voucher refund.",
    lastLogin: "13 Mei 2026, 21:10",
    verification: "Email terverifikasi",
    accountHealth: "Butuh review",
    totalOrders: 11,
    totalSpent: 296000,
    refundRequests: 5,
    pickupRate: 64,
    riskScore: 86,
  },
  {
    id: "OWN-09118",
    joinedAt: "20 Apr 2026",
    name: "Kopi Sore Kemang",
    email: "admin@kopisore.example.com",
    phone: "+62 813-4401-7730",
    city: "Kemang, Jakarta Selatan",
    role: "owner",
    status: "active",
    lastLogin: "16 Mei 2026, 08:55",
    verification: "Dokumen toko disetujui",
    accountHealth: "Normal",
    totalOrders: 88,
    totalSpent: 2187000,
    refundRequests: 1,
    pickupRate: 91,
    riskScore: 26,
    linkedStore: "Kopi Sore Kemang",
  },
  {
    id: "USR-10091",
    joinedAt: "18 Apr 2026",
    name: "Maya Lestari",
    email: "maya.lestari@example.com",
    phone: "+62 812-9101-3376",
    city: "Depok",
    role: "customer",
    status: "active",
    lastLogin: "15 Mei 2026, 19:22",
    verification: "Email & nomor HP terverifikasi",
    accountHealth: "Normal",
    totalOrders: 19,
    totalSpent: 471000,
    refundRequests: 1,
    pickupRate: 100,
    riskScore: 12,
  },
  {
    id: "OWN-08977",
    joinedAt: "15 Apr 2026",
    name: "Dapur Bu Sari",
    email: "halo@dapur-busari.example.com",
    phone: "+62 822-1093-7741",
    city: "Cipete, Jakarta Selatan",
    role: "owner",
    status: "banned",
    banReason: "Dokumen toko tidak valid setelah audit.",
    lastLogin: "10 Mei 2026, 13:05",
    verification: "Dokumen ditolak setelah audit",
    accountHealth: "Dibekukan",
    totalOrders: 36,
    totalSpent: 1058000,
    refundRequests: 7,
    pickupRate: 72,
    riskScore: 91,
    linkedStore: "Dapur Bu Sari",
  },
];

const accountActivities: AccountActivity[] = [
  {
    id: "ACT-991",
    userId: "USR-10481",
    title: "Checkout berhasil",
    description: "Membayar order SFM-99A2X menggunakan QRIS.",
    time: "16 Mei 2026, 09:32",
    tone: "emerald",
  },
  {
    id: "ACT-990",
    userId: "USR-10481",
    title: "Refund ditinjau",
    description: "Mengirim bukti untuk dispute SE-8821.",
    time: "16 Mei 2026, 09:12",
    tone: "amber",
  },
  {
    id: "ACT-989",
    userId: "OWN-09342",
    title: "Status pickup diperbarui",
    description: "Order SFM-99A2X dipindahkan ke Siap Diambil.",
    time: "16 Mei 2026, 10:02",
    tone: "emerald",
  },
  {
    id: "ACT-988",
    userId: "OWN-09342",
    title: "Menu surplus ditambah",
    description: "Paket Roti Artisan Sourdough dibuat aktif.",
    time: "16 Mei 2026, 08:21",
    tone: "blue",
  },
  {
    id: "ACT-987",
    userId: "USR-10227",
    title: "Akun dibekukan",
    description: "Sistem menandai pola refund dan penggunaan voucher berulang.",
    time: "14 Mei 2026, 22:10",
    tone: "red",
  },
  {
    id: "ACT-986",
    userId: "USR-10227",
    title: "Percobaan voucher gagal",
    description: "Kode voucher refund tidak bisa digunakan karena limit risiko.",
    time: "14 Mei 2026, 21:58",
    tone: "amber",
  },
  {
    id: "ACT-985",
    userId: "OWN-09118",
    title: "Saldo dicairkan",
    description: "Owner mencairkan saldo hasil transaksi minggu ini.",
    time: "16 Mei 2026, 08:55",
    tone: "emerald",
  },
  {
    id: "ACT-984",
    userId: "USR-10091",
    title: "Ulasan dikirim",
    description: "Memberi rating 5 untuk Dapur Bu Sari.",
    time: "15 Mei 2026, 20:10",
    tone: "blue",
  },
  {
    id: "ACT-983",
    userId: "OWN-08977",
    title: "Audit dokumen gagal",
    description: "Nomor izin toko tidak cocok dengan dokumen upload.",
    time: "11 Mei 2026, 11:44",
    tone: "red",
  },
];

const fallbackActivities: AccountActivity[] = [
  {
    id: "ACT-FALLBACK-1",
    userId: "fallback",
    title: "Aktivitas akun tercatat",
    description: "Belum ada aktivitas spesifik untuk akun ini di mock data.",
    time: "Sekarang",
    tone: "gray",
  },
];

const toneClassName: Record<ActivityTone, string> = {
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

function StatusBadge({ status }: { status: AccountStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700">
        <CheckCircle2 size={16} />
        Aktif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700">
      <XCircle size={16} />
      Banned
    </span>
  );
}

function RoleBadge({ role }: { role: AccountRole }) {
  if (role === "owner") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs font-extrabold text-purple-700">
        <Store size={14} />
        Owner
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
      <UserRound size={14} />
      Customer
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-gray-100 py-4">
      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();

  const user = useMemo(() => {
    return adminUsers.find((item) => item.id === params.id) ?? adminUsers[0];
  }, [params.id]);

  const [status, setStatus] = useState<AccountStatus>(user.status);
  const [adminNote, setAdminNote] = useState(
    user.banReason ??
      "Akun terlihat normal. Pantau refund, pickup rate, dan aktivitas login terbaru sebelum mengambil tindakan.",
  );

  const activities = useMemo(() => {
    const currentActivities = accountActivities.filter(
      (activity) => activity.userId === user.id,
    );

    return currentActivities.length > 0 ? currentActivities : fallbackActivities;
  }, [user.id]);

  const isBanned = status === "banned";
  const roleDescription =
    user.role === "owner"
      ? "Akun ini memiliki akses dashboard restoran, pengelolaan menu, pesanan, dan pencairan saldo."
      : "Akun ini memiliki akses aplikasi customer, checkout, riwayat pesanan, refund, dan voucher.";
  const riskTone =
    user.riskScore >= 80
      ? "text-red-600"
      : user.riskScore >= 50
        ? "text-amber-600"
        : "text-emerald-600";

  const handleSuspend = () => {
    setStatus("banned");
    setAdminNote((currentNote) =>
      currentNote.trim()
        ? currentNote
        : "Akun dibekukan sementara untuk proses review admin.",
    );
  };

  const handleRevokeBan = () => {
    setStatus("active");
    setAdminNote("Ban dicabut. Akun kembali aktif dan tetap dipantau admin.");
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
                  User Control
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
              href={`/admin/users/${user.id}`}
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/10"
            >
              <UserRound size={20} className="text-emerald-400" />
              Detail Pengguna
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
                    Account Detail
                  </p>
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-950 md:text-2xl">
                    {user.name}
                  </h1>
                </div>
              </div>

              <StatusBadge status={status} />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gray-950 text-white shadow-[0_14px_34px_rgba(17,24,39,0.18)]">
                        {user.role === "owner" ? (
                          <Store size={28} />
                        ) : (
                          <UserRound size={28} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <RoleBadge role={user.role} />
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-extrabold text-gray-600">
                            {user.id}
                          </span>
                        </div>
                        <h2 className="truncate text-2xl font-extrabold tracking-tight text-gray-950">
                          {user.name}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
                          {roleDescription}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-700">
                      Bergabung {user.joinedAt}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-x-6 md:grid-cols-2">
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Nomor HP" value={user.phone} />
                    <InfoRow label="Lokasi" value={user.city} />
                    <InfoRow label="Login Terakhir" value={user.lastLogin} />
                    <InfoRow label="Verifikasi" value={user.verification} />
                    <InfoRow
                      label={user.role === "owner" ? "Nama Toko" : "Kesehatan Akun"}
                      value={user.linkedStore ?? user.accountHealth}
                    />
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-950">
                        Aktivitas Akun
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        Riwayat aktivitas penting untuk keputusan support dan
                        audit admin.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-gray-50 px-4 py-2 text-sm font-extrabold text-gray-600">
                      {activities.length} aktivitas
                    </span>
                  </div>

                  <div className="space-y-5">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${toneClassName[activity.tone]}`}
                          >
                            <Activity size={18} />
                          </div>
                          {index < activities.length - 1 ? (
                            <div className="mt-3 h-full min-h-8 w-px bg-gray-100" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 pb-2">
                          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                            <h3 className="text-sm font-extrabold text-gray-950">
                              {activity.title}
                            </h3>
                            <span className="text-xs font-bold text-gray-400">
                              {activity.time}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
                            {activity.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-500">
                        Risk Score
                      </p>
                      <h2 className={`mt-1 text-4xl font-extrabold ${riskTone}`}>
                        {user.riskScore}
                      </h2>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <AlertTriangle size={22} />
                    </div>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        user.riskScore >= 80
                          ? "bg-red-500"
                          : user.riskScore >= 50
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${user.riskScore}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm leading-6 font-medium text-gray-500">
                    Skor dihitung dari jumlah refund, pickup rate, status audit,
                    dan pola aktivitas akun.
                  </p>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Ringkasan Transaksi
                  </h2>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500">
                        <ReceiptText size={17} />
                        Total Order
                      </span>
                      <strong className="text-sm font-extrabold text-gray-950">
                        {user.totalOrders}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500">
                        <WalletCards size={17} />
                        Nilai Transaksi
                      </span>
                      <strong className="text-sm font-extrabold text-gray-950">
                        {formatRp(user.totalSpent)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500">
                        <Clock3 size={17} />
                        Pickup Rate
                      </span>
                      <strong className="text-sm font-extrabold text-emerald-600">
                        {user.pickupRate}%
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500">
                        <AlertTriangle size={17} />
                        Refund Request
                      </span>
                      <strong className="text-sm font-extrabold text-gray-950">
                        {user.refundRequests}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Tindakan Admin
                  </h2>
                  <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
                    Catatan ini mensimulasikan keputusan admin sebelum data
                    tersambung ke backend.
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
                    {isBanned ? (
                      <button
                        type="button"
                        onClick={handleRevokeBan}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(16,185,129,0.24)] transition-colors hover:bg-emerald-600"
                      >
                        <UserCheck size={17} />
                        Cabut Ban
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSuspend}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50"
                      >
                        <UserX size={17} />
                        Ban / Suspend Akun
                      </button>
                    )}
                    <a
                      href={`mailto:${user.email}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Mail size={17} />
                      Hubungi Pengguna
                    </a>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Akses & Lokasi
                  </h2>
                  <div className="mt-5 space-y-4 text-sm font-bold text-gray-600">
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-gray-400" />
                      {user.city}
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={18} className="text-gray-400" />
                      {user.verification}
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock3 size={18} className="text-gray-400" />
                      {user.lastLogin}
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
