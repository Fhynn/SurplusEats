"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { CartItem, Food } from "@/lib/customer-data";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";

interface CustomerAppContextValue {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  originalTotal: number;
  totalSaved: number;
  addToCart: (food: Food) => void;
  updateCartQty: (id: string, delta: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "resqfood-cart";
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

function apiCartItemToCartItem(item: ApiCartItem): CartItem {
  return {
    ...menuItemToFood(item.menuItem),
    qty: item.quantity,
  };
}

function normalizeStoredCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CartItem => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as Partial<CartItem>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.qty === "number" &&
      Number.isFinite(candidate.qty) &&
      candidate.qty > 0
    );
  });
}

async function saveCartItem(menuItemId: string, quantity = 1) {
  await fetch("/api/cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      menuItemId,
      quantity: Math.max(1, Math.min(20, quantity)),
    }),
  });
}

async function updateStoredCartItem(menuItemId: string, quantity: number) {
  await fetch("/api/cart", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      menuItemId,
      quantity: Math.max(1, Math.min(MAX_CART_ITEM_QTY, quantity)),
    }),
  });
}

async function removeStoredCartItem(menuItemId: string) {
  await fetch(`/api/cart?menuItemId=${encodeURIComponent(menuItemId)}`, {
    method: "DELETE",
  });
}

async function clearStoredCart() {
  await fetch("/api/cart", {
    method: "DELETE",
  });
}

export function CustomerAppProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const cartRef = useRef<CartItem[]>([]);

  const setCartSnapshot = useCallback(
    (nextCartOrUpdater: CartItem[] | ((currentCart: CartItem[]) => CartItem[])) => {
      const nextCart =
        typeof nextCartOrUpdater === "function"
          ? nextCartOrUpdater(cartRef.current)
          : nextCartOrUpdater;

      cartRef.current = nextCart;
      setCart(nextCart);

      return nextCart;
    },
    [],
  );

  useEffect(() => {
    let ignore = false;

    async function hydrateCart() {
      let localCart: CartItem[] = [];

      try {
        const rawCart = window.localStorage.getItem(STORAGE_KEY);

        if (rawCart) {
          localCart = normalizeStoredCart(JSON.parse(rawCart));
          setCartSnapshot(localCart);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      try {
        const response = await fetch("/api/cart", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as CartResponse;

        if (ignore || !data.ok) {
          return;
        }

        const serverCart = (data.cartItems ?? []).map(apiCartItemToCartItem);

        if (serverCart.length > 0) {
          setCartSnapshot(serverCart);
          return;
        }

        if (localCart.length > 0) {
          await Promise.allSettled(
            localCart.map((item) => saveCartItem(item.id, item.qty)),
          );

          const refreshResponse = await fetch("/api/cart", { cache: "no-store" });

          if (!refreshResponse.ok) {
            return;
          }

          const refreshedData = (await refreshResponse.json()) as CartResponse;

          if (!ignore && refreshedData.ok) {
            setCartSnapshot(
              (refreshedData.cartItems ?? []).map(apiCartItemToCartItem),
            );
          }
        }
      } finally {
        if (!ignore) {
          setHasHydrated(true);
        }
      }
    }

    void hydrateCart();

    return () => {
      ignore = true;
    };
  }, [setCartSnapshot]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [cart, hasHydrated]);

  const value = useMemo<CustomerAppContextValue>(() => {
    const addToCart = (food: Food) => {
      setCartSnapshot((currentCart) => {
        const existing = currentCart.find((item) => item.id === food.id);
        const maxQty = Math.min(food.stock, MAX_CART_ITEM_QTY);

        if (maxQty < 1) {
          return currentCart;
        }

        if (existing) {
          return currentCart.map((item) =>
            item.id === food.id
              ? { ...item, qty: Math.min(maxQty, item.qty + 1) }
              : item,
          );
        }

        return [...currentCart, { ...food, qty: 1 }];
      });

      void saveCartItem(food.id).catch(() => undefined);
    };

    const updateCartQty = (id: string, delta: number) => {
      const existing = cartRef.current.find((item) => item.id === id);
      const maxQty = Math.min(existing?.stock ?? MAX_CART_ITEM_QTY, MAX_CART_ITEM_QTY);
      const nextQty = Math.min(maxQty, (existing?.qty ?? 0) + delta);

      setCartSnapshot((currentCart) =>
        currentCart
          .map((item) => {
            if (item.id !== id) {
              return item;
            }

            const maxQty = Math.min(item.stock, MAX_CART_ITEM_QTY);
            const nextQty = Math.min(maxQty, item.qty + delta);

            return nextQty > 0
              ? { ...item, qty: nextQty }
              : null;
          })
          .filter((item): item is CartItem => item !== null),
      );

      if (!existing) {
        return;
      }

      if (nextQty > 0) {
        void updateStoredCartItem(id, nextQty).catch(() => undefined);
        return;
      }

      void removeStoredCartItem(id).catch(() => undefined);
    };

    const clearCart = () => {
      setCartSnapshot([]);
      void clearStoredCart().catch(() => undefined);
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
      addToCart,
      updateCartQty,
      clearCart,
    };
  }, [cart, setCartSnapshot]);

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
