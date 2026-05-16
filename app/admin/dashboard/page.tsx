"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileBadge2,
  FileCheck2,
  LayoutDashboard,
  Leaf,
  PieChart,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserCheck,
  UserX,
  Users,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

type AdminTab =
  | "dashboard"
  | "users"
  | "verification"
  | "transactions"
  | "analytics";

type VerificationStore = {
  id: string;
  date: string;
  storeName: string;
  category: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
};

type AdminUser = {
  id: string;
  joinedAt: string;
  name: string;
  email: string;
  role: "customer" | "owner";
  status: "active" | "banned";
  banReason?: string;
};

const stats = [
  {
    label: "Total Pengguna",
    value: "48.392",
    trend: "+12%",
    icon: Users,
    iconWrapClassName: "bg-blue-50",
    iconClassName: "text-blue-500",
  },
  {
    label: "Restoran",
    value: "1.284",
    trend: "+8%",
    icon: Store,
    iconWrapClassName: "bg-emerald-50",
    iconClassName: "text-emerald-500",
  },
  {
    label: "Transaksi",
    value: "92.740",
    trend: "+18%",
    icon: WalletCards,
    iconWrapClassName: "bg-purple-50",
    iconClassName: "text-purple-500",
  },
  {
    label: "Food Saved",
    value: "18.6 Ton",
    trend: "+21%",
    icon: Leaf,
    iconWrapClassName: "bg-green-50",
    iconClassName: "text-green-500",
  },
];

const attentionItems = [
  {
    title: "Dispute refund order #SE-8821",
    meta: "Pembeli menunggu respon admin",
    level: "Tinggi",
  },
  {
    title: "Restoran baru perlu verifikasi",
    meta: "7 dokumen belum direview hari ini",
    level: "Sedang",
  },
  {
    title: "Lonjakan pembatalan pickup",
    meta: "Area Jakarta Selatan naik 6%",
    level: "Pantau",
  },
];

const recentTransactions = [
  {
    id: "TRX-78291",
    customer: "Nadia Putri",
    store: "Green Bowl Co.",
    total: "Rp42.000",
    status: "Selesai",
  },
  {
    id: "TRX-78262",
    customer: "Arka Wijaya",
    store: "Bakehouse Senopati",
    total: "Rp27.500",
    status: "Diproses",
  },
  {
    id: "TRX-78238",
    customer: "Maya Lestari",
    store: "Dapur Bu Sari",
    total: "Rp31.000",
    status: "Pickup",
  },
] as const;

const refundDisputes = [
  {
    orderId: "SE-8821",
    customer: "Nadia Putri",
    resto: "Green Bowl Co.",
    reason: "Makanan tidak sesuai foto",
    total: "Rp42.000",
  },
  {
    orderId: "SE-8794",
    customer: "Arka Wijaya",
    resto: "Bakehouse Senopati",
    reason: "Pickup dibatalkan restoran",
    total: "Rp27.500",
  },
  {
    orderId: "SE-8739",
    customer: "Maya Lestari",
    resto: "Dapur Bu Sari",
    reason: "Pesanan kurang item",
    total: "Rp31.000",
  },
  {
    orderId: "SE-8702",
    customer: "Reza Ananda",
    resto: "Kopi Sore Kemang",
    reason: "Kualitas produk menurun",
    total: "Rp18.000",
  },
] as const;

const weeklySales = [
  { day: "Senin", value: 58 },
  { day: "Selasa", value: 72 },
  { day: "Rabu", value: 46 },
  { day: "Kamis", value: 88 },
  { day: "Jumat", value: 68 },
  { day: "Sabtu", value: 96 },
  { day: "Minggu", value: 76 },
] as const;

const foodDistribution = [
  {
    label: "Roti",
    value: 45,
    className: "bg-blue-500",
    textClassName: "text-blue-600",
  },
  {
    label: "Nasi",
    value: 30,
    className: "bg-amber-400",
    textClassName: "text-amber-600",
  },
  {
    label: "Lainnya",
    value: 25,
    className: "bg-purple-500",
    textClassName: "text-purple-600",
  },
] as const;

const initialAdminUsers: AdminUser[] = [
  {
    id: "USR-10481",
    joinedAt: "30 Apr 2026",
    name: "Nadia Putri",
    email: "nadia.putri@example.com",
    role: "customer",
    status: "active",
  },
  {
    id: "OWN-09342",
    joinedAt: "28 Apr 2026",
    name: "Bakehouse Bakery",
    email: "owner@bakehouse.example.com",
    role: "owner",
    status: "active",
  },
  {
    id: "USR-10227",
    joinedAt: "24 Apr 2026",
    name: "Arka Wijaya",
    email: "arka.wijaya@example.com",
    role: "customer",
    status: "banned",
    banReason: "Penyalahgunaan voucher refund.",
  },
  {
    id: "OWN-09118",
    joinedAt: "20 Apr 2026",
    name: "Kopi Sore Kemang",
    email: "admin@kopisore.example.com",
    role: "owner",
    status: "active",
  },
  {
    id: "USR-10091",
    joinedAt: "18 Apr 2026",
    name: "Maya Lestari",
    email: "maya.lestari@example.com",
    role: "customer",
    status: "active",
  },
  {
    id: "OWN-08977",
    joinedAt: "15 Apr 2026",
    name: "Dapur Bu Sari",
    email: "halo@dapur-busari.example.com",
    role: "owner",
    status: "banned",
    banReason: "Dokumen toko tidak valid setelah audit.",
  },
];

const verificationStores: VerificationStore[] = [
  {
    id: "UMKM-24081",
    date: "30 Apr 2026",
    storeName: "Warung Nasi Bu Rini",
    category: "Masakan Rumahan",
    owner: "Rini Handayani",
    email: "rini.handayani@example.com",
    phone: "+62 812-2219-8821",
    address:
      "Jl. Cipete Raya No. 18, Cilandak, Jakarta Selatan, DKI Jakarta 12410",
  },
  {
    id: "UMKM-24079",
    date: "30 Apr 2026",
    storeName: "Kopi Sore Kemang",
    category: "Kafe & Minuman",
    owner: "Aditya Mahendra",
    email: "aditya.mahendra@example.com",
    phone: "+62 813-4401-7730",
    address:
      "Jl. Kemang Timur No. 55, Mampang Prapatan, Jakarta Selatan, DKI Jakarta 12730",
  },
  {
    id: "UMKM-24073",
    date: "29 Apr 2026",
    storeName: "Roti Lembut Nana",
    category: "Bakery",
    owner: "Nana Kartika",
    email: "nana.kartika@example.com",
    phone: "+62 857-1120-9452",
    address:
      "Jl. Bintaro Utama Sektor 3A No. 12, Pondok Aren, Tangerang Selatan 15225",
  },
  {
    id: "UMKM-24070",
    date: "29 Apr 2026",
    storeName: "Mie Ayam Pak Darto",
    category: "Noodle Shop",
    owner: "Sudarsono",
    email: "sudarsono@example.com",
    phone: "+62 822-9102-1140",
    address:
      "Jl. Tebet Barat Dalam Raya No. 7, Tebet, Jakarta Selatan, DKI Jakarta 12810",
  },
] as const;

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "users",
    label: "Kelola Pengguna",
    icon: Users,
  },
  {
    id: "verification",
    label: "Verifikasi",
    icon: FileBadge2,
  },
  {
    id: "transactions",
    label: "Transaksi & Refund",
    icon: ReceiptText,
  },
  {
    id: "analytics",
    label: "Laporan Analitik",
    icon: BarChart3,
  },
] as const;

const documentFiles = [
  {
    label: "KTP",
    name: "ktp_pemilik.pdf",
  },
  {
    label: "Foto Toko",
    name: "foto_toko_depan.jpg",
  },
  {
    label: "Surat Izin",
    name: "surat_izin_usaha.pdf",
  },
] as const;

function StatusBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
      <Clock3 size={13} />
      Menunggu
    </span>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  if (role === "customer") {
    return (
      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-600">
        Customer
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-extrabold text-purple-600">
      Owner
    </span>
  );
}

function UserStatus({ user }: { user: AdminUser }) {
  if (user.status === "active") {
    return (
      <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-600">
        Aktif
      </span>
    );
  }

  return (
    <div>
      <span className="inline-flex rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600">
        Banned
      </span>
      <p className="mt-1.5 max-w-52 text-xs leading-5 font-semibold text-gray-500">
        {user.banReason}
      </p>
    </div>
  );
}

const pageTitleByTab: Record<AdminTab, string> = {
  dashboard: "Ringkasan Operasional",
  users: "Kelola Pengguna",
  verification: "Verifikasi Restoran",
  transactions: "Kelola Transaksi & Refund",
  analytics: "Laporan & Analitik",
};

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(initialAdminUsers);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<VerificationStore | null>(
    null,
  );
  const [selectedUserForBan, setSelectedUserForBan] =
    useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const filteredAdminUsers = adminUsers.filter((user) => {
    const normalizedQuery = userSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return [user.id, user.name, user.email, user.role].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });

  const handleOpenBanModal = (user: AdminUser) => {
    setSelectedUserForBan(user);
    setBanReason("");
  };

  const handleCloseBanModal = () => {
    setSelectedUserForBan(null);
    setBanReason("");
  };

  const handleConfirmBan = () => {
    const trimmedReason = banReason.trim();

    if (!selectedUserForBan || !trimmedReason) {
      return;
    }

    setAdminUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === selectedUserForBan.id
          ? {
              ...user,
              status: "banned",
              banReason: trimmedReason,
            }
          : user,
      ),
    );
    handleCloseBanModal();
  };

  const handleRevokeBan = (userId: string) => {
    setAdminUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              status: "active",
              banReason: undefined,
            }
          : user,
      ),
    );
  };

  useEffect(() => {
    if (!selectedStore && !selectedUserForBan) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedStore(null);
        setSelectedUserForBan(null);
        setBanReason("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedStore, selectedUserForBan]);

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
                  Control Center
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="px-3 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              Navigasi
            </p>
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/10"
                      : "text-gray-400 hover:bg-emerald-500/10 hover:text-white"
                  }`}
                >
                  <Icon
                    size={20}
                    className={isActive ? "text-emerald-400" : "text-gray-500"}
                  />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <Link
              href="/admin/settings"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:bg-emerald-500/10 hover:text-white"
            >
              <Settings size={20} className="text-gray-500" />
              Pengaturan Admin
            </Link>
          </div>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72">
          <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur md:px-8">
            <div className="flex items-center gap-4">
              <div className="relative max-w-2xl flex-1">
                <Search
                  size={19}
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Cari pengguna, restoran, transaksi..."
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <Link
                href="/admin/notifications"
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50"
                title="Notifikasi"
              >
                <Bell size={20} />
                <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              </Link>
              <Link
                href="/admin/settings"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50"
                title="Pengaturan"
              >
                <Settings size={20} />
              </Link>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-bold text-emerald-600">
                    Web Dashboard Admin
                  </p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950 md:text-3xl">
                    {pageTitleByTab[activeTab]}
                  </h1>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 size={16} />
                  Sistem aktif
                </div>
              </div>

              {activeTab === "dashboard" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => {
                      const Icon = stat.icon;

                      return (
                        <div
                          key={stat.label}
                          className="relative overflow-hidden rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                        >
                          <div
                            className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconWrapClassName}`}
                          >
                            <Icon size={24} className={stat.iconClassName} />
                          </div>
                          <p className="text-sm font-bold text-gray-500">
                            {stat.label}
                          </p>
                          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
                            {stat.value}
                          </h2>
                          <span className="absolute top-6 right-6 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-600">
                            <ArrowUpRight size={13} />
                            {stat.trend}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-extrabold text-gray-950">
                            Butuh Perhatian
                          </h2>
                          <p className="mt-1 text-sm font-medium text-gray-500">
                            Dispute dan isu operasional prioritas.
                          </p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
                          <AlertTriangle size={21} className="text-red-500" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        {attentionItems.map((item) => (
                          <div
                            key={item.title}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-gray-900">
                                {item.title}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                {item.meta}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-gray-600 shadow-sm">
                              {item.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                      <div className="border-b border-gray-100 p-6">
                        <h2 className="text-lg font-extrabold text-gray-950">
                          Transaksi Terbaru
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                          Aktivitas pembayaran dan pickup terkini.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-gray-100 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                              <th className="px-6 py-4">ID</th>
                              <th className="px-6 py-4">Customer</th>
                              <th className="px-6 py-4">Restoran</th>
                              <th className="px-6 py-4">Total</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {recentTransactions.map((transaction) => (
                              <tr
                                key={transaction.id}
                                className="transition-colors hover:bg-gray-50"
                              >
                                <td className="px-6 py-4 font-mono text-sm font-extrabold text-gray-900">
                                  {transaction.id}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-800">
                                  {transaction.customer}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-500">
                                  {transaction.store}
                                </td>
                                <td className="px-6 py-4 text-sm font-extrabold text-emerald-600">
                                  {transaction.total}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-extrabold text-gray-600">
                                    {transaction.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <Link
                                    href={`/admin/transactions/${transaction.id}`}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                                  >
                                    Detail
                                    <ArrowUpRight size={16} />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}

              {activeTab === "users" ? (
                <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-950">
                        Daftar Customer & Owner
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        Pantau status akun dan lakukan suspend jika diperlukan.
                      </p>
                    </div>
                    <div className="relative w-full lg:max-w-sm">
                      <Search
                        size={18}
                        className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(event) =>
                          setUserSearchQuery(event.target.value)
                        }
                        placeholder="Cari ID, nama, email..."
                        className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                          <th className="px-6 py-4">ID & Tanggal Join</th>
                          <th className="px-6 py-4">Informasi Akun</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredAdminUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="transition-colors hover:bg-gray-50/70"
                          >
                            <td className="px-6 py-5">
                              <p className="font-mono text-sm font-extrabold text-gray-900">
                                {user.id}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                {user.joinedAt}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-extrabold text-gray-900">
                                {user.name}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                {user.email}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <RoleBadge role={user.role} />
                            </td>
                            <td className="px-6 py-5">
                              <UserStatus user={user} />
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/admin/users/${user.id}`}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                  Detail
                                  <ArrowUpRight size={16} />
                                </Link>
                                {user.status === "active" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBanModal(user)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    <UserX size={16} />
                                    Ban / Suspend
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeBan(user.id)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                                  >
                                    <UserCheck size={16} />
                                    Cabut Ban
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {activeTab === "verification" ? (
                <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-4 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-950">
                        Daftar UMKM Menunggu Persetujuan
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        Review identitas dan dokumen legal sebelum restoran aktif.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-700">
                      {verificationStores.length} Menunggu
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                          <th className="px-6 py-4">ID & Tanggal</th>
                          <th className="px-6 py-4">Informasi Toko</th>
                          <th className="px-6 py-4">Pemilik</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {verificationStores.map((store) => (
                          <tr
                            key={store.id}
                            className="transition-colors hover:bg-gray-50/70"
                          >
                            <td className="px-6 py-5">
                              <p className="font-mono text-sm font-extrabold text-gray-900">
                                {store.id}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                {store.date}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                                  <Building2
                                    size={20}
                                    className="text-emerald-500"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-extrabold text-gray-900">
                                    {store.storeName}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-gray-500">
                                    {store.category}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-extrabold text-gray-900">
                                {store.owner}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                {store.email}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <StatusBadge />
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/admin/verifications/${store.id}`}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                  Detail
                                  <ArrowUpRight size={16} />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStore(store)}
                                  className="rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-500"
                                >
                                  Review Cepat
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {activeTab === "transactions" ? (
                <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-4 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-950">
                        Daftar Komplain & Dispute Transaksi
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        Tinjau refund yang masuk sebelum saldo dikembalikan.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-600">
                      {refundDisputes.length} Butuh Review
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                          <th className="px-6 py-4">Order ID</th>
                          <th className="px-6 py-4">Customer & Resto</th>
                          <th className="px-6 py-4">Alasan Komplain</th>
                          <th className="px-6 py-4">Total Harga</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {refundDisputes.map((dispute) => (
                          <tr
                            key={dispute.orderId}
                            className="transition-colors hover:bg-gray-50/70"
                          >
                            <td className="px-6 py-5 font-mono text-sm font-extrabold text-gray-900">
                              {dispute.orderId}
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-extrabold text-gray-900">
                                {dispute.customer}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                {dispute.resto}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-600">
                                {dispute.reason}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-sm font-extrabold text-emerald-600">
                              {dispute.total}
                            </td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                                <Clock3 size={13} />
                                Investigasi
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-500 hover:text-white"
                                  title="Tolak Refund"
                                >
                                  <X size={17} />
                                </button>
                                <Link
                                  href={`/admin/refunds/${dispute.orderId}`}
                                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                                >
                                  <RefreshCcw size={16} />
                                  Review Detail
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {activeTab === "analytics" ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="mb-8 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-extrabold text-gray-950">
                          Grafik Penjualan
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                          Simulasi performa transaksi mingguan.
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                        <BarChart3 size={22} className="text-emerald-500" />
                      </div>
                    </div>

                    <div className="flex h-72 items-end gap-4 rounded-[24px] bg-gray-50 px-5 pt-8 pb-5">
                      {weeklySales.map((item) => (
                        <div
                          key={item.day}
                          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3"
                        >
                          <div className="flex h-full w-full items-end justify-center">
                            <div
                              className="w-full max-w-12 rounded-t-2xl bg-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.2)]"
                              style={{ height: `${item.value}%` }}
                            />
                          </div>
                          <span className="text-xs font-extrabold text-gray-500">
                            {item.day}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="mb-8 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-extrabold text-gray-950">
                          Distribusi Makanan
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                          Komposisi kategori makanan terselamatkan.
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50">
                        <PieChart size={22} className="text-purple-500" />
                      </div>
                    </div>

                    <div className="rounded-[24px] bg-gray-50 p-5">
                      <div className="mb-6 flex h-6 overflow-hidden rounded-full bg-gray-100">
                        {foodDistribution.map((item) => (
                          <div
                            key={item.label}
                            className={item.className}
                            style={{ width: `${item.value}%` }}
                          />
                        ))}
                      </div>

                      <div className="space-y-4">
                        {foodDistribution.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-3 w-3 rounded-full ${item.className}`}
                              />
                              <span className="text-sm font-extrabold text-gray-800">
                                {item.label}
                              </span>
                            </div>
                            <span
                              className={`text-sm font-extrabold ${item.textClassName}`}
                            >
                              {item.value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      {selectedStore ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-sm font-extrabold text-emerald-600">
                  {selectedStore.id}
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-950">
                  Review Dokumen Verifikasi
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                title="Tutup modal"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid max-h-[68vh] gap-5 overflow-y-auto p-6 md:grid-cols-2">
              <section className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-5 text-sm font-extrabold text-gray-950">
                  Informasi Pendaftar
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Nama Pemilik
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-gray-900">
                      {selectedStore.owner}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Nama Toko
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-gray-900">
                      {selectedStore.storeName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Kategori
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-gray-900">
                      {selectedStore.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Alamat Lengkap
                    </dt>
                    <dd className="mt-1 text-sm leading-6 font-bold text-gray-900">
                      {selectedStore.address}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-5 text-sm font-extrabold text-gray-950">
                  Dokumen Lampiran
                </h3>
                <div className="space-y-3">
                  {documentFiles.map((document) => (
                    <div
                      key={document.label}
                      className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50">
                        <FileCheck2 size={21} className="text-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-gray-900">
                          {document.label}
                        </p>
                        <p className="truncate text-xs font-semibold text-gray-500">
                          {document.name}
                        </p>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                        <Check size={18} className="text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-3 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-500 hover:text-white"
              >
                <XCircle size={18} />
                Tolak Ajuan
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-colors hover:bg-emerald-600"
              >
                <CheckCircle2 size={18} />
                Approve & Aktifkan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedUserForBan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="bg-red-50/50 px-6 pt-8 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-950">
                Ban / Suspend User
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 font-semibold text-gray-600">
                Kamu akan memblokir akses {selectedUserForBan.name}.
              </p>
            </div>

            <div className="p-6">
              <label
                htmlFor="ban-reason"
                className="mb-2 block text-sm font-extrabold text-gray-800"
              >
                Alasan Blokir
              </label>
              <textarea
                id="ban-reason"
                required
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder="Contoh: Penipuan transaksi"
                className="min-h-32 w-full resize-none rounded-[20px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 bg-white p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseBanModal}
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                disabled={!banReason.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(220,38,38,0.2)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200 disabled:shadow-none"
              >
                <UserX size={17} />
                Konfirmasi Ban
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboardPage;
