import {
  getPickupRouteUrl,
  type Coordinates,
} from "@/lib/geo-distance";

export type UiOrderStatus = "ready" | "preparing" | "completed" | "cancelled";

export type ApiOrder = {
  id: string;
  orderCode: string;
  status: string;
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  pickupTime: string | null;
  pickupCode: string | null;
  createdAt: string;
  restaurant: {
    name: string;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
  };
  review: {
    rating: number;
    comment: string | null;
  } | null;
  items: Array<{
    menuNameSnapshot: string;
    restaurantSnapshot: string;
    quantity: number;
    priceSnapshot: number;
    originalPriceSnapshot: number;
    menuItem?: {
      id: string;
      imageUrl: string | null;
      pickupStart: string | null;
      pickupEnd: string | null;
    } | null;
  }>;
};

export type CustomerOrderCard = {
  id: string;
  resto: string;
  items: string;
  total: number;
  status: UiOrderStatus;
  statusText: string;
  time: string;
  image: string;
  foodId?: string;
  pickupRouteUrl: string;
  pickupRouteLabel: string;
  reviewRating?: number;
  reviewComment?: string | null;
};

export function mapOrderStatus(status: string): UiOrderStatus {
  if (status === "READY") return "ready";
  if (status === "COMPLETED" || status === "REFUNDED") return "completed";
  if (status === "CANCELLED" || status === "PAYMENT_FAILED") return "cancelled";
  return "preparing";
}

export function orderStatusText(status: UiOrderStatus) {
  if (status === "ready") return "Siap Diambil";
  if (status === "completed") return "Selesai";
  if (status === "cancelled") return "Dibatalkan";
  return "Sedang Disiapkan";
}

export function formatOrderTime(value: string | null) {
  if (!value) {
    return "Waktu pickup menunggu konfirmasi";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRestaurantCoordinates(order: ApiOrder) {
  if (order.restaurant.latitude === null || order.restaurant.longitude === null) {
    return null;
  }

  return {
    latitude: order.restaurant.latitude,
    longitude: order.restaurant.longitude,
  };
}

export function apiOrderToCard(
  order: ApiOrder,
  customerCoordinates: Coordinates | null = null,
): CustomerOrderCard {
  const status = mapOrderStatus(order.status);
  const firstItem = order.items[0];
  const itemSummary = order.items
    .map((item) => `${item.menuNameSnapshot} (x${item.quantity})`)
    .join(", ");
  const pickupRoute = getPickupRouteUrl(
    customerCoordinates,
    getRestaurantCoordinates(order),
    `${order.restaurant.name} ${order.restaurant.city}`,
  );

  return {
    id: order.orderCode,
    resto: order.restaurant.name,
    items: itemSummary || "Order tanpa item",
    total: order.total,
    status,
    statusText: orderStatusText(status),
    time: formatOrderTime(order.pickupTime || order.createdAt),
    image: firstItem?.menuItem?.imageUrl || "/placeholder-food.svg",
    foodId: firstItem?.menuItem?.id,
    pickupRouteUrl: pickupRoute.url,
    pickupRouteLabel: pickupRoute.label,
    reviewRating: order.review?.rating,
    reviewComment: order.review?.comment,
  };
}
