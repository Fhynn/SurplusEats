export const CATEGORIES = [
  "Semua",
  "Nasi",
  "Roti & Pastry",
  "Sayur",
  "Snack",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Food {
  id: string;
  name: string;
  restaurant: string;
  restaurantId?: string;
  restaurantSlug?: string;
  restaurantAddress?: string;
  restaurantCity?: string;
  restaurantLatitude?: number | null;
  restaurantLongitude?: number | null;
  distance: string;
  distanceKm?: number | null;
  rating: number;
  reviews: number;
  stock: number;
  time: string;
  originalPrice: number;
  price: number;
  image: string;
  category: Exclude<Category, "Semua">;
  description: string;
}

export interface CartItem extends Food {
  qty: number;
}

export const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
