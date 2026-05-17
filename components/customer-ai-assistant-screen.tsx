"use client";

import Image from "next/image";
import {
  Bot,
  ChevronRight,
  Loader2,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { formatRp, type Food } from "@/lib/customer-data";
import { normalizeFoodCategory } from "@/lib/food-mapper";

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
};

type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: AiRecommendation[];
  checkoutReady?: boolean;
  quickReplies?: string[];
};

type AiChatResponse = {
  ok: boolean;
  message?: string;
  reply?: string;
  checkoutReady?: boolean;
  quickReplies?: string[];
  recommendations?: AiRecommendation[];
};

const starterPrompts = [
  "Rekomendasikan makanan enak yang paling hemat",
  "Bantu pilih menu untuk checkout malam ini",
  "Ada menu dari toko mana yang ratingnya bagus?",
  "Cek keranjang saya, sudah cocok belum?",
];

function recommendationToFood(item: AiRecommendation): Food {
  return {
    id: item.id,
    name: item.name,
    restaurant: item.restaurant,
    distance: "1.2 km",
    rating: item.rating || 4.8,
    reviews: item.reviews,
    stock: item.stock,
    time: item.pickupWindow,
    originalPrice: item.originalPrice,
    price: item.discountedPrice,
    image: item.imageUrl || "/placeholder-food.svg",
    category: normalizeFoodCategory(item.category),
    description: item.description,
  };
}

export function CustomerAiAssistantScreen() {
  const router = useRouter();
  const { cart, cartCount, cartTotal, addToCart } = useCustomerApp();
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Halo, aku SurplusEats AI. Aku bisa bantu pilih menu enak, cari diskon paling worth it, siapin keranjang, dan arahkan kamu ke checkout.",
      quickReplies: starterPrompts.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  const cartSummary = useMemo(() => {
    if (cartCount === 0) {
      return "Keranjang masih kosong";
    }

    return `${cartCount} item, total ${formatRp(cartTotal)}`;
  }, [cartCount, cartTotal]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
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
        }),
      });
      const data = (await response.json()) as AiChatResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "AI belum bisa merespons.");
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
              : "AI sedang tidak bisa dipakai. Coba lagi sebentar.",
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

  const handleAddRecommendation = (item: AiRecommendation) => {
    addToCart(recommendationToFood(item));
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
      <header className="shrink-0 border-b border-gray-100 bg-white px-5 pt-7 pb-4 md:px-8 md:pt-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)]">
              <Sparkles size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold tracking-[0.12em] text-emerald-600 uppercase">
                SurplusEats AI
              </p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-gray-950 md:text-2xl">
                Asisten Checkout & Rekomendasi
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700 md:min-w-72">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-emerald-600">
                Keranjang
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-gray-950">
                {cartSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(cartCount > 0 ? "/checkout" : "/cart")}
              className="motion-press flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white"
              aria-label={cartCount > 0 ? "Buka checkout" : "Buka keranjang"}
            >
              <ShoppingBag size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-48 scroll-smooth [scrollbar-width:thin] md:px-8 md:pb-36 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <section className="grid gap-3 md:grid-cols-4">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage(prompt)}
                disabled={isSending}
                className="motion-card rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm disabled:opacity-60"
              >
                <Bot size={17} className="mb-3 text-emerald-500" />
                <span className="text-sm leading-5 font-extrabold text-gray-800">
                  {prompt}
                </span>
              </button>
            ))}
          </section>

          <section className="space-y-4">
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
                    className={`max-w-[92%] rounded-[24px] px-4 py-3 shadow-sm md:max-w-3xl ${
                      isUser
                        ? "bg-gray-950 text-white"
                        : "border border-gray-100 bg-white text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6 font-semibold">
                      {message.content}
                    </p>

                    {message.recommendations?.length ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {message.recommendations.map((item) => {
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
                                    {item.restaurant}
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
                                      onClick={() => handleAddRecommendation(item)}
                                      className="motion-press flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white"
                                      aria-label={`Tambah ${item.name}`}
                                    >
                                      <Plus size={16} />
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
                            className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 disabled:opacity-60"
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
                  AI sedang memilih jawaban...
                </div>
              </article>
            ) : null}
            <div ref={messagesEndRef} className="h-1" />
          </section>
        </div>
      </main>

      <form
        onSubmit={handleSubmit}
        className="absolute right-0 bottom-24 left-0 z-40 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur-xl md:bottom-0 md:px-8 lg:px-10"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tanya AI soal menu, toko, keranjang, atau checkout..."
            className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || input.trim().length < 2}
            className="motion-press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.25)] disabled:bg-gray-300 disabled:shadow-none"
            aria-label="Kirim pertanyaan ke AI"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}
