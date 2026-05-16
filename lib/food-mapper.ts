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
    name: string;
    rating: number;
    reviewCount: number;
    address: string;
    city: string;
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

  return "Snack";
}

export function menuItemToFood(menuItem: ApiMenuItem): Food {
  const pickupStart = menuItem.pickupStart || "18:00";
  const pickupEnd = menuItem.pickupEnd || "21:00";

  return {
    id: menuItem.id,
    name: menuItem.name,
    restaurant: menuItem.restaurant.name,
    distance: "1.2 km",
    rating: menuItem.restaurant.rating || 4.8,
    reviews: menuItem.restaurant.reviewCount || 0,
    stock: menuItem.stock,
    time: `${pickupStart} - ${pickupEnd}`,
    originalPrice: menuItem.originalPrice,
    price: menuItem.discountedPrice,
    image: menuItem.imageUrl || "/placeholder-food.svg",
    category: normalizeFoodCategory(menuItem.category),
    description: menuItem.description,
  };
}
