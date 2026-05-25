"use client";

import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Gift,
  Heart,
  HelpCircle,
  History,
  Leaf,
  LifeBuoy,
  LogOut,
  MapPin,
  PencilLine,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";

const menuGroups: {
  title: string;
  items: {
    title: string;
    description: string;
    route: string;
    icon: LucideIcon;
    className: string;
  }[];
}[] = [
  {
    title: "Akun",
    items: [
      {
        title: "Edit Profil",
        description: "Nama, foto, email, nomor HP, dan password.",
        route: "/profile/edit",
        icon: UserRound,
        className: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "Pengaturan Akun",
        description: "Preferensi notifikasi, keamanan, dan privasi.",
        route: "/profile/settings",
        icon: Settings,
        className: "bg-gray-100 text-gray-700",
      },
      {
        title: "Notifikasi",
        description: "Update order, voucher, refund, dan pickup.",
        route: "/notifications",
        icon: Bell,
        className: "bg-amber-50 text-amber-600",
      },
    ],
  },
  {
    title: "Transaksi",
    items: [
      {
        title: "Riwayat Pesanan",
        description: "Tracking, refund, ulasan, dan pesan lagi.",
        route: "/orders",
        icon: History,
        className: "bg-blue-50 text-blue-600",
      },
      {
        title: "Lokasi Aktif",
        description: "Perbarui lokasi otomatis untuk jarak pickup.",
        route: "/profile/addresses",
        icon: MapPin,
        className: "bg-rose-50 text-rose-600",
      },
      {
        title: "Favorit Saya",
        description: "Menu tersimpan untuk dibeli ulang lebih cepat.",
        route: "/profile/favorites",
        icon: Heart,
        className: "bg-red-50 text-red-500",
      },
      {
        title: "Voucher Saya",
        description: "Klaim, salin, dan gunakan voucher aktif.",
        route: "/profile/vouchers",
        icon: Gift,
        className: "bg-purple-50 text-purple-600",
      },
    ],
  },
  {
    title: "Bantuan",
    items: [
      {
        title: "Pusat Bantuan",
        description: "FAQ pembayaran, pickup, refund, dan akun.",
        route: "/help",
        icon: HelpCircle,
        className: "bg-cyan-50 text-cyan-600",
      },
      {
        title: "Support Customer",
        description: "Live chat dan email support untuk kendala order.",
        route: "/support",
        icon: LifeBuoy,
        className: "bg-indigo-50 text-indigo-600",
      },
    ],
  },
];

type ApiProfileOrder = {
  status: string;
  discount: number;
  items?: Array<{
    priceSnapshot: number;
    originalPriceSnapshot: number;
    quantity: number;
  }>;
};

type ApiProfileVoucher = {
  status: "available" | "used" | "expired";
};

function formatCompactRp(value: number) {
  if (value >= 1_000_000) {
    return `Rp${Math.round(value / 100_000) / 10}jt`;
  }

  if (value >= 1_000) {
    return `Rp${Math.round(value / 1_000)}rb`;
  }

  return `Rp${value}`;
}

function getOrderSavedAmount(order: ApiProfileOrder) {
  const itemSavedAmount = (order.items ?? []).reduce((total, item) => {
    const savedPerItem = Math.max(0, item.originalPriceSnapshot - item.priceSnapshot);

    return total + savedPerItem * item.quantity;
  }, 0);

  return itemSavedAmount + Math.max(0, order.discount);
}

export function CustomerProfileScreen() {
  const router = useRouter();
  const { unreadNotificationCount } = useCustomerApp();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    phone: string | null;
    emailVerified: string | null;
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [orderCount, setOrderCount] = useState(0);
  const [voucherCount, setVoucherCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriteStoreCount, setFavoriteStoreCount] = useState(0);
  const [completedPickupCount, setCompletedPickupCount] = useState(0);
  const [totalSavedAmount, setTotalSavedAmount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadProfileData() {
      setIsLoadingProfile(true);

      try {
        const [
          meResponse,
          ordersResponse,
          vouchersResponse,
          favoritesResponse,
          favoriteStoresResponse,
        ] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
          fetch("/api/vouchers", { cache: "no-store" }),
          fetch("/api/favorites", { cache: "no-store" }),
          fetch("/api/favorite-restaurants", { cache: "no-store" }),
        ]);
        const meData = (await meResponse.json()) as {
          ok: boolean;
          user?: {
            name: string;
            email: string;
            phone: string | null;
            emailVerified: string | null;
          };
        };
        const ordersData = (await ordersResponse.json()) as {
          ok: boolean;
          orders?: ApiProfileOrder[];
        };
        const vouchersData = (await vouchersResponse.json()) as {
          ok: boolean;
          vouchers?: ApiProfileVoucher[];
        };
        const favoritesData = (await favoritesResponse.json()) as {
          ok: boolean;
          favorites?: unknown[];
        };
        const favoriteStoresData = (await favoriteStoresResponse.json()) as {
          ok: boolean;
          favorites?: unknown[];
        };

        if (!meResponse.ok || !meData.ok || !meData.user) {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/");
          router.refresh();
          return;
        }

        if (!ignore) {
          const orders = ordersData.orders ?? [];
          const activeVoucherCount = (vouchersData.vouchers ?? []).filter(
            (voucher) => voucher.status === "available",
          ).length;

          setUser(meData.user);
          setOrderCount(orders.length);
          setVoucherCount(activeVoucherCount);
          setFavoriteCount(favoritesData.favorites?.length ?? 0);
          setFavoriteStoreCount(favoriteStoresData.favorites?.length ?? 0);
          setCompletedPickupCount(
            orders.filter((order) => order.status === "COMPLETED").length,
          );
          setTotalSavedAmount(
            orders.reduce(
              (total, order) => total + getOrderSavedAmount(order),
              0,
            ),
          );
        }
      } catch {
        if (!ignore) {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/");
          router.refresh();
        }
      } finally {
        if (!ignore) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfileData();

    return () => {
      ignore = true;
    };
  }, [router]);

  const impactStats = useMemo(
    () => [
      {
        label: "Food Saved",
        value: `${orderCount} Order`,
        icon: Leaf,
        className: "border-emerald-100 bg-emerald-50 text-emerald-700",
      },
      {
        label: "Voucher",
        value: `${voucherCount} Aktif`,
        icon: Gift,
        className: "border-amber-100 bg-amber-50 text-amber-700",
      },
      {
        label: "Favorit",
        value: `${favoriteCount + favoriteStoreCount} Item`,
        icon: Heart,
        className: "border-blue-100 bg-blue-50 text-blue-700",
      },
    ],
    [favoriteCount, favoriteStoreCount, orderCount, voucherCount],
  );
  const accountBadges = useMemo(() => {
    const badges = ["Sesi aktif"];

    if (user?.emailVerified) {
      badges.push("Email terverifikasi");
    } else if (user?.email) {
      badges.push("Email akun tersimpan");
    }

    if (user?.phone) {
      badges.push("Nomor HP aktif");
    }

    if (completedPickupCount > 0) {
      badges.push(`${completedPickupCount} pickup selesai`);
    }

    return badges;
  }, [completedPickupCount, user?.email, user?.emailVerified, user?.phone]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  const displayName = isLoadingProfile ? "Memuat profil" : user?.name || "Customer";
  const displayEmail = isLoadingProfile
    ? "Menyinkronkan akun..."
    : user?.email || "Sesi perlu diperbarui";

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <div className="min-h-0 flex-1 overflow-y-auto pb-28 [scrollbar-width:none] md:pb-8 [&::-webkit-scrollbar]:hidden">
        <section className="relative overflow-hidden rounded-b-[40px] bg-white px-6 pt-10 pb-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:mx-auto md:mt-6 md:max-w-5xl md:rounded-[32px] md:px-8 md:pt-8">
          <div className="absolute top-0 right-0 -mt-14 -mr-14 h-56 w-56 rounded-full bg-emerald-50 blur-3xl" />

          <div className="relative z-10 mb-7 flex items-start justify-between gap-4 pt-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border-4 border-white bg-emerald-50 text-emerald-600 shadow-[0_10px_26px_rgba(15,23,42,0.10)]">
                <UserRound size={34} />
              </div>
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Leaf size={10} />
                  Food Hero
                </div>
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-gray-900">
                  {displayName}
                </h1>
                <p className="truncate text-sm font-medium text-gray-500">
                  {displayEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/profile/edit")}
              className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              aria-label="Edit profil"
            >
              <PencilLine size={18} />
            </button>
          </div>

          <div className="relative z-10 mb-5 grid grid-cols-3 gap-3">
            {impactStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className={`motion-card rounded-[20px] border p-3 ${stat.className}`}
                >
                  <Icon size={19} className="mb-2" />
                  <p className="text-[9px] font-extrabold tracking-wider uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-gray-950">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <p className="text-sm font-extrabold text-gray-950">
                  Keamanan Akun
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-emerald-600">
                Aman
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {accountBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500"
                >
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl space-y-6 px-6 pt-6 md:px-0">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => router.push("/profile/vouchers")}
              className="motion-card rounded-[24px] border border-emerald-100 bg-emerald-50 p-4 text-left transition-colors hover:bg-emerald-100"
            >
              <WalletCards size={22} className="mb-3 text-emerald-600" />
              <p className="text-sm font-extrabold text-emerald-950">
                Hemat {formatCompactRp(totalSavedAmount)}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-700">
                dari diskon menu dan voucher
              </p>
            </button>
            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="motion-card rounded-[24px] border border-amber-100 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100"
            >
              <Star size={22} className="mb-3 text-amber-600" />
              <p className="text-sm font-extrabold text-amber-950">
                {completedPickupCount} Pickup
              </p>
              <p className="mt-1 text-xs font-medium text-amber-700">
                selesai dari order kamu
              </p>
            </button>
          </div>

          {menuGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-3 px-1 text-xs font-extrabold tracking-[0.18em] text-gray-400 uppercase">
                {group.title}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => router.push(item.route)}
                      className="motion-card group flex w-full items-center gap-3 rounded-[24px] border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-100 hover:shadow-md active:scale-[0.99]"
                    >
                      <span
                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.className}`}
                      >
                        <Icon size={21} />
                        {item.route === "/notifications" &&
                        unreadNotificationCount > 0 ? (
                          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-extrabold text-white">
                            {unreadNotificationCount > 9
                              ? "9+"
                              : unreadNotificationCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold text-gray-950">
                          {item.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-5 font-medium text-gray-500">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight
                        size={18}
                        className="shrink-0 text-gray-300 transition-colors group-hover:text-emerald-500"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="motion-press flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-extrabold text-red-600 transition-transform active:scale-[0.98]"
          >
            <LogOut size={18} />
            Keluar Akun
          </button>
        </section>
      </div>

      {isLogoutOpen ? (
        <div className="modal-backdrop-in absolute inset-0 z-[80] flex items-end overflow-y-auto bg-gray-950/30 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div
            className="sheet-in max-h-[92%] w-full overflow-y-auto rounded-t-[36px] bg-white px-6 pt-5 shadow-[0_-24px_70px_rgba(15,23,42,0.22)] md:max-w-lg md:rounded-[32px] md:shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200 md:hidden" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-950">
                  Keluar dari akun?
                </h2>
                <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                  Kamu tetap bisa login kembali dan melihat riwayat pesanan yang
                  tersimpan di akun kamu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoutOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="Tutup modal logout"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sticky bottom-0 -mx-6 grid grid-cols-2 gap-3 border-t border-gray-100 bg-white px-6 pt-3 pb-1">
              <button
                type="button"
                onClick={() => setIsLogoutOpen(false)}
                className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl bg-red-500 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-red-600"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
