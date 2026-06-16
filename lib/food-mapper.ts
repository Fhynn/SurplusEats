import type { Category, Food } from "@/lib/customer-data";

export type ApiMenuItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string | null;
  originalPrice: number;
  discountedPrice: number;
  stock: number;
  pickupStart: string | null;
  pickupEnd: string | null;
  restaurant: {
    id: string;
    slug: string;
    name: string;
    rating: number;
    reviewCount: number;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  };
};

export function normalizeFoodCategory(category: string): Exclude<Category, "Semua"> {
  const normalized = category.toLowerCase();

  if (normalized.includes("nasi")) {
    return "Nasi";
  }

  if (
    normalized.includes("roti") ||
    normalized.includes("bakery") ||
    normalized.includes("pastry") ||
    normalized.includes("croissant")
  ) {
    return "Roti & Pastry";
  }

  if (normalized.includes("sayur")) {
    return "Sayur";
  }

  if (
    normalized.includes("ayam") ||
    normalized.includes("ikan") ||
    normalized.includes("daging") ||
    normalized.includes("telur") ||
    normalized.includes("lauk")
  ) {
    return "Lauk";
  }

  if (
    normalized.includes("minum") ||
    normalized.includes("kopi") ||
    normalized.includes("teh") ||
    normalized.includes("jus")
  ) {
    return "Minuman";
  }

  if (
    normalized.includes("dessert") ||
    normalized.includes("cake") ||
    normalized.includes("kue") ||
    normalized.includes("donut") ||
    normalized.includes("puding")
  ) {
    return "Dessert";
  }

  if (
    normalized.includes("paket") ||
    normalized.includes("bundle") ||
    normalized.includes("combo") ||
    normalized.includes("hemat")
  ) {
    return "Paket Hemat";
  }

  return "Snack";
}

export function menuItemToFood(menuItem: ApiMenuItem): Food {
  const pickupStart = menuItem.pickupStart || "18:00";
  const pickupEnd = menuItem.pickupEnd || "21:00";

  return {
    id: menuItem.id,
    name: menuItem.name,
    restaurant: menuItem.restaurant.name,
    restaurantId: menuItem.restaurant.id,
    restaurantSlug: menuItem.restaurant.slug,
    restaurantAddress: menuItem.restaurant.address,
    restaurantCity: menuItem.restaurant.city,
    restaurantLatitude: menuItem.restaurant.latitude,
    restaurantLongitude: menuItem.restaurant.longitude,
    distance:
      menuItem.restaurant.latitude !== null && menuItem.restaurant.longitude !== null
        ? "Lokasi belum aktif"
        : "Pin toko belum ada",
    distanceKm: null,
    rating:
      menuItem.restaurant.reviewCount > 0 ? menuItem.restaurant.rating : 0,
    reviews: menuItem.restaurant.reviewCount,
    stock: menuItem.stock,
    time: `${pickupStart} - ${pickupEnd}`,
    originalPrice: menuItem.originalPrice,
    price: menuItem.discountedPrice,
    image: menuItem.imageUrl || "/placeholder-food.svg",
    category: normalizeFoodCategory(menuItem.category),
    description: menuItem.description,
  };
}
