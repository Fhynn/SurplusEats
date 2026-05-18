"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { CartItem, Food } from "@/lib/customer-data";

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

const CustomerAppContext = createContext<CustomerAppContextValue | null>(null);

export function CustomerAppProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawCart = window.localStorage.getItem(STORAGE_KEY);
      if (rawCart) {
        setCart(JSON.parse(rawCart) as CartItem[]);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hasHydrated]);

  const value = useMemo<CustomerAppContextValue>(() => {
    const addToCart = (food: Food) => {
      setCart((currentCart) => {
        const existing = currentCart.find((item) => item.id === food.id);

        if (existing) {
          return currentCart.map((item) =>
            item.id === food.id ? { ...item, qty: item.qty + 1 } : item,
          );
        }

        return [...currentCart, { ...food, qty: 1 }];
      });
    };

    const updateCartQty = (id: string, delta: number) => {
      setCart((currentCart) =>
        currentCart
          .map((item) => {
            if (item.id !== id) {
              return item;
            }

            const nextQty = item.qty + delta;

            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          })
          .filter((item): item is CartItem => item !== null),
      );
    };

    const clearCart = () => {
      setCart([]);
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
  }, [cart]);

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
