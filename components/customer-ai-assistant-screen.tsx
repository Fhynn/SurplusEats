"use client";

import Image from "next/image";
import {
  Bot,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CartFlyItem,
  useCartInteractionFeedback,
} from "@/components/cart-interaction-feedback";
import { useCustomerApp } from "@/components/customer-app-provider";
import { formatRp, type Food } from "@/lib/customer-data";
import { normalizeFoodCategory } from "@/lib/food-mapper";
import { applyFoodDistance, type Coordinates } from "@/lib/geo-distance";

type AiRecommendation = {
  id: string;
  name: string;
  description: string;
  category: string;
  restaurant: string;
  originalPrice: number;
  discountedPrice: number;
  stock: number;
  imageUrl: string | null;
  pickupWindow: string;
  rating: number;
  reviews: number;
  restaurantId: string;
  restaurantSlug: string;
  restaurantAddress: string;
  restaurantCity: string;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  distance: string | null;
  distanceKm: number | null;
};

type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: AiRecommendation[];
  checkoutReady?: boolean;
  quickReplies?: string[];
  degraded?: boolean;
  fallbackReason?: string;
  checkout?: {
    ready: boolean;
    blockers: string[];
    itemCount: number;
    totalText: string;
    restaurants: string[];
  };
};

type AiChatResponse = {
  ok: boolean;
  message?: string;
  reply?: string;
  checkoutReady?: boolean;
  quickReplies?: string[];
  recommendations?: AiRecommendation[];
  degraded?: boolean;
  fallbackReason?: string;
  checkout?: AiMessage["checkout"];
};

const starterPrompts = [
  "Rekomendasikan makanan enak yang paling hemat",
  "Bantu pilih menu untuk checkout malam ini",
  "Ada menu dari toko mana yang ratingnya bagus?",
  "Cek keranjang saya, sudah cocok belum?",
];

function recommendationToFood(
  item: AiRecommendation,
  origin: Coordinates | null,
): Food {
  return applyFoodDistance({
    id: item.id,
    name: item.name,
    restaurant: item.restaurant,
    restaurantId: item.restaurantId,
    restaurantSlug: item.restaurantSlug,
    restaurantAddress: item.restaurantAddress,
    restaurantCity: item.restaurantCity,
    restaurantLatitude: item.restaurantLatitude,
    restaurantLongitude: item.restaurantLongitude,
    distance: item.distance || "Atur lokasi",
    distanceKm: item.distanceKm,
    rating: item.reviews > 0 ? item.rating : 0,
    reviews: item.reviews,
    stock: item.stock,
    time: item.pickupWindow,
    originalPrice: item.originalPrice,
    price: item.discountedPrice,
    image: item.imageUrl || "/placeholder-food.svg",
    category: normalizeFoodCategory(item.category),
    description: item.description,
  }, origin);
}

export function CustomerAiAssistantScreen() {
  const router = useRouter();
  const { cart, cartCount, cartTotal, addToCart, customerLocation } =
    useCustomerApp();
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo, aku ResQBot. Aku bisa bantu pilih menu enak, cari diskon paling worth it, siapin keranjang, dan arahkan kamu ke checkout.",
      quickReplies: starterPrompts.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [addingRecommendationId, setAddingRecommendationId] =
    useState<string | null>(null);
  const {
    addedFoodId,
    cartToast,
    flyingCartItem,
    showAddedToCart,
    showCartError,
  } = useCartInteractionFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  const cartSummary = useMemo(() => {
    if (cartCount === 0) {
      return "Keranjang masih kosong";
    }

    return `${cartCount} item, total ${formatRp(cartTotal)}`;
  }, [cartCount, cartTotal]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const scrollContainer = scrollContainerRef.current;

      if (!scrollContainer) {
        return;
      }

      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, isSending]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();

    if (!message || isSendingRef.current) {
      return;
    }

    const userMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    const nextMessages = [
      ...messages.map((item) =>
        item.quickReplies?.length ? { ...item, quickReplies: [] } : item,
      ),
      userMessage,
    ];

    isSendingRef.current = true;
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          cart: cart.map((item) => ({
            id: item.id,
            name: item.name,
            restaurant: item.restaurant,
            qty: item.qty,
            price: item.price,
            stock: item.stock,
            category: item.category,
          })),
          history: nextMessages.slice(-8).map((item) => ({
            role: item.role,
            content: item.content,
          })),
          location: customerLocation.coordinates,
        }),
      });
      const data = (await response.json()) as AiChatResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "ResQBot belum bisa merespons.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply || "Aku sudah cek, tapi jawabannya kosong.",
          checkoutReady: data.checkoutReady,
          quickReplies: data.quickReplies || [],
          recommendations: data.recommendations || [],
          degraded: data.degraded,
          fallbackReason: data.fallbackReason,
          checkout: data.checkout,
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "ResQBot sedang tidak bisa dipakai. Coba lagi sebentar.",
        },
      ]);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleAddRecommendation = async (
    item: AiRecommendation,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    if (addingRecommendationId === item.id) {
      return;
    }

    const food = recommendationToFood(item, customerLocation.coordinates);
    const sourceElement = event.currentTarget;

    setAddingRecommendationId(item.id);
    const added = await addToCart(food);
    setAddingRecommendationId(null);

    if (!added) {
      showCartError();
      return;
    }

    showAddedToCart(food, sourceElement);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
      <header className="shrink-0 border-b border-gray-100 bg-white px-4 pt-4 pb-3 md:px-8 md:pt-6 md:pb-4 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)] md:h-12 md:w-12 md:rounded-2xl">
              <Sparkles size={21} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold tracking-[0.12em] text-emerald-600 uppercase md:text-xs">
                ResQBot
              </p>
              <h1 className="mt-1 text-[1.35rem] leading-tight font-extrabold tracking-tight text-gray-950 md:text-2xl">
                Asisten Checkout & Rekomendasi
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-emerald-700 md:min-w-72 md:rounded-2xl md:px-4 md:py-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-emerald-600">
                Keranjang
              </p>
              <p className="mt-0.5 text-[13px] leading-5 font-extrabold text-gray-950 md:text-sm">
                {cartSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(cartCount > 0 ? "/checkout" : "/cart")}
              className="motion-press flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white"
              aria-label={cartCount > 0 ? "Buka checkout" : "Buka keranjang"}
            >
              <ShoppingBag size={18} />
            </button>
          </div>
        </div>
      </header>

      <main
        ref={scrollContainerRef}
        className="mb-[10.75rem] min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-4 scroll-smooth scroll-pb-4 [scrollbar-width:thin] md:mb-0 md:px-8 md:py-5 md:pb-36 md:scroll-pb-36 lg:px-10"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <section className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage(prompt)}
                disabled={isSending}
                className="motion-card min-w-[13.5rem] rounded-[22px] border border-gray-100 bg-white p-3 text-left shadow-sm disabled:opacity-60 md:min-w-0 md:rounded-2xl md:p-4"
              >
                <Bot size={16} className="mb-2 text-emerald-500 md:mb-3 md:size-[17px]" />
                <span className="text-[13px] leading-5 font-extrabold text-gray-800 md:text-sm">
                  {prompt}
                </span>
              </button>
            ))}
          </section>

          <section className="space-y-3 md:space-y-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const canShowQuickReplies =
                !isUser &&
                index === messages.length - 1 &&
                !isSending;
              const visibleQuickReplies = canShowQuickReplies
                ? message.quickReplies ?? []
                : [];

              return (
                <article
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[22px] px-4 py-3 shadow-sm md:max-w-3xl md:rounded-[24px] ${
                      isUser
                        ? "bg-gray-950 text-white"
                        : "border border-gray-100 bg-white text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[13px] leading-6 font-semibold md:text-sm">
                      {message.content}
                    </p>

                    {!isUser && message.degraded ? (
                      <div className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[10px] font-extrabold text-amber-700">
                        Mode fallback lokal
                      </div>
                    ) : null}

                    {!isUser &&
                    message.checkout &&
                    !message.checkout.ready &&
                    message.checkout.blockers.length > 0 ? (
                      <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-[11px] font-extrabold tracking-wide text-amber-800 uppercase">
                          Checkout belum siap
                        </p>
                        <ul className="mt-2 space-y-1 text-xs font-bold text-amber-700">
                          {message.checkout.blockers.map((blocker) => (
                            <li key={blocker}>{blocker}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {message.recommendations?.length ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {message.recommendations.map((item) => {
                          const isAddingThisItem =
                            addingRecommendationId === item.id;
                          const isAddedThisItem = addedFoodId === item.id;
                          const discount = Math.max(
                            0,
                            Math.round(
                              ((item.originalPrice - item.discountedPrice) /
                                item.originalPrice) *
                                100,
                            ),
                          );

                          return (
                            <div
                              key={item.id}
                              className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
                            >
                              <div className="flex gap-3 p-3">
                                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                                  <Image
                                    src={item.imageUrl || "/placeholder-food.svg"}
                                    alt={item.name}
                                    fill
                                    sizes="96px"
                                    className="object-cover"
                                  />
                                  <span className="absolute top-2 left-2 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-extrabold text-white">
                                    -{discount}%
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h3 className="line-clamp-2 text-sm font-extrabold text-gray-950">
                                    {item.name}
                                  </h3>
                                  <p className="mt-1 truncate text-xs font-bold text-gray-500">
                                    {item.distance
                                      ? `${item.restaurant} • ${item.distance}`
                                      : item.restaurant}
                                  </p>
                                  <p className="mt-2 text-xs font-bold text-gray-500">
                                    Pickup {item.pickupWindow}
                                  </p>
                                  <div className="mt-2 flex items-end justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-semibold text-gray-400 line-through">
                                        {formatRp(item.originalPrice)}
                                      </p>
                                      <p className="text-sm font-extrabold text-emerald-600">
                                        {formatRp(item.discountedPrice)}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(event) =>
                                        void handleAddRecommendation(item, event)
                                      }
                                      disabled={isAddingThisItem}
                                      className={`motion-press flex h-9 w-9 items-center justify-center rounded-xl text-white disabled:cursor-wait ${
                                        isAddedThisItem
                                          ? "bg-emerald-600 shadow-[0_10px_22px_rgba(16,185,129,0.24)]"
                                          : "bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300"
                                      }`}
                                      aria-label={`Tambah ${item.name}`}
                                    >
                                      {isAddingThisItem ? (
                                        <Loader2 size={16} className="animate-spin" />
                                      ) : isAddedThisItem ? (
                                        <Check size={16} strokeWidth={3} />
                                      ) : (
                                        <Plus size={16} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => router.push(`/detail/${item.id}`)}
                                className="flex w-full items-center justify-between border-t border-gray-100 bg-white px-3 py-2 text-xs font-extrabold text-emerald-600"
                              >
                                Lihat detail menu
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {message.checkoutReady ? (
                      <button
                        type="button"
                        onClick={() => router.push("/checkout")}
                        className="motion-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white"
                      >
                        Lanjut ke checkout
                        <ChevronRight size={16} />
                      </button>
                    ) : null}

                    {visibleQuickReplies.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {visibleQuickReplies.map((reply) => (
                          <button
                            key={reply}
                            type="button"
                            onClick={() => void sendMessage(reply)}
                            disabled={isSending}
                            className="min-h-11 max-w-full rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-left text-[13px] leading-5 font-extrabold break-words text-emerald-700 disabled:opacity-60 md:text-xs"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    ) : null}
                </div>
              </article>
              );
            })}

            {isSending ? (
              <article className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[24px] border border-gray-100 bg-white px-4 py-3 text-sm font-extrabold text-gray-500 shadow-sm">
                  <Loader2 size={16} className="animate-spin text-emerald-500" />
                  ResQBot sedang memilih jawaban...
                </div>
              </article>
            ) : null}
            <div ref={messagesEndRef} className="h-1" />
          </section>
        </div>
      </main>

      <form
        onSubmit={handleSubmit}
        className="absolute right-0 bottom-[5.75rem] left-0 z-40 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-xl md:bottom-0 md:px-8 md:py-4 lg:px-10"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 md:gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tanya ResQBot soal menu atau checkout..."
            className="h-12 min-w-0 flex-1 rounded-[20px] border border-gray-200 bg-gray-50 px-4 text-[13px] font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 md:rounded-2xl md:text-sm"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || input.trim().length < 2}
            className="motion-press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.25)] disabled:bg-gray-300 disabled:shadow-none"
            aria-label="Kirim pertanyaan ke ResQBot"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
      {cartToast ? (
        <div className="cart-add-toast fixed right-4 bottom-40 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-xs font-extrabold text-gray-800 shadow-[0_18px_44px_rgba(15,23,42,0.14)] md:bottom-24 lg:right-8 lg:bottom-8">
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
      <CartFlyItem item={flyingCartItem} />
    </div>
  );
}
