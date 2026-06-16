"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BellRing,
  Check,
  ChevronLeft,
  Clock3,
  Heart,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
} from "lucide-react";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  CartFlyItem,
  useCartInteractionFeedback,
} from "@/components/cart-interaction-feedback";
import { useCustomerApp } from "@/components/customer-app-provider";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { InlineNotice, StateCard } from "@/components/ui-state";
import {
  CATEGORIES,
  formatRatingSummary,
  formatRatingValue,
  formatRp,
  type Food,
} from "@/lib/customer-data";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import { applyFoodDistance, sortFoodsByDistance } from "@/lib/geo-distance";
import {
  showSweetConfirm,
  showSweetError,
  showSweetToast,
} from "@/lib/sweet-alert";

type ApiFavorite = {
  id: string;
  menuItem: ApiMenuItem;
};

type ApiFavoriteRestaurant = {
  id: string;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    address: string;
    city: string;
    imageUrl: string | null;
    bannerUrl: string | null;
    rating: number;
    reviewCount: number;
    pickupStart: string | null;
    pickupEnd: string | null;
    _count: {
      favoritedBy: number;
      menuItems: number;
    };
    menuItems: Array<{
      id: string;
      name: string;
      imageUrl: string | null;
      discountedPrice: number;
      createdAt: string;
    }>;
  };
};

type FavoriteTab = "menus" | "stores";
type MenuFavoriteSort = "nearby" | "price" | "rating";
type StoreFavoriteSort = "latest" | "rating" | "menus" | "followers";

type FavoriteStore = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  image: string;
  rating: number;
  reviewCount: number;
  followerCount: number;
  menuCount: number;
  pickupWindow: string;
  previewText: string;
  latestMenuId: string | null;
  latestMenuName: string | null;
  latestMenuImage: string | null;
  latestMenuPrice: number | null;
  latestMenuCreatedAt: string | null;
};

function mapFavoriteRestaurant(favorite: ApiFavoriteRestaurant): FavoriteStore {
  const { restaurant } = favorite;
  const firstMenu = restaurant.menuItems[0];

  return {
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    address: restaurant.address,
    city: restaurant.city,
    image:
      restaurant.bannerUrl ||
      restaurant.imageUrl ||
      firstMenu?.imageUrl ||
      "/placeholder-food.svg",
    rating: restaurant.reviewCount > 0 ? restaurant.rating : 0,
    reviewCount: restaurant.reviewCount,
    followerCount: restaurant._count.favoritedBy,
    menuCount: restaurant._count.menuItems,
    pickupWindow: `${restaurant.pickupStart || "18:00"} - ${
      restaurant.pickupEnd || "21:00"
    }`,
    previewText:
      restaurant.menuItems.map((menuItem) => menuItem.name).join(", ") ||
      "Belum ada menu aktif",
    latestMenuId: firstMenu?.id ?? null,
    latestMenuName: firstMenu?.name ?? null,
    latestMenuImage: firstMenu?.imageUrl ?? null,
    latestMenuPrice: firstMenu?.discountedPrice ?? null,
    latestMenuCreatedAt: firstMenu?.createdAt ?? null,
  };
}

function formatFavoriteDate(value: string | null) {
  if (!value) {
    return "Belum ada menu baru";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CustomerFavoritesPage() {
  const router = useRouter();
  const { addToCart, cartCount, customerLocation } = useCustomerApp();
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [favoriteStores, setFavoriteStores] = useState<FavoriteStore[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Semua");
  const [activeTab, setActiveTab] = useState<FavoriteTab>("menus");
  const [menuSort, setMenuSort] = useState<MenuFavoriteSort>("nearby");
  const [storeSort, setStoreSort] = useState<StoreFavoriteSort>("latest");
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [addingFavoriteId, setAddingFavoriteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cartTargetRef = useRef<HTMLButtonElement | null>(null);
  const {
    addedFoodId,
    cartToast,
    flyingCartItem,
    showAddedToCart,
    showCartError,
  } = useCartInteractionFeedback();

  const loadFavorites = useCallback(async () => {
    setIsLoadingFavorites(true);

    try {
      const [favoritesResponse, storesResponse] = await Promise.all([
        fetch("/api/favorites", { cache: "no-store" }),
        fetch("/api/favorite-restaurants", { cache: "no-store" }),
      ]);
      const favoritesData = (await favoritesResponse.json()) as {
        ok: boolean;
        message?: string;
        favorites?: ApiFavorite[];
      };
      const storesData = (await storesResponse.json()) as {
        ok: boolean;
        message?: string;
        favorites?: ApiFavoriteRestaurant[];
      };

      if (!favoritesResponse.ok || !favoritesData.ok) {
        throw new Error(favoritesData.message || "Favorit gagal dimuat.");
      }

      if (!storesResponse.ok || !storesData.ok) {
        throw new Error(storesData.message || "Toko diikuti gagal dimuat.");
      }

      const foods = (favoritesData.favorites ?? []).map((favorite) =>
        menuItemToFood(favorite.menuItem),
      );

      setFavorites(foods);
      setFavoriteStores((storesData.favorites ?? []).map(mapFavoriteRestaurant));
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Favorit gagal dimuat.");
      setFavorites([]);
      setFavoriteStores([]);
    } finally {
      setIsLoadingFavorites(false);
    }
  }, []);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const visibleFavorites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let nextFavorites = sortFoodsByDistance(
      favorites.map((food) =>
        applyFoodDistance(food, customerLocation.coordinates),
      ),
    );

    if (activeCategory !== "Semua") {
      nextFavorites = nextFavorites.filter(
        (food) => food.category === activeCategory,
      );
    }

    if (normalizedQuery) {
      nextFavorites = nextFavorites.filter((food) =>
        [food.name, food.restaurant, food.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (menuSort === "price") {
      return nextFavorites.sort(
        (firstFood, secondFood) => firstFood.price - secondFood.price,
      );
    }

    if (menuSort === "rating") {
      return nextFavorites.sort(
        (firstFood, secondFood) => secondFood.rating - firstFood.rating,
      );
    }

    return nextFavorites;
  }, [activeCategory, customerLocation.coordinates, favorites, menuSort, query]);

  const visibleFavoriteStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let nextStores = [...favoriteStores];

    if (normalizedQuery) {
      nextStores = nextStores.filter((store) =>
        [store.name, store.city, store.address, store.previewText]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (storeSort === "rating") {
      return nextStores.sort(
        (firstStore, secondStore) => secondStore.rating - firstStore.rating,
      );
    }

    if (storeSort === "menus") {
      return nextStores.sort(
        (firstStore, secondStore) => secondStore.menuCount - firstStore.menuCount,
      );
    }

    if (storeSort === "followers") {
      return nextStores.sort(
        (firstStore, secondStore) =>
          secondStore.followerCount - firstStore.followerCount,
      );
    }

    return nextStores.sort(
      (firstStore, secondStore) =>
        new Date(secondStore.latestMenuCreatedAt ?? 0).getTime() -
        new Date(firstStore.latestMenuCreatedAt ?? 0).getTime(),
    );
  }, [favoriteStores, query, storeSort]);

  const handleRemoveFavorite = async (foodId: string) => {
    const food = favorites.find((item) => item.id === foodId);
    const isConfirmed = await showSweetConfirm({
      title: "Hapus dari favorit?",
      text: food
        ? `${food.name} akan dihapus dari daftar favorit.`
        : "Menu ini akan dihapus dari daftar favorit.",
      confirmButtonText: "Ya, hapus",
      danger: true,
    });

    if (!isConfirmed) {
      return;
    }

    const previousFavorites = favorites;
    setFavorites((currentFavorites) =>
      currentFavorites.filter((food) => food.id !== foodId),
    );

    try {
      const response = await fetch(`/api/favorites?menuItemId=${foodId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Favorit gagal dihapus.");
      }

      showSweetToast({
        icon: "success",
        title: "Menu dihapus dari favorit.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Favorit gagal dihapus.";

      setFavorites(previousFavorites);
      setNotice(message);
      void showSweetError({
        title: "Favorit gagal dihapus",
        text: message,
      });
    }
  };

  const handleAddFavoriteToCart = async (
    food: Food,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (addingFavoriteId === food.id) {
      return;
    }

    const sourceElement = event.currentTarget;

    setAddingFavoriteId(food.id);
    const added = await addToCart(food);
    setAddingFavoriteId(null);

    if (!added) {
      showCartError();
      return;
    }

    showAddedToCart(food, sourceElement, cartTargetRef.current);
  };

  const handleRemoveFavoriteStore = async (storeId: string) => {
    const store = favoriteStores.find((item) => item.id === storeId);
    const isConfirmed = await showSweetConfirm({
      title: "Berhenti mengikuti toko?",
      text: store
        ? `${store.name} akan dihapus dari daftar toko favorit.`
        : "Toko ini akan dihapus dari daftar favorit.",
      confirmButtonText: "Ya, hapus",
      danger: true,
    });

    if (!isConfirmed) {
      return;
    }

    const previousStores = favoriteStores;
    setFavoriteStores((currentStores) =>
      currentStores.filter((store) => store.id !== storeId),
    );

    try {
      const response = await fetch(
        `/api/favorite-restaurants?restaurantId=${encodeURIComponent(storeId)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Toko gagal dihapus dari favorit.");
      }

      showSweetToast({
        icon: "success",
        title: "Toko dihapus dari favorit.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Toko gagal dihapus dari favorit.";

      setFavoriteStores(previousStores);
      setNotice(message);
      void showSweetError({
        title: "Toko gagal dihapus",
        text: message,
      });
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-5 pt-10 pb-5 shadow-sm sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center">
              <Link
                href="/profile"
                className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                aria-label="Kembali ke profil"
              >
                <ChevronLeft size={24} className="text-gray-800" />
              </Link>
              <div className="ml-2 min-w-0">
                <h1 className="text-lg font-extrabold text-gray-900">
                  Favorit Saya
                </h1>
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  {activeTab === "menus"
                    ? `${favorites.length} menu tersimpan`
                    : `${favoriteStores.length} toko diikuti`}
                </p>
              </div>
            </div>
            <button
              ref={cartTargetRef}
              type="button"
              data-customer-cart-target="favorite-header"
              onClick={() => router.push("/cart")}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
              aria-label="Buka keranjang"
            >
              <ShoppingBag size={21} />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-5 rounded-full border-2 border-white bg-emerald-500 px-1 text-[10px] leading-4 font-extrabold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Heart size={22} className="fill-red-500" />
            </div>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                activeTab === "menus" ? "Cari menu favorit..." : "Cari toko diikuti..."
              }
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-11 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 pb-28 [scrollbar-width:none] sm:px-6 md:mx-auto md:w-full md:max-w-5xl md:px-8 [&::-webkit-scrollbar]:hidden">
          <section className="mb-4 grid grid-cols-2 gap-2 rounded-[22px] bg-white p-1 shadow-sm ring-1 ring-gray-100">
            {[
              { id: "menus" as const, label: "Menu", count: favorites.length },
              {
                id: "stores" as const,
                label: "Toko",
                count: favoriteStores.length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[18px] px-4 py-3 text-xs font-extrabold transition-colors ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </section>

          <section className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-red-100 bg-red-50 p-4">
              <Heart size={18} className="mb-2 fill-red-500 text-red-500" />
              <p className="text-xs font-extrabold text-red-700">Menu favorit</p>
              <p className="mt-1 text-2xl font-extrabold text-red-950">
                {favorites.length}
              </p>
            </div>
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
              <BellRing size={18} className="mb-2 text-emerald-600" />
              <p className="text-xs font-extrabold text-emerald-700">
                Toko diikuti
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-950">
                {favoriteStores.length}
              </p>
            </div>
            <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-4">
              <Sparkles size={18} className="mb-2 text-amber-600" />
              <p className="text-xs font-extrabold text-amber-700">
                Menu baru
              </p>
              <p className="mt-1 text-2xl font-extrabold text-amber-950">
                {
                  favoriteStores.filter((store) => store.latestMenuId !== null)
                    .length
                }
              </p>
            </div>
          </section>

          <section className="mb-5 rounded-[22px] border border-gray-100 bg-white p-3 shadow-sm">
            {activeTab === "menus" ? (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { id: "nearby" as const, label: "Terdekat" },
                  { id: "price" as const, label: "Termurah" },
                  { id: "rating" as const, label: "Rating" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMenuSort(option.id)}
                    className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition-colors ${
                      menuSort === option.id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { id: "latest" as const, label: "Menu terbaru" },
                  { id: "rating" as const, label: "Rating" },
                  { id: "menus" as const, label: "Menu terbanyak" },
                  { id: "followers" as const, label: "Pengikut" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStoreSort(option.id)}
                    className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition-colors ${
                      storeSort === option.id
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          {activeTab === "menus" ? (
            <section className="mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-colors ${
                  activeCategory === category
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 bg-white text-gray-500"
                }`}
              >
                {category}
              </button>
              ))}
            </section>
          ) : null}

          {notice ? (
            <InlineNotice
              variant="error"
              description={notice}
              className="mb-5"
            />
          ) : null}

          {isLoadingFavorites ? (
            <StateCard
              title="Memuat favorit"
              description="Mengambil menu dan toko yang kamu simpan."
              variant="loading"
            />
          ) : activeTab === "stores" ? (
            visibleFavoriteStores.length > 0 ? (
              <section className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                {visibleFavoriteStores.map((store) => {
                  const storeRoute = `/stores/${store.slug || store.id}`;

                  return (
                    <article
                      key={store.id}
                      onClick={() => router.push(storeRoute)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(storeRoute);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="group cursor-pointer overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm transition-all hover:border-emerald-100 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    >
                    <div className="relative h-36 overflow-hidden bg-gray-100">
                      <Image
                        src={store.image}
                        alt={store.name}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3 rounded-xl bg-red-500 px-2.5 py-1 text-[10px] font-extrabold text-white">
                        Diikuti
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-extrabold text-gray-950">
                            {store.name}
                          </h2>
                          <p className="mt-1 truncate text-[11px] font-semibold text-gray-500">
                            {store.city} - {store.address}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRemoveFavoriteStore(store.id);
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                          aria-label={`Berhenti mengikuti ${store.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="line-clamp-2 text-xs leading-5 font-medium text-gray-600">
                        {store.previewText}
                      </p>
                      {store.latestMenuId ? (
                        <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                            <Image
                              src={store.latestMenuImage || store.image}
                              alt={store.latestMenuName || store.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
                              <BellRing size={11} />
                              Menu terbaru
                            </p>
                            <p className="mt-1 truncate text-xs font-extrabold text-gray-950">
                              {store.latestMenuName}
                            </p>
                            <p className="mt-1 text-[11px] font-bold text-emerald-700">
                              {store.latestMenuPrice
                                ? formatRp(store.latestMenuPrice)
                                : formatFavoriteDate(store.latestMenuCreatedAt)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                        <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                          <Star size={10} className="fill-amber-500 text-amber-500" />
                          {formatRatingSummary(store.rating, store.reviewCount)}
                        </span>
                        <span className="flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                          <Store size={10} />
                          {store.followerCount} pengikut
                        </span>
                        <span className="rounded bg-gray-50 px-1.5 py-0.5">
                          {store.menuCount} menu
                        </span>
                        <span className="flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5">
                          <Clock3 size={10} />
                          {store.pickupWindow}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(
                            store.latestMenuId
                              ? `/detail/${store.latestMenuId}`
                              : storeRoute,
                          );
                        }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500"
                      >
                        <ShoppingBag size={15} />
                        {store.latestMenuId ? "Lihat Menu Baru" : "Lihat Toko"}
                      </button>
                    </div>
                    </article>
                  );
                })}
              </section>
            ) : (
              <StateCard
                title="Belum ada toko diikuti"
                description="Ikuti toko dari halaman toko agar lebih cepat menemukan menu barunya."
                variant="empty"
                action={{
                  label: "Cari Toko",
                  href: "/browser",
                }}
              />
            )
          ) : visibleFavorites.length > 0 ? (
            <section className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {visibleFavorites.map((food) => {
                const detailRoute = `/detail/${food.id}`;
                const isAddingThisFood = addingFavoriteId === food.id;
                const isAddedThisFood = addedFoodId === food.id;

                return (
                  <article
                    key={food.id}
                    onClick={() => router.push(detailRoute)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(detailRoute);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="group flex cursor-pointer gap-4 rounded-[24px] border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-emerald-100 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100"
                  >
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[18px] bg-gray-100">
                    <Image
                      src={food.image}
                      alt={food.name}
                      fill
                      sizes="112px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 rounded-lg bg-red-500 px-2 py-1 text-[9px] font-extrabold text-white">
                      Favorit
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                    <h2 className="line-clamp-2 text-sm leading-snug font-extrabold text-gray-950">
                      {food.name}
                    </h2>
                    <p className="mt-1 truncate text-[11px] font-semibold text-gray-500">
                      {food.restaurant}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                      <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        {formatRatingValue(food.rating, food.reviews)}
                      </span>
                      <span className="flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5">
                        <MapPin size={10} />
                        {food.distance}
                      </span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 line-through">
                          {formatRp(food.originalPrice)}
                        </p>
                        <p className="text-sm font-extrabold text-emerald-600">
                          {formatRp(food.price)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRemoveFavorite(food.id);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                          aria-label={`Hapus ${food.name} dari favorit`}
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleAddFavoriteToCart(food, event);
                          }}
                          disabled={isAddingThisFood}
                          className={`motion-press flex h-10 w-10 items-center justify-center rounded-xl text-white disabled:cursor-wait ${
                            isAddedThisFood
                              ? "bg-emerald-500 shadow-[0_10px_22px_rgba(16,185,129,0.24)]"
                              : "bg-gray-900 hover:bg-emerald-500 disabled:bg-gray-300"
                          }`}
                          aria-label={`Tambah ${food.name} ke keranjang`}
                        >
                          {isAddingThisFood ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : isAddedThisFood ? (
                            <Check size={16} strokeWidth={3} />
                          ) : (
                            <Plus size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <StateCard
              title="Belum ada favorit"
              description="Simpan menu dari halaman detail produk untuk belanja ulang lebih cepat."
              variant="empty"
              action={{
                label: "Cari Menu",
                href: "/home",
              }}
            />
          )}
        </div>
      </div>
      {cartToast ? (
        <div className="cart-add-toast fixed right-4 bottom-24 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-xs font-extrabold text-gray-800 shadow-[0_18px_44px_rgba(15,23,42,0.14)] lg:right-8 lg:bottom-8">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={17} strokeWidth={3} />
          </span>
          <span className="line-clamp-2">{cartToast}</span>
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="ml-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white transition-colors hover:bg-emerald-700"
          >
            Lihat
          </button>
        </div>
      ) : null}
      <CartFlyItem item={flyingCartItem} />
    </MobileDeviceFrame>
  );
}
