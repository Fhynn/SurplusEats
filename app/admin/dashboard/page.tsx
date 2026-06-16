"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileBadge2,
  History,
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
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import { NotificationBellLink } from "@/components/notification-bell-link";
import { useRealtimePolling } from "@/components/use-realtime-polling";
import { useUnreadNotificationCount } from "@/components/use-unread-notification-count";

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
  latitude: number | null;
  longitude: number | null;
  status: "pending" | "approved" | "rejected";
  statusLabel: string;
  documentCount: number;
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

type AttentionItem = {
  title: string;
  meta: string;
  level: string;
};

type RecentTransaction = {
  id: string;
  customer: string;
  store: string;
  total: string;
  status: string;
};

type RefundDispute = {
  id: string;
  orderId: string;
  customer: string;
  resto: string;
  reason: string;
  total: string;
  status: string;
};

type WeeklySale = {
  day: string;
  value: number;
};

type FoodDistributionItem = {
  label: string;
  value: number;
  className: string;
  textClassName: string;
};

type GlobalSearchResult = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status: string;
  href: string;
  meta: string;
};

type AdminAuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string;
    email: string;
  } | null;
  metadata: unknown;
};

type DashboardFilters = {
  role: "all" | "customer" | "owner";
  userStatus: "all" | "active" | "banned";
  applicationStatus: "all" | "pending" | "approved" | "rejected";
  orderStatus:
    | "all"
    | "pending"
    | "payment_failed"
    | "paid"
    | "confirmed"
    | "preparing"
    | "ready"
    | "completed"
    | "no_show"
    | "cancelled"
    | "refunded";
  refundStatus:
    | "needs_review"
    | "all"
    | "pending"
    | "reviewing"
    | "approved"
    | "rejected"
    | "paid";
  dateFrom: string;
  dateTo: string;
};

type AdminDashboardData = {
  metrics: {
    totalUsers: number;
    totalRestaurants: number;
    totalTransactions: number;
    foodSavedItems: number;
  };
  users: AdminUser[];
  verificationStores: VerificationStore[];
  recentTransactions: RecentTransaction[];
  refundDisputes: RefundDispute[];
  attentionItems: AttentionItem[];
  weeklySales: WeeklySale[];
  foodDistribution: FoodDistributionItem[];
  globalSearchResults: GlobalSearchResult[];
  auditLogs: AdminAuditLog[];
};

const emptyDashboardData: AdminDashboardData = {
  metrics: {
    totalUsers: 0,
    totalRestaurants: 0,
    totalTransactions: 0,
    foodSavedItems: 0,
  },
  users: [],
  verificationStores: [],
  recentTransactions: [],
  refundDisputes: [],
  attentionItems: [],
  weeklySales: [],
  foodDistribution: [],
  globalSearchResults: [],
  auditLogs: [],
};

const defaultDashboardFilters: DashboardFilters = {
  role: "all",
  userStatus: "all",
  applicationStatus: "pending",
  orderStatus: "all",
  refundStatus: "needs_review",
  dateFrom: "",
  dateTo: "",
};

function getMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

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

function formatAuditTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSearchTypeLabel(type: string) {
  const labels: Record<string, string> = {
    application: "Ajuan Mitra",
    audit: "Audit",
    menu: "Menu",
    order: "Order",
    refund: "Refund",
    restaurant: "Restoran",
    support: "Support",
    user: "User",
    voucher: "Voucher",
  };

  return labels[type] || type;
}

function ApplicationStatusBadge({
  status,
  label,
}: {
  status: VerificationStore["status"];
  label: string;
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
        <CheckCircle2 size={13} />
        {label}
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
        <XCircle size={13} />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
      <Clock3 size={13} />
      {label}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { unreadNotificationCount } = useUnreadNotificationCount();
  const tabParam = searchParams.get("tab");
  const activeTab: AdminTab =
    tabParam === "users" ||
    tabParam === "verification" ||
    tabParam === "transactions" ||
    tabParam === "analytics"
      ? tabParam
      : "dashboard";
  const [dashboardData, setDashboardData] =
    useState<AdminDashboardData>(emptyDashboardData);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<VerificationStore | null>(
    null,
  );
  const [selectedUserForBan, setSelectedUserForBan] =
    useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(
    defaultDashboardFilters,
  );
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>(
    defaultDashboardFilters,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdminAuditLog | null>(
    null,
  );
  const adminUsers = dashboardData.users;
  const verificationStores = dashboardData.verificationStores;
  const recentTransactions = dashboardData.recentTransactions;
  const refundDisputes = dashboardData.refundDisputes;
  const attentionItems = dashboardData.attentionItems;
  const weeklySales = dashboardData.weeklySales;
  const foodDistribution = dashboardData.foodDistribution;
  const globalSearchResults = dashboardData.globalSearchResults;
  const auditLogs = dashboardData.auditLogs;
  const hasActiveFilters =
    JSON.stringify(dashboardFilters) !== JSON.stringify(defaultDashboardFilters) ||
    Boolean(appliedSearchQuery);
  const stats = [
    {
      label: "Total Pengguna",
      value: String(dashboardData.metrics.totalUsers),
      trend: "DB",
      icon: Users,
      iconWrapClassName: "bg-blue-50",
      iconClassName: "text-blue-500",
    },
    {
      label: "Restoran",
      value: String(dashboardData.metrics.totalRestaurants),
      trend: "DB",
      icon: Store,
      iconWrapClassName: "bg-emerald-50",
      iconClassName: "text-emerald-500",
    },
    {
      label: "Transaksi",
      value: String(dashboardData.metrics.totalTransactions),
      trend: "DB",
      icon: WalletCards,
      iconWrapClassName: "bg-purple-50",
      iconClassName: "text-purple-500",
    },
    {
      label: "Item Saved",
      value: String(dashboardData.metrics.foodSavedItems),
      trend: "DB",
      icon: Leaf,
      iconWrapClassName: "bg-green-50",
      iconClassName: "text-green-500",
    },
  ] as const;

  const loadDashboardData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingDashboard(true);
      }

      try {
        const params = new URLSearchParams();

        if (appliedSearchQuery) {
          params.set("q", appliedSearchQuery);
        }

        if (dashboardFilters.role !== "all") {
          params.set("role", dashboardFilters.role);
        }

        if (dashboardFilters.userStatus !== "all") {
          params.set("userStatus", dashboardFilters.userStatus);
        }

        if (dashboardFilters.applicationStatus !== "all") {
          params.set("applicationStatus", dashboardFilters.applicationStatus);
        }

        if (dashboardFilters.orderStatus !== "all") {
          params.set("orderStatus", dashboardFilters.orderStatus);
        }

        if (dashboardFilters.refundStatus !== "needs_review") {
          params.set("refundStatus", dashboardFilters.refundStatus);
        }

        if (dashboardFilters.dateFrom) {
          params.set("dateFrom", dashboardFilters.dateFrom);
        }

        if (dashboardFilters.dateTo) {
          params.set("dateTo", dashboardFilters.dateTo);
        }

        const queryString = params.toString();
        const response = await fetch(
          `/api/admin/dashboard${queryString ? `?${queryString}` : ""}`,
          {
            cache: "no-store",
          },
        );
        const data = (await response.json()) as
          | ({ ok: true } & AdminDashboardData)
          | { ok: false; message?: string };

        if (!response.ok || !data.ok) {
          throw new Error(
            "message" in data ? data.message : "Dashboard admin gagal dimuat.",
          );
        }

        setDashboardData({
          metrics: data.metrics,
          users: data.users,
          verificationStores: data.verificationStores,
          recentTransactions: data.recentTransactions,
          refundDisputes: data.refundDisputes,
          attentionItems: data.attentionItems,
          weeklySales: data.weeklySales,
          foodDistribution: data.foodDistribution,
          globalSearchResults: data.globalSearchResults,
          auditLogs: data.auditLogs,
        });
        setDashboardNotice(null);
      } catch (error) {
        if (!silent) {
          setDashboardNotice(
            error instanceof Error
              ? error.message
              : "Dashboard admin gagal dimuat.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoadingDashboard(false);
        }
      }
    },
    [appliedSearchQuery, dashboardFilters],
  );

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useRealtimePolling({
    intervalMs:
      activeTab === "transactions" || activeTab === "verification"
        ? 9000
        : 25000,
    onPoll: () => loadDashboardData({ silent: true }),
  });

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

  const handleChangeTab = (tab: AdminTab) => {
    router.replace(
      tab === "dashboard" ? "/admin/dashboard" : `/admin/dashboard?tab=${tab}`,
      { scroll: false },
    );
  };

  const handleGlobalSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = globalSearchQuery.trim();

    setAppliedSearchQuery(trimmedQuery);
    setUserSearchQuery(trimmedQuery);
    handleChangeTab("dashboard");
  };

  const handleClearGlobalSearch = () => {
    setGlobalSearchQuery("");
    setAppliedSearchQuery("");
    setUserSearchQuery("");
  };

  const handleApplyFilters = () => {
    setDashboardFilters(draftFilters);
  };

  const handleResetFilters = () => {
    setDraftFilters(defaultDashboardFilters);
    setDashboardFilters(defaultDashboardFilters);
    handleClearGlobalSearch();
  };

  const handleExportDashboard = async () => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.set("format", "csv");

      if (appliedSearchQuery) {
        params.set("q", appliedSearchQuery);
      }

      if (dashboardFilters.role !== "all") {
        params.set("role", dashboardFilters.role);
      }

      if (dashboardFilters.userStatus !== "all") {
        params.set("userStatus", dashboardFilters.userStatus);
      }

      if (dashboardFilters.applicationStatus !== "all") {
        params.set("applicationStatus", dashboardFilters.applicationStatus);
      }

      if (dashboardFilters.orderStatus !== "all") {
        params.set("orderStatus", dashboardFilters.orderStatus);
      }

      if (dashboardFilters.refundStatus !== "needs_review") {
        params.set("refundStatus", dashboardFilters.refundStatus);
      }

      if (dashboardFilters.dateFrom) {
        params.set("dateFrom", dashboardFilters.dateFrom);
      }

      if (dashboardFilters.dateTo) {
        params.set("dateTo", dashboardFilters.dateTo);
      }

      const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(data?.message || "Export CSV gagal dibuat.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `resqfood-admin-export-${Date.now()}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setDashboardNotice(
        error instanceof Error ? error.message : "Export CSV gagal dibuat.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloseBanModal = () => {
    setSelectedUserForBan(null);
    setBanReason("");
  };

  const updateUserStatus = async (
    userId: string,
    status: "ACTIVE" | "SUSPENDED",
  ) => {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    const data = (await response.json()) as {
      ok: boolean;
      message?: string;
    };

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Status user gagal diperbarui.");
    }
  };

  const handleConfirmBan = async () => {
    const trimmedReason = banReason.trim();

    if (!selectedUserForBan || !trimmedReason) {
      return;
    }

    try {
      await updateUserStatus(selectedUserForBan.id, "SUSPENDED");
      await loadDashboardData();
      handleCloseBanModal();
    } catch (error) {
      setDashboardNotice(
        error instanceof Error
          ? error.message
          : "Status user gagal diperbarui.",
      );
    }
  };

  const handleRevokeBan = async (userId: string) => {
    try {
      await updateUserStatus(userId, "ACTIVE");
      await loadDashboardData();
    } catch (error) {
      setDashboardNotice(
        error instanceof Error
          ? error.message
          : "Status user gagal diperbarui.",
      );
    }
  };

  useEffect(() => {
    if (!selectedStore && !selectedUserForBan && !selectedAuditLog) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedStore(null);
        setSelectedUserForBan(null);
        setSelectedAuditLog(null);
        setBanReason("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedStore, selectedUserForBan, selectedAuditLog]);

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
                  ResQfood <span className="text-emerald-400">admin</span>
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
                  onClick={() => handleChangeTab(id)}
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
              <form
                className="relative max-w-2xl flex-1"
                onSubmit={handleGlobalSearch}
              >
                <Search
                  size={19}
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(event) => setGlobalSearchQuery(event.target.value)}
                  placeholder="Cari pengguna, restoran, transaksi, voucher, audit..."
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-12 pl-12 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
                {globalSearchQuery ? (
                  <button
                    type="button"
                    onClick={handleClearGlobalSearch}
                    className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    title="Bersihkan pencarian"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </form>
              <NotificationBellLink
                href="/admin/notifications"
                unreadCount={unreadNotificationCount}
                ariaLabel="Buka notifikasi admin"
                className="h-12 w-12 rounded-2xl shadow-sm"
              />
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

              {dashboardNotice ? (
                <div className="mb-6 rounded-[22px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                  {dashboardNotice}
                </div>
              ) : null}

              {isLoadingDashboard ? (
                <div className="mb-6 rounded-[24px] border border-gray-100 bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
                  <p className="text-sm font-extrabold text-gray-950">
                    Memuat data admin
                  </p>
                </div>
              ) : null}

              {appliedSearchQuery ? (
                <section className="mb-6 overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-3 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-extrabold tracking-wider text-emerald-600 uppercase">
                        Global Search
                      </p>
                      <h2 className="mt-1 text-lg font-extrabold text-gray-950">
                        Hasil untuk “{appliedSearchQuery}”
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearGlobalSearch}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <X size={16} />
                      Bersihkan
                    </button>
                  </div>

                  {globalSearchResults.length > 0 ? (
                    <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                      {globalSearchResults.map((result) => (
                        <Link
                          key={`${result.type}-${result.id}`}
                          href={result.href}
                          className="group rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-emerald-100 hover:bg-emerald-50/60"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-gray-500 shadow-sm">
                              {getSearchTypeLabel(result.type)}
                            </span>
                            <ArrowUpRight
                              size={16}
                              className="shrink-0 text-gray-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600"
                            />
                          </div>
                          <p className="truncate text-sm font-extrabold text-gray-950">
                            {result.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 font-semibold text-gray-500">
                            {result.subtitle}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                              {result.status}
                            </span>
                            <span className="text-[11px] font-bold text-gray-400">
                              {result.meta}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5">
                      <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                        Tidak ada hasil di user, restoran, menu, order, refund,
                        voucher, support, atau audit log.
                      </p>
                    </div>
                  )}
                </section>
              ) : null}

              <section className="mb-6 rounded-[24px] border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Filter Advanced
                    </p>
                    <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-gray-950">
                      <Search size={18} className="text-emerald-600" />
                      Query dashboard admin
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className="inline-flex items-center justify-center rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600"
                    >
                      Terapkan Filter
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      disabled={!hasActiveFilters}
                      className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExportDashboard()}
                      disabled={isExporting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.18)] transition-colors hover:bg-emerald-600 disabled:cursor-wait disabled:bg-emerald-300"
                    >
                      <Download size={16} />
                      {isExporting ? "Export..." : "Export CSV"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Role user
                    </span>
                    <select
                      value={draftFilters.role}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          role: event.target.value as DashboardFilters["role"],
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="all">Semua role</option>
                      <option value="customer">Customer</option>
                      <option value="owner">Owner</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Status user
                    </span>
                    <select
                      value={draftFilters.userStatus}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          userStatus:
                            event.target.value as DashboardFilters["userStatus"],
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="all">Semua status</option>
                      <option value="active">Aktif</option>
                      <option value="banned">Banned</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Ajuan mitra
                    </span>
                    <select
                      value={draftFilters.applicationStatus}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          applicationStatus:
                            event.target.value as DashboardFilters["applicationStatus"],
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="pending">Menunggu</option>
                      <option value="all">Semua ajuan</option>
                      <option value="approved">Disetujui</option>
                      <option value="rejected">Ditolak</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Status order
                    </span>
                    <select
                      value={draftFilters.orderStatus}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          orderStatus:
                            event.target.value as DashboardFilters["orderStatus"],
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="all">Semua order</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Dibayar</option>
                      <option value="confirmed">Dikonfirmasi</option>
                      <option value="preparing">Disiapkan</option>
                      <option value="ready">Pickup</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                      <option value="refunded">Refunded</option>
                      <option value="no_show">Tidak diambil</option>
                      <option value="payment_failed">Payment gagal</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Status refund
                    </span>
                    <select
                      value={draftFilters.refundStatus}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          refundStatus:
                            event.target.value as DashboardFilters["refundStatus"],
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="needs_review">Pending + reviewing</option>
                      <option value="all">Semua refund</option>
                      <option value="pending">Pending</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="paid">Paid</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Dari tanggal
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateFrom}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          dateFrom: event.target.value,
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Sampai tanggal
                    </span>
                    <input
                      type="date"
                      value={draftFilters.dateTo}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          dateTo: event.target.value,
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </label>
                </div>
              </section>

              <div className="mb-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-2 rounded-[24px] border border-gray-100 bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  {navItems.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleChangeTab(id)}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition-all ${
                          isActive
                            ? "bg-gray-950 text-white shadow-sm"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-950"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={isActive ? "text-emerald-300" : "text-gray-400"}
                        />
                        {label}
                      </button>
                    );
                  })}
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
                                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
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

                  <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex flex-col gap-3 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-950">
                          <History size={20} className="text-emerald-600" />
                          Audit Trail
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                          Aktivitas admin terbaru, bisa dibuka untuk detail metadata.
                        </p>
                      </div>
                      <Link
                        href="/admin/settings"
                        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Semua log
                        <ArrowUpRight size={16} />
                      </Link>
                    </div>

                    {auditLogs.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {auditLogs.slice(0, 8).map((log) => (
                          <button
                            key={log.id}
                            type="button"
                            onClick={() => setSelectedAuditLog(log)}
                            className="flex w-full flex-col gap-3 px-6 py-4 text-left transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-gray-950">
                                {log.action}
                              </p>
                              <p className="mt-1 text-xs font-bold text-gray-500">
                                {log.targetType}
                                {log.targetId ? ` - ${log.targetId}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-extrabold text-gray-600">
                                {log.admin?.name || "System"}
                              </span>
                              <span className="text-xs font-bold text-gray-400">
                                {formatAuditTime(log.createdAt)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6">
                        <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                          Belum ada audit log pada filter saat ini.
                        </p>
                      </div>
                    )}
                  </section>
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
                                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
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
                      {
                        verificationStores.filter(
                          (store) => store.status === "pending",
                        ).length
                      }{" "}
                      Menunggu
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
                              <ApplicationStatusBadge
                                status={store.status}
                                label={store.statusLabel}
                              />
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/admin/verifications/${store.id}`}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
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
                            key={dispute.id}
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
                                {dispute.status}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-500 hover:text-white"
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
                          Performa transaksi mingguan terbaru.
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
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
                    {selectedStore.latitude !== null &&
                    selectedStore.longitude !== null ? (
                      <a
                        href={getMapsUrl(
                          selectedStore.latitude,
                          selectedStore.longitude,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600"
                      >
                        <ArrowUpRight size={14} />
                        Buka Maps
                      </a>
                    ) : null}
                  </div>
                </dl>
              </section>

              <section className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                <h3 className="mb-5 text-sm font-extrabold text-gray-950">
                  Dokumen Lampiran
                </h3>
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm font-semibold text-gray-500">
                  {selectedStore.documentCount > 0
                    ? `${selectedStore.documentCount} dokumen tersedia. Buka review lengkap untuk preview dan checklist.`
                    : "Belum ada dokumen terunggah untuk ajuan ini."}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Tutup
              </button>
              <Link
                href={`/admin/verifications/${selectedStore.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-colors hover:bg-emerald-600"
              >
                <FileBadge2 size={18} />
                Buka Review Lengkap
              </Link>
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

      {selectedAuditLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-sm font-extrabold text-emerald-600">
                  {selectedAuditLog.id}
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-950">
                  Detail Audit Log
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                title="Tutup modal"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <dl className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                    Action
                  </dt>
                  <dd className="mt-1 text-sm font-extrabold text-gray-950">
                    {selectedAuditLog.action}
                  </dd>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                    Admin
                  </dt>
                  <dd className="mt-1 text-sm font-extrabold text-gray-950">
                    {selectedAuditLog.admin?.name || "System"}
                  </dd>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {selectedAuditLog.admin?.email || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                    Target
                  </dt>
                  <dd className="mt-1 text-sm font-extrabold text-gray-950">
                    {selectedAuditLog.targetType}
                  </dd>
                  <p className="mt-1 break-all font-mono text-xs font-bold text-gray-500">
                    {selectedAuditLog.targetId || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <dt className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                    Waktu
                  </dt>
                  <dd className="mt-1 text-sm font-extrabold text-gray-950">
                    {formatAuditTime(selectedAuditLog.createdAt)}
                  </dd>
                </div>
              </dl>

              <section className="mt-5 rounded-2xl border border-gray-100 bg-gray-950 p-4">
                <h3 className="mb-3 text-sm font-extrabold text-white">
                  Metadata
                </h3>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/5 p-4 text-xs leading-6 font-semibold text-emerald-100">
                  {selectedAuditLog.metadata
                    ? JSON.stringify(selectedAuditLog.metadata, null, 2)
                    : "Tidak ada metadata tambahan."}
                </pre>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboardPage;
