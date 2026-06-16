"use client";

import Image from "next/image";
import {
  BadgePercent,
  Check,
  Clock3,
  Filter,
  Flame,
  Heart,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { CustomerLocationControl } from "@/components/customer-location-control";
import { NotificationBellLink } from "@/components/notification-bell-link";
import { PickupAvailabilityBadge } from "@/components/pickup-availability-badge";
import { SkeletonCardGrid, StateCard } from "@/components/ui-state";
import {
  CATEGORIES,
  formatRatingValue,
  formatRp,
  type Food,
} from "@/lib/customer-data";
import type { CustomerLocation } from "@/lib/customer-location";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import {
  applyFoodDistance,
  hasFoodPickupCoordinates,
  isFoodWithinPickupRadius,
  NEARBY_PICKUP_RADIUS_KM,
  sortFoodsByDistance,
} from "@/lib/geo-distance";

const filterChips = [
  "Terdekat",
  "Harga Termurah",
  "Rating Tertinggi",
  "Diskon Terbesar",
  "Pickup Tercepat",
  "Stok Banyak",
] as const;

type FilterChip = (typeof filterChips)[number];
type PriceRangeId = "all" | "under-10k" | "10k-20k" | "20k-50k" | "over-50k";
type RatingFilterId = "all" | "4" | "4.5";
type DiscountFilterId = "all" | "30" | "50";
type PickupTimeFilterId = "all" | "afternoon" | "evening" | "night";
type SearchSuggestion = {
  id: string;
  label: string;
  type: "Menu" | "Toko" | "Kategori";
};

const priceRangeFilters: Array<{
  id: PriceRangeId;
  label: string;
  min: number;
  max: number;
}> = [
  { id: "all", label: "Semua harga", min: 0, max: Number.POSITIVE_INFINITY },
  { id: "under-10k", label: "< Rp10 rb", min: 0, max: 9_999 },
  { id: "10k-20k", label: "Rp10-20 rb", min: 10_000, max: 20_000 },
  { id: "20k-50k", label: "Rp20-50 rb", min: 20_001, max: 50_000 },
  { id: "over-50k", label: "> Rp50 rb", min: 50_001, max: Number.POSITIVE_INFINITY },
];

const ratingFilters: Array<{ id: RatingFilterId; label: string; min: number }> = [
  { id: "all", label: "Semua rating", min: 0 },
  { id: "4", label: "4.0+", min: 4 },
  { id: "4.5", label: "4.5+", min: 4.5 },
];

const discountFilters: Array<{ id: DiscountFilterId; label: string; min: number }> = [
  { id: "all", label: "Semua diskon", min: 0 },
  { id: "30", label: "Diskon 30%+", min: 30 },
  { id: "50", label: "Diskon 50%+", min: 50 },
];

const pickupTimeFilters: Array<{
  id: PickupTimeFilterId;
  label: string;
  start: number;
  end: number;
}> = [
  { id: "all", label: "Semua waktu", start: 0, end: 24 * 60 },
  { id: "afternoon", label: "Sore 15-18", start: 15 * 60, end: 18 * 60 },
  { id: "evening", label: "Malam 18-21", start: 18 * 60, end: 21 * 60 },
  { id: "night", label: "Larut 21+", start: 21 * 60, end: 24 * 60 },
];

type FlyingCartItem = {
  id: string;
  image: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
};

function getFoodDiscount(food: Food) {
  if (food.originalPrice <= 0 || food.originalPrice <= food.price) {
    return 0;
  }

  return Math.round(((food.originalPrice - food.price) / food.originalPrice) * 100);
}

function parseTimeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function getPickupWindow(food: Food) {
  const [startText = "", endText = ""] = food.time.split(" - ");
  const start = parseTimeToMinutes(startText);
  const end = parseTimeToMinutes(endText);

  if (start === null || end === null) {
    return null;
  }

  return { start, end: end <= start ? end + 24 * 60 : end };
}

function getPickupStartMinutes(food: Food) {
  return getPickupWindow(food)?.start ?? Number.POSITIVE_INFINITY;
}

function matchesPickupTime(food: Food, filter: (typeof pickupTimeFilters)[number]) {
  if (filter.id === "all") {
    return true;
  }

  const pickupWindow = getPickupWindow(food);

  if (!pickupWindow) {
    return false;
  }

  return pickupWindow.start < filter.end && pickupWindow.end > filter.start;
}

export function CustomerBrowseScreen() {
  const router = useRouter();
  const {
    addToCart,
    customerLocation,
    isCustomerLocationLoading,
    setCustomerLocation,
    unreadNotificationCount,
  } = useCustomerApp();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("Terdekat");
  const [activeCategory, setActiveCategory] =
    useState<(typeof CATEGORIES)[number]>("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isNearbyOnly, setIsNearbyOnly] = useState(false);
  const [activePriceRange, setActivePriceRange] =
    useState<PriceRangeId>("all");
  const [activeRatingFilter, setActiveRatingFilter] =
    useState<RatingFilterId>("all");
  const [activeDiscountFilter, setActiveDiscountFilter] =
    useState<DiscountFilterId>("all");
  const [activePickupTimeFilter, setActivePickupTimeFilter] =
    useState<PickupTimeFilterId>("all");
  const [isFavoriteStoresOnly, setIsFavoriteStoresOnly] = useState(false);
  const [favoriteRestaurantIds, setFavoriteRestaurantIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [addingFoodId, setAddingFoodId] = useState<string | null>(null);
  const [addedFoodId, setAddedFoodId] = useState<string | null>(null);
  const [cartToast, setCartToast] = useState("");
  const [flyingCartItem, setFlyingCartItem] =
    useState<FlyingCartItem | null>(null);
  const flyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadFavoriteRestaurants() {
      try {
        const response = await fetch("/api/favorite-restaurants", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          favorites?: Array<{ restaurant?: { id?: string } }>;
        };

        if (!ignore && response.ok && data.ok) {
          setFavoriteRestaurantIds(
            new Set(
              (data.favorites ?? [])
                .map((favorite) => favorite.restaurant?.id)
                .filter((id): id is string => Boolean(id)),
            ),
          );
        }
      } catch {
        if (!ignore) {
          setFavoriteRestaurantIds(new Set());
        }
      }
    }

    void loadFavoriteRestaurants();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (favoriteRestaurantIds.size === 0) {
      setIsFavoriteStoresOnly(false);
    }
  }, [favoriteRestaurantIds]);

  useEffect(() => {
    let ignore = false;

    async function loadFoods() {
      setIsLoadingFoods(true);

      try {
        const params = new URLSearchParams();

        if (query.trim()) {
          params.set("q", query.trim());
        }

        const response = await fetch(`/api/menu-items?${params.toString()}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          ok: boolean;
          menuItems?: ApiMenuItem[];
        };

        if (!ignore) {
          const nextFoods = (result.menuItems?.map(menuItemToFood) ?? []).map(
            (food) => applyFoodDistance(food, customerLocation.coordinates),
          );

          setAllFoods(sortFoodsByDistance(nextFoods));
        }
      } catch {
        if (!ignore) {
          setAllFoods([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingFoods(false);
        }
      }
    }

    const timeoutId = window.setTimeout(loadFoods, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [customerLocation.coordinates, query]);

  useEffect(() => {
    if (!customerLocation.coordinates) {
      setIsNearbyOnly(false);
    }
  }, [customerLocation.coordinates]);

  useEffect(() => {
    if (!cartToast && !addedFoodId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCartToast("");
      setAddedFoodId(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [addedFoodId, cartToast]);

  useEffect(() => {
    return () => {
      if (flyTimeoutRef.current) {
        window.clearTimeout(flyTimeoutRef.current);
      }
    };
  }, []);

  const foods = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const priceFilter =
      priceRangeFilters.find((filter) => filter.id === activePriceRange) ??
      priceRangeFilters[0];
    const ratingFilter =
      ratingFilters.find((filter) => filter.id === activeRatingFilter) ??
      ratingFilters[0];
    const discountFilter =
      discountFilters.find((filter) => filter.id === activeDiscountFilter) ??
      discountFilters[0];
    const pickupFilter =
      pickupTimeFilters.find((filter) => filter.id === activePickupTimeFilter) ??
      pickupTimeFilters[0];
    let nextFoods = [...allFoods];

    if (activeCategory !== "Semua") {
      nextFoods = nextFoods.filter((food) => food.category === activeCategory);
    }

    if (normalizedQuery) {
      nextFoods = nextFoods.filter((food) =>
        [food.name, food.restaurant, food.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (isNearbyOnly) {
      nextFoods = nextFoods.filter((food) => isFoodWithinPickupRadius(food));
    }

    if (priceFilter.id !== "all") {
      nextFoods = nextFoods.filter(
        (food) => food.price >= priceFilter.min && food.price <= priceFilter.max,
      );
    }

    if (ratingFilter.id !== "all") {
      nextFoods = nextFoods.filter(
        (food) => food.reviews > 0 && food.rating >= ratingFilter.min,
      );
    }

    if (discountFilter.id !== "all") {
      nextFoods = nextFoods.filter(
        (food) => getFoodDiscount(food) >= discountFilter.min,
      );
    }

    if (pickupFilter.id !== "all") {
      nextFoods = nextFoods.filter((food) =>
        matchesPickupTime(food, pickupFilter),
      );
    }

    if (isFavoriteStoresOnly) {
      nextFoods = nextFoods.filter((food) =>
        food.restaurantId ? favoriteRestaurantIds.has(food.restaurantId) : false,
      );
    }

    if (activeFilter === "Harga Termurah") {
      return nextFoods.sort((firstFood, secondFood) => firstFood.price - secondFood.price);
    }

    if (activeFilter === "Rating Tertinggi") {
      return nextFoods.sort(
        (firstFood, secondFood) => secondFood.rating - firstFood.rating,
      );
    }

    if (activeFilter === "Diskon Terbesar") {
      return nextFoods.sort(
        (firstFood, secondFood) =>
          getFoodDiscount(secondFood) - getFoodDiscount(firstFood),
      );
    }

    if (activeFilter === "Pickup Tercepat") {
      return nextFoods.sort(
        (firstFood, secondFood) =>
          getPickupStartMinutes(firstFood) - getPickupStartMinutes(secondFood),
      );
    }

    if (activeFilter === "Stok Banyak") {
      return nextFoods.sort(
        (firstFood, secondFood) => secondFood.stock - firstFood.stock,
      );
    }

    return sortFoodsByDistance(nextFoods);
  }, [
    activeCategory,
    activeDiscountFilter,
    activeFilter,
    activePickupTimeFilter,
    activePriceRange,
    activeRatingFilter,
    allFoods,
    favoriteRestaurantIds,
    isFavoriteStoresOnly,
    isNearbyOnly,
    query,
  ]);
  const searchSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const suggestionMap = new Map<string, SearchSuggestion>();

    const addSuggestion = (suggestion: SearchSuggestion) => {
      const key = `${suggestion.type}:${suggestion.label.toLowerCase()}`;

      if (!suggestionMap.has(key) && suggestionMap.size < 7) {
        suggestionMap.set(key, suggestion);
      }
    };

    allFoods.forEach((food) => {
      if (food.name.toLowerCase().includes(normalizedQuery)) {
        addSuggestion({
          id: `menu-${food.id}`,
          label: food.name,
          type: "Menu",
        });
      }

      if (food.restaurant.toLowerCase().includes(normalizedQuery)) {
        addSuggestion({
          id: `store-${food.restaurantId || food.restaurant}`,
          label: food.restaurant,
          type: "Toko",
        });
      }

      if (food.category.toLowerCase().includes(normalizedQuery)) {
        addSuggestion({
          id: `category-${food.category}`,
          label: food.category,
          type: "Kategori",
        });
      }
    });

    return [...suggestionMap.values()];
  }, [allFoods, query]);
  const fallbackSearchSuggestions = useMemo(() => {
    const suggestions = [...new Set(allFoods.slice(0, 8).map((food) => food.category))];

    return suggestions.slice(0, 4);
  }, [allFoods]);
  const foodWithoutPickupPinCount = foods.filter(
    (food) => !hasFoodPickupCoordinates(food),
  ).length;
  const activeAdvancedFilterCount = [
    activeCategory !== "Semua",
    activeFilter !== "Terdekat",
    activePriceRange !== "all",
    activeRatingFilter !== "all",
    activeDiscountFilter !== "all",
    activePickupTimeFilter !== "all",
    isFavoriteStoresOnly,
    isNearbyOnly,
  ].filter(Boolean).length;
  const selectedPriceRange =
    priceRangeFilters.find((filter) => filter.id === activePriceRange) ??
    priceRangeFilters[0];
  const selectedRatingFilter =
    ratingFilters.find((filter) => filter.id === activeRatingFilter) ??
    ratingFilters[0];
  const selectedDiscountFilter =
    discountFilters.find((filter) => filter.id === activeDiscountFilter) ??
    discountFilters[0];
  const selectedPickupTimeFilter =
    pickupTimeFilters.find((filter) => filter.id === activePickupTimeFilter) ??
    pickupTimeFilters[0];
  const activeFilterBadges = [
    query.trim() ? `Cari: ${query.trim()}` : null,
    activeCategory !== "Semua" ? activeCategory : null,
    activeFilter !== "Terdekat" ? activeFilter : null,
    selectedPriceRange.id !== "all" ? selectedPriceRange.label : null,
    selectedRatingFilter.id !== "all" ? selectedRatingFilter.label : null,
    selectedDiscountFilter.id !== "all" ? selectedDiscountFilter.label : null,
    selectedPickupTimeFilter.id !== "all" ? selectedPickupTimeFilter.label : null,
    isFavoriteStoresOnly ? "Toko favorit" : null,
    isNearbyOnly ? `${NEARBY_PICKUP_RADIUS_KM} km` : null,
  ].filter((badge): badge is string => Boolean(badge));

  const resetSearchFilters = () => {
    setQuery("");
    setActiveCategory("Semua");
    setActiveFilter("Terdekat");
    setActivePriceRange("all");
    setActiveRatingFilter("all");
    setActiveDiscountFilter("all");
    setActivePickupTimeFilter("all");
    setIsFavoriteStoresOnly(false);
    setIsNearbyOnly(false);
    setIsSuggestionOpen(false);
  };

  const applySearchSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.label);
    setIsSuggestionOpen(false);

    if (suggestion.type === "Kategori") {
      const category = CATEGORIES.find((item) => item === suggestion.label);

      if (category) {
        setActiveCategory(category);
      }
    }
  };

  const handleLocationChange = (nextLocation: CustomerLocation) => {
    setCustomerLocation(nextLocation);
    setAllFoods((currentFoods) =>
      sortFoodsByDistance(
        currentFoods.map((food) =>
          applyFoodDistance(food, nextLocation.coordinates),
        ),
      ),
    );
  };

  const getCartTargetElement = () => {
    const targetType = window.innerWidth >= 1024 ? "desktop" : "mobile";
    const preferredTarget = document.querySelector<HTMLElement>(
      `[data-customer-cart-target="${targetType}"]`,
    );
    const fallbackTarget = document.querySelector<HTMLElement>(
      "[data-customer-cart-target]",
    );

    return preferredTarget ?? fallbackTarget;
  };

  const animateToCart = (food: Food, sourceElement: HTMLElement) => {
    const startRect = sourceElement.getBoundingClientRect();
    const targetElement = getCartTargetElement();
    const targetRect = targetElement?.getBoundingClientRect();

    if (!targetElement || !targetRect) {
      return;
    }

    if (flyTimeoutRef.current) {
      window.clearTimeout(flyTimeoutRef.current);
    }

    setFlyingCartItem({
      id: `${food.id}-${Date.now()}`,
      image: food.image,
      startX: startRect.left + startRect.width / 2,
      startY: startRect.top + startRect.height / 2,
      targetX: targetRect.left + targetRect.width / 2,
      targetY: targetRect.top + targetRect.height / 2,
    });

    window.setTimeout(() => {
      targetElement.classList.add("cart-target-bump");
      window.setTimeout(() => {
        targetElement.classList.remove("cart-target-bump");
      }, 560);
    }, 420);

    flyTimeoutRef.current = window.setTimeout(() => {
      setFlyingCartItem(null);
    }, 760);
  };

  const handleAddFoodToCart = async (
    food: Food,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    if (addingFoodId === food.id) {
      return;
    }

    const sourceElement = event.currentTarget;

    setAddingFoodId(food.id);

    const added = await addToCart(food);

    setAddingFoodId(null);

    if (!added) {
      setCartToast("Stok menu belum bisa ditambahkan.");
      return;
    }

    setAddedFoodId(food.id);
    setCartToast(`${food.name} masuk keranjang.`);
    animateToCart(food, sourceElement);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <header className="sticky top-0 z-20 rounded-b-3xl bg-white px-6 pt-8 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:rounded-none md:px-8 md:pt-6 lg:px-10">
        <div className="mx-auto mb-5 flex w-full max-w-7xl items-center justify-between">
          <CustomerLocationControl
            location={customerLocation}
            isLoading={isCustomerLocationLoading}
            onLocationChange={handleLocationChange}
          />

          <div className="flex items-center gap-2">
            <NotificationBellLink
              href="/notifications"
              unreadCount={unreadNotificationCount}
            />

            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600">
              <UserRound size={20} />
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl items-center rounded-2xl border border-emerald-500 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.1)]">
          <Search size={20} className="absolute left-4 text-emerald-500" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSuggestionOpen(true);
            }}
            onFocus={() => setIsSuggestionOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsSuggestionOpen(false), 120);
            }}
            placeholder="Cari makan malam hemat..."
            aria-label="Cari makanan surplus"
            autoComplete="off"
            className="w-full rounded-2xl bg-transparent py-3.5 pr-24 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsSuggestionOpen(false);
              }}
              className="absolute right-14 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              aria-label="Hapus pencarian"
            >
              <X size={16} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white transition-colors hover:bg-emerald-500"
            aria-label="Buka filter pencarian"
          >
            <SlidersHorizontal size={18} />
            {activeAdvancedFilterCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 px-1 text-[10px] font-extrabold text-white">
                {activeAdvancedFilterCount}
              </span>
            ) : null}
          </button>

          {isSuggestionOpen && query.trim().length >= 2 ? (
            <div className="absolute top-[calc(100%+0.5rem)] right-0 left-0 z-30 overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
              {searchSuggestions.length > 0 ? (
                <div className="p-2">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySearchSuggestion(suggestion);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-emerald-50"
                    >
                      <span className="min-w-0 truncate text-sm font-extrabold text-gray-900">
                        {suggestion.label}
                      </span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-extrabold text-gray-500">
                        {suggestion.type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-sm font-bold text-gray-500">
                  Tidak ada saran. Coba kata kunci lain atau buka filter.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto px-6 pt-6 pb-28 [scrollbar-width:none] md:px-8 lg:px-10 [&::-webkit-scrollbar]:hidden">
        <section className="group relative mb-8 flex items-center justify-between overflow-hidden rounded-3xl bg-emerald-500 p-5 text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)]">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl transition-transform duration-700 group-hover:scale-150" />

          <div className="relative z-10">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <Leaf size={18} className="fill-white" />
              Hasil Rescue
            </h2>
            <p className="text-xs leading-relaxed font-medium text-emerald-50/90">
              Ada{" "}
              <span className="rounded-md bg-emerald-600/50 px-1.5 py-0.5 text-sm font-bold text-white">
                {foods.length}
              </span>{" "}
              makanan surplus yang cocok.
            </p>
          </div>

          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm">
            <Flame size={24} className="fill-amber-300 text-amber-300" />
          </div>
        </section>

        <section className="-mx-6 flex space-x-3 overflow-x-auto px-6 pb-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`min-h-11 whitespace-nowrap rounded-2xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                activeCategory === category
                  ? "bg-gray-900 text-white shadow-[0_4px_18px_rgba(17,24,39,0.18)]"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {category}
            </button>
          ))}
        </section>

        {activeFilterBadges.length > 0 ? (
          <section className="mt-2 mb-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-gray-100 bg-white px-3 py-3 shadow-sm">
            {activeFilterBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700"
              >
                {badge}
              </span>
            ))}
            <button
              type="button"
              onClick={resetSearchFilters}
              className="ml-auto min-h-11 rounded-full bg-gray-100 px-3 py-2 text-[11px] font-extrabold text-gray-600 transition-colors hover:bg-gray-200"
            >
              Reset
            </button>
          </section>
        ) : null}

        <section className="mt-4 mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-gray-900">
              Flash Rescue
            </h2>
            <p className="text-xs font-medium text-gray-500">
              {query
                ? `Hasil untuk "${query}"`
                : `Urut: ${activeFilter}${isNearbyOnly ? ` - radius ${NEARBY_PICKUP_RADIUS_KM} km` : ""}`}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNearbyOnly((current) => !current)}
              disabled={!customerLocation.coordinates}
              className={`flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
                isNearbyOnly
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <MapPin size={13} />
              {NEARBY_PICKUP_RADIUS_KM} km
            </button>
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50"
            >
              <Filter size={14} />
              Filter{activeAdvancedFilterCount > 0 ? ` (${activeAdvancedFilterCount})` : ""}
            </button>
          </div>
        </section>

        <section className="mb-4 rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-5 font-semibold text-emerald-800">
          {!customerLocation.coordinates
            ? "Produk tetap tampil. Aktifkan lokasi otomatis untuk urutan terdekat dan filter radius."
            : isNearbyOnly
              ? `Menampilkan menu yang berada dalam radius ${NEARBY_PICKUP_RADIUS_KM} km dari lokasi aktif.`
              : foodWithoutPickupPinCount > 0
                ? `${foodWithoutPickupPinCount} menu belum punya pin toko, jadi tidak masuk filter radius.`
                : "Lokasi aktif. Filter radius tersedia kalau kamu hanya ingin melihat pickup terdekat."}
        </section>

        {isLoadingFoods ? (
          <SkeletonCardGrid count={6} />
        ) : foods.length > 0 ? (
          <section className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
            {foods.map((food) => {
              const discount = getFoodDiscount(food);
              const detailRoute = `/detail/${food.id}`;
              const isAddingThisFood = addingFoodId === food.id;
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
                  className="group flex cursor-pointer gap-4 rounded-[24px] border border-gray-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all hover:border-emerald-100 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[18px]">
                  <Image
                    src={food.image}
                    alt={food.name}
                    fill
                    sizes="112px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 rounded-lg border border-white/20 bg-amber-500/90 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-sm">
                    Sisa {food.stock}
                  </div>
                  {discount > 0 ? (
                    <div className="absolute right-2 bottom-2 rounded-lg border border-white/20 bg-emerald-500/90 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-sm">
                      -{discount}%
                    </div>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-2">
                  <h3 className="mb-1 line-clamp-2 text-sm leading-snug font-bold text-gray-900">
                    {food.name}
                  </h3>
                  <p className="mb-2 truncate text-[11px] font-medium text-gray-500">
                    {food.restaurant}
                  </p>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-500">
                    <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                      <Star size={10} className="fill-amber-500 text-amber-500" />
                      {formatRatingValue(food.rating, food.reviews)}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
                        food.distanceKm !== null && food.distanceKm !== undefined
                          ? "bg-emerald-50 text-emerald-700"
                          : hasFoodPickupCoordinates(food)
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <MapPin size={10} />
                      {food.distance}
                    </span>
                    <span className="flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                      <Clock3 size={10} />
                      {food.time}
                    </span>
                    <PickupAvailabilityBadge pickupWindow={food.time} compact />
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div>
                      <p className="mb-0.5 text-[10px] font-medium text-gray-400 line-through decoration-gray-300">
                        {formatRp(food.originalPrice)}
                      </p>
                      <p className="text-sm font-extrabold tracking-tight text-emerald-600">
                        {formatRp(food.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => void handleAddFoodToCart(food, event)}
                      disabled={isAddingThisFood}
                      className={`rounded-xl p-2 transition-all duration-300 active:scale-95 disabled:cursor-wait ${
                        isAddedThisFood
                          ? "bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.24)]"
                          : "bg-gray-100 text-gray-600 hover:bg-emerald-500 hover:text-white"
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
                </article>
              );
            })}
          </section>
        ) : (
          <section className="space-y-4">
            <StateCard
              title="Tidak ada hasil"
              description="Coba reset pencarian, kurangi filter, atau pakai kategori populer di bawah."
              variant="empty"
              action={{
                label: "Reset Pencarian",
                onClick: resetSearchFilters,
              }}
            />
            {fallbackSearchSuggestions.length > 0 ? (
              <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Coba kategori ini
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {fallbackSearchSuggestions.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setActiveCategory(category);
                        setIsSuggestionOpen(false);
                      }}
                      className="min-h-10 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </main>

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

      {flyingCartItem ? (
        <div
          key={flyingCartItem.id}
          className="cart-fly-item"
          style={
            {
              left: flyingCartItem.startX,
              top: flyingCartItem.startY,
              "--cart-fly-dx": `${flyingCartItem.targetX - flyingCartItem.startX}px`,
              "--cart-fly-dy": `${flyingCartItem.targetY - flyingCartItem.startY}px`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <div className="cart-fly-item-inner">
            <Image
              src={flyingCartItem.image}
              alt=""
              fill
              sizes="52px"
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      {isFilterOpen ? (
        <div className="absolute inset-0 z-50 flex items-end bg-gray-950/30 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-[36px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)] md:max-w-lg md:rounded-[32px] md:shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200 md:hidden" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-950">
                  Filter Pencarian
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Atur hasil makanan surplus sesuai budget, rating, dan waktu pickup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                aria-label="Tutup filter"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2">
              <p className="mb-1 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Urutkan
              </p>
              {filterChips.map((filter) => {
                const isActive = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setActiveFilter(filter);
                    }}
                    className={`rounded-2xl border p-4 text-left text-sm font-extrabold transition-all ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10"
                        : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Range Harga
              </p>
              <div className="grid grid-cols-2 gap-2">
                {priceRangeFilters.map((filter) => {
                  const isActive = activePriceRange === filter.id;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActivePriceRange(filter.id)}
                      className={`rounded-2xl border px-3 py-3 text-left text-xs font-extrabold transition-all ${
                        isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10"
                          : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  <Star size={13} />
                  Rating
                </p>
                <div className="grid gap-2">
                  {ratingFilters.map((filter) => {
                    const isActive = activeRatingFilter === filter.id;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setActiveRatingFilter(filter.id)}
                        className={`rounded-2xl border px-3 py-3 text-left text-xs font-extrabold transition-all ${
                          isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10"
                            : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  <BadgePercent size={13} />
                  Diskon
                </p>
                <div className="grid gap-2">
                  {discountFilters.map((filter) => {
                    const isActive = activeDiscountFilter === filter.id;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setActiveDiscountFilter(filter.id)}
                        className={`rounded-2xl border px-3 py-3 text-left text-xs font-extrabold transition-all ${
                          isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10"
                            : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                <Clock3 size={13} />
                Waktu Pickup
              </p>
              <div className="grid grid-cols-2 gap-2">
                {pickupTimeFilters.map((filter) => {
                  const isActive = activePickupTimeFilter === filter.id;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActivePickupTimeFilter(filter.id)}
                      className={`rounded-2xl border px-3 py-3 text-left text-xs font-extrabold transition-all ${
                        isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10"
                          : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-extrabold text-gray-950">
                <Heart size={15} />
                Toko Favorit
              </p>
              <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                {favoriteRestaurantIds.size > 0
                  ? `${favoriteRestaurantIds.size} toko favorit tersedia untuk filter.`
                  : "Belum ada toko favorit yang bisa difilter."}
              </p>
              <button
                type="button"
                onClick={() => setIsFavoriteStoresOnly((current) => !current)}
                disabled={favoriteRestaurantIds.size === 0}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${
                  isFavoriteStoresOnly
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50"
                }`}
              >
                <Heart size={15} className={isFavoriteStoresOnly ? "fill-white" : ""} />
                {isFavoriteStoresOnly ? "Tampilkan Semua Toko" : "Hanya Toko Favorit"}
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-extrabold text-gray-950">
                Area Pickup
              </p>
              <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                {customerLocation.coordinates
                  ? "Filter radius memakai lokasi customer yang sedang aktif."
                  : "Aktifkan lokasi otomatis dulu agar filter radius bisa dipakai."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsNearbyOnly((current) => !current);
                }}
                disabled={!customerLocation.coordinates}
                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${
                  isNearbyOnly
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50"
                }`}
              >
                <MapPin size={15} />
                {isNearbyOnly
                  ? `Lihat Semua Radius`
                  : `Hanya Dalam ${NEARBY_PICKUP_RADIUS_KM} km`}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={resetSearchFilters}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
