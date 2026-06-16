"use client";

import Image from "next/image";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type CartFeedbackFood = {
  id: string;
  image: string;
  name: string;
};

type FlyingCartItem = {
  id: string;
  image: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
};

function getDefaultCartTargetElement() {
  const targetType = window.innerWidth >= 1024 ? "desktop" : "mobile";
  const preferredTarget = document.querySelector<HTMLElement>(
    `[data-customer-cart-target="${targetType}"]`,
  );
  const fallbackTarget = document.querySelector<HTMLElement>(
    "[data-customer-cart-target]",
  );

  return preferredTarget ?? fallbackTarget;
}

export function useCartInteractionFeedback() {
  const [addedFoodId, setAddedFoodId] = useState<string | null>(null);
  const [cartToast, setCartToast] = useState("");
  const [flyingCartItem, setFlyingCartItem] =
    useState<FlyingCartItem | null>(null);
  const addedTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const flyTimeoutRef = useRef<number | null>(null);

  const clearAddedTimeout = useCallback(() => {
    if (addedTimeoutRef.current) {
      window.clearTimeout(addedTimeoutRef.current);
      addedTimeoutRef.current = null;
    }
  }, []);

  const showCartToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setCartToast(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setCartToast("");
    }, 2400);
  }, []);

  const animateToCart = useCallback(
    (
      food: CartFeedbackFood,
      sourceElement?: HTMLElement | null,
      targetElement?: HTMLElement | null,
    ) => {
      if (!sourceElement) {
        return;
      }

      const startRect = sourceElement.getBoundingClientRect();
      const cartTarget = targetElement ?? getDefaultCartTargetElement();
      const targetRect = cartTarget?.getBoundingClientRect();

      if (!cartTarget || !targetRect) {
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
        cartTarget.classList.add("cart-target-bump");
        window.setTimeout(() => {
          cartTarget.classList.remove("cart-target-bump");
        }, 560);
      }, 420);

      flyTimeoutRef.current = window.setTimeout(() => {
        setFlyingCartItem(null);
      }, 760);
    },
    [],
  );

  const showAddedToCart = useCallback(
    (
      food: CartFeedbackFood,
      sourceElement?: HTMLElement | null,
      targetElement?: HTMLElement | null,
    ) => {
      clearAddedTimeout();
      setAddedFoodId(food.id);
      showCartToast(`${food.name} masuk keranjang.`);
      animateToCart(food, sourceElement, targetElement);
      addedTimeoutRef.current = window.setTimeout(() => {
        setAddedFoodId(null);
      }, 1400);
    },
    [animateToCart, clearAddedTimeout, showCartToast],
  );

  const showCartError = useCallback(
    (message = "Stok menu belum bisa ditambahkan.") => {
      showCartToast(message);
    },
    [showCartToast],
  );

  useEffect(() => {
    return () => {
      clearAddedTimeout();

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }

      if (flyTimeoutRef.current) {
        window.clearTimeout(flyTimeoutRef.current);
      }
    };
  }, [clearAddedTimeout]);

  return {
    addedFoodId,
    cartToast,
    flyingCartItem,
    showAddedToCart,
    showCartError,
  };
}

export function CartFlyItem({ item }: { item: FlyingCartItem | null }) {
  if (!item) {
    return null;
  }

  return (
    <div
      key={item.id}
      className="cart-fly-item"
      style={
        {
          left: item.startX,
          top: item.startY,
          "--cart-fly-dx": `${item.targetX - item.startX}px`,
          "--cart-fly-dy": `${item.targetY - item.startY}px`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="cart-fly-item-inner">
        <Image src={item.image} alt="" fill sizes="52px" className="object-cover" />
      </div>
    </div>
  );
}
