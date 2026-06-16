export const CATEGORIES = [
  "Semua",
  "Nasi",
  "Roti & Pastry",
  "Sayur",
  "Lauk",
  "Minuman",
  "Dessert",
  "Snack",
  "Paket Hemat",
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

export function formatRatingValue(rating: number, reviewCount: number) {
  if (reviewCount <= 0 || rating <= 0) {
    return "Baru";
  }

  return rating.toFixed(1).replace(/\.0$/, "");
}

export function formatRatingSummary(rating: number, reviewCount: number) {
  if (reviewCount <= 0 || rating <= 0) {
    return "Belum ada ulasan";
  }

  return `${formatRatingValue(rating, reviewCount)} (${reviewCount})`;
}

export type PickupAvailabilityStatus =
  | "open"
  | "upcoming"
  | "closed"
  | "unknown";

export type PickupAvailability = {
  status: PickupAvailabilityStatus;
  label: string;
  description: string;
};

function parsePickupClock(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);

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

function formatPickupClock(minutes: number) {
  const normalizedMinutes = minutes % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

export function getPickupAvailability(
  pickupWindow: string,
  now: Date = new Date(),
): PickupAvailability {
  const [startText = "", endText = ""] = pickupWindow.split(" - ");
  const start = parsePickupClock(startText);
  const end = parsePickupClock(endText);

  if (start === null || end === null) {
    return {
      status: "unknown",
      label: "Jam pickup belum jelas",
      description: "Cek detail toko sebelum checkout.",
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isOvernight = end <= start;
  const isOpen = isOvernight
    ? nowMinutes >= start || nowMinutes <= end
    : nowMinutes >= start && nowMinutes <= end;

  if (isOpen) {
    return {
      status: "open",
      label: "Pickup buka",
      description: `Bisa diambil sampai ${formatPickupClock(end)} WIB.`,
    };
  }

  if (!isOvernight && nowMinutes > end) {
    return {
      status: "closed",
      label: "Pickup selesai",
      description: "Window pickup hari ini sudah lewat.",
    };
  }

  return {
    status: "upcoming",
    label: "Buka nanti",
    description: `Pickup mulai ${formatPickupClock(start)} WIB.`,
  };
}
