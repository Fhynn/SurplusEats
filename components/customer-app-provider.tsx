"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CartItem, Food } from "@/lib/customer-data";
import {
  defaultCustomerLocation,
  getCustomerLocationFromAddresses,
  type ApiCustomerAddress,
  type CustomerLocation,
} from "@/lib/customer-location";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import { useRealtimePolling } from "@/components/use-realtime-polling";

interface CustomerAppContextValue {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  originalTotal: number;
  totalSaved: number;
  customerLocation: CustomerLocation;
  isCustomerLocationLoading: boolean;
  unreadNotificationCount: number;
  addToCart: (food: Food, quantity?: number) => Promise<boolean>;
  updateCartQty: (id: string, delta: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  setCustomerLocation: (location: CustomerLocation) => void;
  refreshCustomerLocation: () => Promise<void>;
  refreshUnreadNotifications: () => Promise<void>;
}

const MAX_CART_ITEM_QTY = 20;

const CustomerAppContext = createContext<CustomerAppContextValue | null>(null);

type ApiCartItem = {
  id: string;
  quantity: number;
  menuItem: ApiMenuItem;
};

type CartResponse = {
  ok: boolean;
  cartItems?: ApiCartItem[];
};

type CartMutationResponse = CartResponse & {
  cartItem?: ApiCartItem;
  message?: string;
};

type AddressesResponse = {
  ok: boolean;
  addresses?: ApiCustomerAddress[];
};

type NotificationSummary = {
  readAt: string | null;
};

type NotificationsResponse = {
  ok: boolean;
  notifications?: NotificationSummary[];
  unreadCount?: number;
};

function apiCartItemToCartItem(item: ApiCartItem): CartItem {
  return {
    ...menuItemToFood(item.menuItem),
    qty: item.quantity,
  };
}

async function saveCartItem(menuItemId: string, quantity = 1) {
  const response = await fetch("/api/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      menuItemId,
      quantity: Math.max(1, Math.min(20, quantity)),
    }),
  });
  const data = (await response.json()) as CartMutationResponse;

  if (!response.ok || !data.ok || !data.cartItem) {
    throw new Error(data.message || "Item gagal ditambahkan ke keranjang.");
  }

  return data.cartItem;
}

async function updateStoredCartItem(menuItemId: string, quantity: number) {
  const response = await fetch("/api/cart", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      menuItemId,
      quantity: Math.max(1, Math.min(MAX_CART_ITEM_QTY, quantity)),
    }),
  });
  const data = (await response.json()) as CartMutationResponse;

  if (!response.ok || !data.ok || !data.cartItem) {
    throw new Error(data.message || "Keranjang gagal diperbarui.");
  }

  return data.cartItem;
}

async function removeStoredCartItem(menuItemId: string) {
  const response = await fetch(`/api/cart?menuItemId=${encodeURIComponent(menuItemId)}`, {
    method: "DELETE",
  });
  const data = (await response.json()) as CartMutationResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Item gagal dihapus dari keranjang.");
  }
}

async function clearStoredCart() {
  const response = await fetch("/api/cart", {
    method: "DELETE",
  });
  const data = (await response.json()) as CartMutationResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Keranjang gagal dikosongkan.");
  }
}

export function CustomerAppProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerLocation, setCustomerLocationState] =
    useState<CustomerLocation>(defaultCustomerLocation);
  const [isCustomerLocationLoading, setIsCustomerLocationLoading] =
    useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const setCartSnapshot = useCallback((nextCart: CartItem[]) => {
    setCart(nextCart);
  }, []);

  const setCustomerLocation = useCallback((location: CustomerLocation) => {
    setCustomerLocationState(location);
    setIsCustomerLocationLoading(false);
  }, []);

  const refreshCustomerLocation = useCallback(async () => {
    setIsCustomerLocationLoading(true);

    try {
      const response = await fetch("/api/addresses", { cache: "no-store" });
      const data = (await response.json()) as AddressesResponse;

      if (!response.ok || !data.ok) {
        setCustomerLocationState(defaultCustomerLocation);
        return;
      }

      setCustomerLocationState(
        getCustomerLocationFromAddresses(data.addresses ?? []),
      );
    } catch {
      setCustomerLocationState(defaultCustomerLocation);
    } finally {
      setIsCustomerLocationLoading(false);
    }
  }, []);

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await response.json()) as NotificationsResponse;

      if (!response.ok || !data.ok) {
        setUnreadNotificationCount(0);
        return;
      }

      setUnreadNotificationCount(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : (data.notifications ?? []).filter((notification) => !notification.readAt)
              .length,
      );
    } catch {
      setUnreadNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function hydrateCart() {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });

        const data = (await response.json()) as CartResponse;

        if (ignore) {
          return;
        }

        if (!response.ok || !data.ok) {
          setCartSnapshot([]);
          return;
        }

        setCartSnapshot((data.cartItems ?? []).map(apiCartItemToCartItem));
      } catch {
        if (!ignore) {
          setCartSnapshot([]);
        }
      }
    }

    void hydrateCart();

    return () => {
      ignore = true;
    };
  }, [setCartSnapshot]);

  useEffect(() => {
    let ignore = false;

    async function hydrateCustomerLocation() {
      setIsCustomerLocationLoading(true);

      try {
        const response = await fetch("/api/addresses", { cache: "no-store" });
        const data = (await response.json()) as AddressesResponse;

        if (ignore) {
          return;
        }

        if (!response.ok || !data.ok) {
          setCustomerLocationState(defaultCustomerLocation);
          return;
        }

        setCustomerLocationState(
          getCustomerLocationFromAddresses(data.addresses ?? []),
        );
      } catch {
        if (!ignore) {
          setCustomerLocationState(defaultCustomerLocation);
        }
      } finally {
        if (!ignore) {
          setIsCustomerLocationLoading(false);
        }
      }
    }

    void hydrateCustomerLocation();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    void refreshUnreadNotifications();
  }, [refreshUnreadNotifications]);

  useRealtimePolling({
    intervalMs: 15000,
    onPoll: refreshUnreadNotifications,
  });

  const value = useMemo<CustomerAppContextValue>(() => {
    const upsertCartItem = (cartItem: CartItem) => {
      setCart((currentCart) => {
        const existingItem = currentCart.find((item) => item.id === cartItem.id);

        if (!existingItem) {
          return [cartItem, ...currentCart];
        }

        return currentCart.map((item) =>
          item.id === cartItem.id ? cartItem : item,
        );
      });
    };

    const addToCart = async (food: Food, quantity = 1) => {
      const maxQty = Math.min(food.stock, MAX_CART_ITEM_QTY);

      if (maxQty < 1) {
        return false;
      }

      try {
        const cartItem = await saveCartItem(food.id, Math.min(quantity, maxQty));

        upsertCartItem(apiCartItemToCartItem(cartItem));
        return true;
      } catch {
        return false;
      }
    };

    const updateCartQty = async (id: string, delta: number) => {
      const existing = cart.find((item) => item.id === id);
      const maxQty = Math.min(existing?.stock ?? MAX_CART_ITEM_QTY, MAX_CART_ITEM_QTY);
      const nextQty = Math.min(maxQty, (existing?.qty ?? 0) + delta);

      if (!existing) {
        return false;
      }

      try {
        if (nextQty > 0) {
          const cartItem = await updateStoredCartItem(id, nextQty);
          upsertCartItem(apiCartItemToCartItem(cartItem));
          return true;
        }

        await removeStoredCartItem(id);
        setCart((currentCart) => currentCart.filter((item) => item.id !== id));
        return true;
      } catch {
        return false;
      }
    };

    const clearCart = async () => {
      try {
        await clearStoredCart();
        setCart([]);
        return true;
      } catch {
        return false;
      }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const originalTotal = cart.reduce(
      (sum, item) => sum + item.originalPrice * item.qty,
      0,
    );
    const totalSaved = originalTotal - cartTotal;

    return {
      cart,
      cartCount,
      cartTotal,
      originalTotal,
      totalSaved,
      customerLocation,
      isCustomerLocationLoading,
      unreadNotificationCount,
      addToCart,
      updateCartQty,
      clearCart,
      setCustomerLocation,
      refreshCustomerLocation,
      refreshUnreadNotifications,
    };
  }, [
    cart,
    customerLocation,
    isCustomerLocationLoading,
    refreshCustomerLocation,
    refreshUnreadNotifications,
    setCustomerLocation,
    unreadNotificationCount,
  ]);

  return (
    <CustomerAppContext.Provider value={value}>
      {children}
    </CustomerAppContext.Provider>
  );
}

export function useCustomerApp() {
  const context = useContext(CustomerAppContext);

  if (!context) {
    throw new Error("useCustomerApp must be used within CustomerAppProvider.");
  }

  return context;
}
