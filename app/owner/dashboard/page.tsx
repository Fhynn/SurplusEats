"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Coffee,
  Eye,
  Leaf,
  Loader2,
  PackageCheck,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Square,
  CheckSquare,
  TrendingUp,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  showPickupCodeScanner,
  showSweetError,
  showSweetToast,
} from "@/lib/sweet-alert";
import { useRealtimePolling } from "@/components/use-realtime-polling";

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

type OwnerTab = "dashboard" | "orders";

type OrderStatus = "new" | "preparing" | "ready" | "completed";

type ApiOrderStatus =
  | "PENDING"
  | "PAYMENT_FAILED"
  | "PAID"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED"
  | "REFUNDED";

type KanbanOrder = {
  id: string;
  time: string;
  createdAt: string;
  customer: string;
  items: string[];
  note?: string;
  total: number;
  status: OrderStatus;
  pickupVerifiedAt: string | null;
  pickupVerifiedBy: string | null;
};

type ApiOwnerOrder = {
  orderCode: string;
  createdAt: string;
  customer: {
    name: string;
  };
  items: {
    menuNameSnapshot: string;
    quantity: number;
  }[];
  note: string | null;
  total: number;
  status: ApiOrderStatus;
  pickupVerifiedAt: string | null;
  pickupVerifiedBy: string | null;
};

type ApiOwnerMenuItem = {
  status: "ACTIVE" | "HIDDEN" | "SOLD_OUT";
  soldCount: number;
};

const orderColumns = [
  {
    id: "new",
    title: "Pesanan Baru",
    icon: PackagePlus,
    accentClassName: "bg-amber-100 text-amber-600 ring-amber-200",
    badgeClassName: "bg-amber-100 text-amber-700",
  },
  {
    id: "preparing",
    title: "Sedang Disiapkan",
    icon: ChefHat,
    accentClassName: "bg-blue-100 text-blue-600 ring-blue-200",
    badgeClassName: "bg-blue-100 text-blue-700",
  },
  {
    id: "ready",
    title: "Siap Diambil",
    icon: Coffee,
    accentClassName: "bg-purple-100 text-purple-600 ring-purple-200",
    badgeClassName: "bg-purple-100 text-purple-700",
  },
  {
    id: "completed",
    title: "Selesai",
    icon: PackageCheck,
    accentClassName: "bg-emerald-100 text-emerald-600 ring-emerald-200",
    badgeClassName: "bg-emerald-100 text-emerald-700",
  },
] as const satisfies readonly {
  id: OrderStatus;
  title: string;
  icon: typeof PackagePlus;
  accentClassName: string;
  badgeClassName: string;
}[];

const nextStatusByStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "preparing",
  preparing: "ready",
  ready: "completed",
};

const apiStatusByKanbanStatus: Record<OrderStatus, ApiOrderStatus> = {
  new: "CONFIRMED",
  preparing: "PREPARING",
  ready: "READY",
  completed: "COMPLETED",
};

function mapApiStatusToKanban(status: ApiOrderStatus): OrderStatus | null {
  switch (status) {
    case "PENDING":
    case "PAID":
    case "CONFIRMED":
      return "new";
    case "PREPARING":
      return "preparing";
    case "READY":
      return "ready";
    case "COMPLETED":
      return "completed";
    default:
      return null;
  }
}

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mapApiOrder(order: ApiOwnerOrder): KanbanOrder | null {
  const status = mapApiStatusToKanban(order.status);

  if (!status) {
    return null;
  }

  return {
    id: order.orderCode,
    time: formatOrderTime(order.createdAt),
    createdAt: order.createdAt,
    customer: order.customer.name,
    items: order.items.map(
      (item) => `${item.quantity}x ${item.menuNameSnapshot}`,
    ),
    note: order.note ?? undefined,
    total: order.total,
    status,
    pickupVerifiedAt: order.pickupVerifiedAt,
    pickupVerifiedBy: order.pickupVerifiedBy,
  };
}

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case "new":
      return (
        <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
          Perlu Konfirmasi
        </span>
      );
    case "preparing":
      return (
        <span className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
          Disiapkan
        </span>
      );
    case "ready":
      return (
        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          Siap Diambil
        </span>
      );
    case "completed":
      return (
        <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
          Selesai
        </span>
      );
    default:
      return null;
  }
}

function OrderCard({
  order,
  onAdvance,
  onReject,
  onOpenDetail,
  onToggleSelected,
  isSelected,
  isSelectable,
  isBusy,
}: {
  order: KanbanOrder;
  onAdvance: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onOpenDetail: (orderId: string) => void;
  onToggleSelected: (orderId: string) => void;
  isSelected: boolean;
  isSelectable: boolean;
  isBusy: boolean;
}) {
  return (
    <article
      className={`group rounded-[24px] border bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all hover:border-emerald-100 hover:shadow-[0_12px_32px_rgba(15,23,42,0.07)] ${
        isSelected ? "border-emerald-200 ring-4 ring-emerald-500/10" : "border-transparent"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onToggleSelected(order.id)}
          disabled={!isSelectable || isBusy}
          className="inline-flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left font-mono text-xs font-extrabold text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
          aria-pressed={isSelected}
          aria-label={`Pilih order ${order.id}`}
        >
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          <span className="truncate">{order.id}</span>
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-600">
          <Clock size={13} />
          {order.time}
        </span>
      </div>

      <h3 className="text-base font-extrabold tracking-tight text-gray-950">
        {order.customer}
      </h3>

      <ul className="mt-3 space-y-2">
        {order.items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm leading-5 font-semibold text-gray-500"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {order.note ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="flex gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-sm leading-5 font-semibold text-amber-800 italic">
              {order.note}
            </p>
          </div>
        </div>
      ) : null}

      {order.pickupVerifiedBy ? (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-extrabold tracking-wider text-emerald-500 uppercase">
            Staf Pickup
          </p>
          <p className="mt-1 text-sm font-bold text-emerald-800">
            Diverifikasi oleh {order.pickupVerifiedBy}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
          Total
        </span>
        <span className="text-base font-extrabold text-emerald-600">
          {formatRp(order.total)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpenDetail(order.id)}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
      >
        <Eye size={16} />
        Detail Order
      </button>

      <div className="mt-3">
        {order.status === "new" ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onReject(order.id)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-3 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50"
            >
              <X size={16} />
              Tolak
            </button>
            <button
              type="button"
              onClick={() => onAdvance(order.id)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
            >
              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Terima Order
            </button>
          </div>
        ) : null}

        {order.status === "preparing" ? (
          <button
            type="button"
            onClick={() => onAdvance(order.id)}
            disabled={isBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(59,130,246,0.22)] transition-colors hover:bg-blue-600"
          >
            {isBusy ? <Loader2 size={17} className="animate-spin" /> : <PackageCheck size={17} />}
            Tandai Siap Diambil
          </button>
        ) : null}

        {order.status === "ready" ? (
          <button
            type="button"
            onClick={() => onAdvance(order.id)}
            disabled={isBusy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(17,24,39,0.18)] transition-colors hover:bg-emerald-500"
          >
            {isBusy ? <Loader2 size={17} className="animate-spin" /> : <ShoppingBag size={17} />}
            Konfirmasi Pickup
          </button>
        ) : null}

        {order.status === "completed" ? (
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-extrabold text-gray-400"
          >
            <CheckCircle2 size={17} />
            Selesai
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [restaurantName, setRestaurantName] = useState("Restoran");
  const [activeMenuCount, setActiveMenuCount] = useState(0);
  const [rescuedItemCount, setRescuedItemCount] = useState(0);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const searchParams = useSearchParams();
  const dashboardTab = searchParams.get("tab");
  const kanbanQuery = searchParams.get("q") ?? "";
  const activeTab: OwnerTab = dashboardTab === "orders" ? "orders" : "dashboard";
  const normalizedKanbanQuery = kanbanQuery.trim().toLowerCase();

  const loadDashboardData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoadingDashboard(true);
      }

      try {
        const [ordersResponse, menuResponse, profileResponse] = await Promise.all([
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/menu-items?scope=owner", { cache: "no-store" }),
          fetch("/api/owner/profile", { cache: "no-store" }),
        ]);
        const ordersData = (await ordersResponse.json()) as {
          ok: boolean;
          message?: string;
          orders?: ApiOwnerOrder[];
        };
        const menuData = (await menuResponse.json()) as {
          ok: boolean;
          message?: string;
          menuItems?: ApiOwnerMenuItem[];
        };
        const profileData = (await profileResponse.json()) as {
          ok: boolean;
          restaurant?: { name: string } | null;
        };

        if (!ordersResponse.ok || !ordersData.ok) {
          throw new Error(ordersData.message || "Pesanan gagal dimuat.");
        }

        if (!menuResponse.ok || !menuData.ok) {
          throw new Error(menuData.message || "Menu owner gagal dimuat.");
        }

        const nextOrders = (ordersData.orders || [])
          .map(mapApiOrder)
          .filter((order): order is KanbanOrder => order !== null);
        const menuItems = menuData.menuItems || [];

        setOrders(nextOrders);
        setRestaurantName(profileData.restaurant?.name || "Restoran");
        setActiveMenuCount(
          menuItems.filter((item) => item.status === "ACTIVE").length,
        );
        setRescuedItemCount(
          menuItems.reduce((total, item) => total + item.soldCount, 0),
        );
        setDashboardNotice(null);
      } catch (error) {
        if (!silent) {
          setDashboardNotice(
            error instanceof Error
              ? error.message
              : "Dashboard owner gagal dimuat.",
          );
        }
      } finally {
        if (!silent) {
          setIsLoadingDashboard(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  useRealtimePolling({
    intervalMs: activeTab === "orders" ? 8000 : 15000,
    onPoll: () => loadDashboardData({ silent: true }),
  });

  const handleKanbanQueryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "orders");

    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }

    router.replace(`/owner/dashboard?${params.toString()}`, { scroll: false });
  };

  const filteredOrders = useMemo(() => {
    if (!normalizedKanbanQuery) {
      return orders;
    }

    return orders.filter((order) =>
      [order.id, order.customer, order.items.join(" "), order.note ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKanbanQuery),
    );
  }, [normalizedKanbanQuery, orders]);
  const recentOrders = orders.slice(0, 4);
  const todayRevenue = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return orders.reduce((total, order) => {
      const createdAt = new Date(order.createdAt);

      if (createdAt < startOfToday || order.status !== "completed") {
        return total;
      }

      return total + order.total;
    }, 0);
  }, [orders]);
  const orderSummary = useMemo(
    () => ({
      new: orders.filter((order) => order.status === "new").length,
      preparing: orders.filter((order) => order.status === "preparing").length,
      ready: orders.filter((order) => order.status === "ready").length,
      completed: orders.filter((order) => order.status === "completed").length,
    }),
    [orders],
  );
  const dashboardStats = [
    {
      label: "Pendapatan Hari Ini",
      value: formatRp(todayRevenue),
      icon: TrendingUp,
      iconWrapClassName: "bg-emerald-50",
      iconClassName: "text-emerald-500",
      trend: "DB",
    },
    {
      label: "Pesanan Masuk",
      value: String(orders.length),
      icon: ShoppingBag,
      iconWrapClassName: "bg-blue-50",
      iconClassName: "text-blue-500",
      trend: "DB",
    },
    {
      label: "Menu Surplus Aktif",
      value: String(activeMenuCount),
      icon: UtensilsCrossed,
      iconWrapClassName: "bg-amber-50",
      iconClassName: "text-amber-500",
      trend: "DB",
    },
    {
      label: "Item Diselamatkan",
      value: String(rescuedItemCount),
      icon: Leaf,
      iconWrapClassName: "bg-emerald-50",
      iconClassName: "text-emerald-500",
      trend: "DB",
    },
  ] as const;

  const ordersByStatus = useMemo(() => {
    return orderColumns.reduce(
      (groupedOrders, column) => ({
        ...groupedOrders,
        [column.id]: filteredOrders.filter((order) => order.status === column.id),
      }),
      {} as Record<OrderStatus, KanbanOrder[]>,
    );
  }, [filteredOrders]);
  const selectableFilteredOrders = useMemo(
    () => filteredOrders.filter((order) => order.status !== "completed"),
    [filteredOrders],
  );

  useEffect(() => {
    const validOrderIds = new Set(orders.map((order) => order.id));

    setSelectedOrderIds((currentIds) => {
      const nextIds = new Set(
        Array.from(currentIds).filter((orderId) => validOrderIds.has(orderId)),
      );

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [orders]);

  const toggleSelectedOrder = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);

    if (!order || order.status === "completed") {
      return;
    }

    setSelectedOrderIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(orderId)) {
        nextIds.delete(orderId);
      } else {
        nextIds.add(orderId);
      }

      return nextIds;
    });
  };

  const toggleSelectVisibleOrders = () => {
    const visibleIds = selectableFilteredOrders.map((order) => order.id);

    if (visibleIds.length === 0) {
      return;
    }

    setSelectedOrderIds((currentIds) => {
      const hasSelectedAll = visibleIds.every((orderId) =>
        currentIds.has(orderId),
      );
      const nextIds = new Set(currentIds);

      if (hasSelectedAll) {
        visibleIds.forEach((orderId) => nextIds.delete(orderId));
      } else {
        visibleIds.forEach((orderId) => nextIds.add(orderId));
      }

      return nextIds;
    });
  };

  const handleBulkOrderStatus = async (nextStatus: ApiOrderStatus) => {
    const orderCodes = Array.from(selectedOrderIds);

    if (orderCodes.length === 0 || isBulkUpdating) {
      return;
    }

    setIsBulkUpdating(true);
    setDashboardNotice(null);
    setUpdatingOrderIds((currentIds) => {
      const nextIds = new Set(currentIds);
      orderCodes.forEach((orderCode) => nextIds.add(orderCode));
      return nextIds;
    });

    try {
      const response = await fetch("/api/orders/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderCodes, status: nextStatus }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        updatedCount?: number;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Bulk order gagal diperbarui.");
      }

      setSelectedOrderIds(new Set());
      await loadDashboardData();
      showSweetToast({
        icon: "success",
        title: `${data.updatedCount ?? orderCodes.length} order diperbarui.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bulk order gagal diperbarui.";

      setDashboardNotice(message);
      void showSweetError({
        title: "Bulk order gagal",
        text: message,
      });
    } finally {
      setIsBulkUpdating(false);
      setUpdatingOrderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        orderCodes.forEach((orderCode) => nextIds.delete(orderCode));
        return nextIds;
      });
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    nextStatus: ApiOrderStatus,
    pickupCode?: string,
  ) => {
    setDashboardNotice(null);
    setUpdatingOrderIds((currentIds) => new Set(currentIds).add(orderId));

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          pickupCode,
          pickupVerificationMethod:
            nextStatus === "COMPLETED" ? "SCANNER_OR_MANUAL" : undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Status order gagal diperbarui.");
      }
    } finally {
      setUpdatingOrderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(orderId);
        return nextIds;
      });
    }
  };

  const handleAdvanceOrder = async (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    const nextStatus = order ? nextStatusByStatus[order.status] : null;

    if (!order || !nextStatus) {
      return;
    }

    try {
      let pickupCode: string | undefined;

      if (nextStatus === "completed") {
        const submittedPickupCode = await showPickupCodeScanner({
          title: "Verifikasi Pickup",
          text: `Minta customer menunjukkan kode pickup untuk order ${orderId}.`,
          orderId,
        });

        if (!submittedPickupCode) {
          return;
        }

        pickupCode = submittedPickupCode;
      }

      await updateOrderStatus(
        orderId,
        apiStatusByKanbanStatus[nextStatus],
        pickupCode,
      );
      setSelectedOrderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(orderId);
        return nextIds;
      });
      await loadDashboardData();
      showSweetToast({
        icon: "success",
        title:
          nextStatus === "completed"
            ? "Pickup berhasil diverifikasi."
            : "Status order diperbarui.",
      });
    } catch (error) {
      void showSweetError({
        title: "Status order gagal diperbarui",
        text:
          error instanceof Error ? error.message : "Status order gagal diperbarui.",
      });
      setDashboardNotice(
        error instanceof Error ? error.message : "Status order gagal diperbarui.",
      );
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "CANCELLED");
      setSelectedOrderIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(orderId);
        return nextIds;
      });
      await loadDashboardData();
    } catch (error) {
      setDashboardNotice(
        error instanceof Error ? error.message : "Order gagal ditolak.",
      );
    }
  };

  return (
    <div
      className={
        activeTab === "orders"
          ? "h-[calc(100vh-10rem)] min-h-[620px] md:h-[calc(100vh-9rem)]"
          : "mx-auto max-w-7xl space-y-8"
      }
    >
      {activeTab === "dashboard" ? (
        <>
          {dashboardNotice ? (
            <div className="rounded-[22px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {dashboardNotice}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
                Halo, {restaurantName}!
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Restoran Terverifikasi
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/owner/menu?action=add")}
              className="inline-flex items-center gap-2 self-start rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-600 active:scale-95"
            >
              <Plus size={18} />
              Tambah Makanan
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_2px_15px_rgba(0,0,0,0.03)] transition-colors hover:border-emerald-200"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[16px] ${stat.iconWrapClassName}`}
                  >
                    <Icon size={24} className={stat.iconClassName} />
                  </div>
                  <p className="mb-1 text-sm font-bold text-gray-500">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-extrabold tracking-tight text-gray-900">
                    {stat.value}
                  </h3>
                  <div className="absolute top-6 right-6 flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                    <ArrowUpRight size={12} className="mr-0.5" />
                    {stat.trend}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-6">
              <h3 className="text-lg font-extrabold text-gray-900">
                Pesanan Terbaru
              </h3>
              <button
                type="button"
                onClick={() => router.replace("/owner/dashboard?tab=orders")}
                className="inline-flex min-h-11 items-center text-sm font-bold text-emerald-600 hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold tracking-wider text-gray-400 uppercase">
                    <th className="p-5">Order ID</th>
                    <th className="p-5">Customer & Items</th>
                    <th className="p-5">Waktu</th>
                    <th className="p-5">Total</th>
                    <th className="p-5">Status</th>
                    <th className="p-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoadingDashboard ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-sm font-bold text-gray-400"
                      >
                        Memuat pesanan...
                      </td>
                    </tr>
                  ) : recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="p-5 font-mono text-sm font-bold text-gray-900">
                        {order.id}
                      </td>
                      <td className="p-5">
                        <p className="text-sm font-bold text-gray-900">
                          {order.customer}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {order.items.join(", ")}
                        </p>
                      </td>
                      <td className="p-5">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-500">
                          <Clock size={14} />
                          {order.time}
                        </span>
                      </td>
                      <td className="p-5 text-sm font-extrabold text-emerald-600">
                        {formatRp(order.total)}
                      </td>
                      <td className="p-5">{getStatusBadge(order.status)}</td>
                      <td className="p-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/owner/orders/${order.id}`)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            Detail
                          </button>

                          {order.status === "new" ? (
                            <>
                            <button
                              type="button"
                              onClick={() => handleAdvanceOrder(order.id)}
                              className="rounded-xl bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white"
                              title="Terima"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectOrder(order.id)}
                              className="rounded-xl bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-500 hover:text-white"
                              title="Tolak"
                            >
                              <XCircle size={16} />
                            </button>
                            </>
                          ) : null}

                          {order.status === "preparing" ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceOrder(order.id)}
                            className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            Tandai Siap
                          </button>
                          ) : null}

                          {order.status === "ready" ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceOrder(order.id)}
                            className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-colors hover:bg-emerald-600"
                          >
                            Konfirmasi Pickup
                          </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-sm font-bold text-gray-400"
                      >
                        Belum ada pesanan untuk restoran ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "orders" ? (
        <div className="flex h-full flex-col overflow-hidden">
          {dashboardNotice ? (
            <div className="mb-4 shrink-0 rounded-[22px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {dashboardNotice}
            </div>
          ) : null}

          <div className="mb-5 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-extrabold text-emerald-600">
                Manajemen Pesanan
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
                Papan Kanban Order
              </h2>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Baru", orderSummary.new, "text-amber-600"],
                  ["Siap", orderSummary.ready, "text-purple-600"],
                  ["Proses", orderSummary.preparing, "text-blue-600"],
                  ["Selesai", orderSummary.completed, "text-emerald-600"],
                ].map(([label, value, className]) => (
                  <div
                    key={label}
                    className="min-w-[76px] rounded-2xl border border-gray-100 bg-white px-3 py-2 text-center shadow-sm"
                  >
                    <p className={`text-base font-extrabold ${className}`}>
                      {value}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="relative w-full xl:w-80">
                <Search
                  size={17}
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={kanbanQuery}
                  onChange={(event) => handleKanbanQueryChange(event.target.value)}
                  placeholder="Cari ID, customer, menu..."
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-white pr-4 pl-11 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm">
                <ShoppingBag size={16} className="text-emerald-500" />
                {filteredOrders.length} dari {orders.length} pesanan
              </div>
            </div>
          </div>

          <div className="mb-4 flex shrink-0 flex-col gap-3 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectVisibleOrders}
                disabled={selectableFilteredOrders.length === 0 || isBulkUpdating}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {selectableFilteredOrders.length > 0 &&
                selectableFilteredOrders.every((order) =>
                  selectedOrderIds.has(order.id),
                ) ? (
                  <CheckSquare size={17} />
                ) : (
                  <Square size={17} />
                )}
                Pilih terlihat
              </button>
              <div>
                <p className="text-sm font-extrabold text-gray-900">
                  {selectedOrderIds.size} order dipilih
                </p>
                <p className="text-xs font-semibold text-gray-500">
                  Bulk selesai pickup tetap per order karena wajib verifikasi QR.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void handleBulkOrderStatus("PREPARING")}
                disabled={selectedOrderIds.size === 0 || isBulkUpdating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(59,130,246,0.18)] transition-colors hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
              >
                {isBulkUpdating ? <Loader2 size={16} className="animate-spin" /> : <ChefHat size={16} />}
                Proses
              </button>
              <button
                type="button"
                onClick={() => void handleBulkOrderStatus("READY")}
                disabled={selectedOrderIds.size === 0 || isBulkUpdating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.2)] transition-colors hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
              >
                {isBulkUpdating ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
                Siap
              </button>
              <button
                type="button"
                onClick={() => void handleBulkOrderStatus("CANCELLED")}
                disabled={selectedOrderIds.size === 0 || isBulkUpdating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {isBulkUpdating ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                Batalkan
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex h-full min-w-max gap-5">
              {orderColumns.map((column) => {
                const Icon = column.icon;
                const columnOrders = ordersByStatus[column.id];

                return (
                  <section
                    key={column.id}
                    className="flex h-full min-w-[300px] max-w-[340px] flex-1 flex-col rounded-[32px] border border-white/80 bg-gray-50/50 p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)]"
                  >
                    <div className="mb-4 flex shrink-0 items-center justify-between gap-3 px-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${column.accentClassName}`}
                        >
                          <Icon size={20} />
                        </div>
                        <h3 className="truncate text-base font-extrabold text-gray-950">
                          {column.title}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${column.badgeClassName}`}
                      >
                        {columnOrders.length}
                      </span>
                    </div>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {isLoadingDashboard ? (
                        <div className="flex h-40 items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white/70 p-5 text-center">
                          <p className="text-sm font-bold text-gray-400">
                            Memuat pesanan...
                          </p>
                        </div>
                      ) : columnOrders.length > 0 ? (
                        columnOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onAdvance={handleAdvanceOrder}
                            onReject={handleRejectOrder}
                            onOpenDetail={(orderId) =>
                              router.push(`/owner/orders/${orderId}`)
                            }
                            onToggleSelected={toggleSelectedOrder}
                            isSelected={selectedOrderIds.has(order.id)}
                            isSelectable={order.status !== "completed"}
                            isBusy={updatingOrderIds.has(order.id)}
                          />
                        ))
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white/70 p-5 text-center">
                          <p className="text-sm font-bold text-gray-400">
                            {kanbanQuery
                              ? "Tidak ada pesanan yang cocok."
                              : "Belum ada pesanan di kolom ini."}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
