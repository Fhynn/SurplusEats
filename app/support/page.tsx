"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Headphones,
  Mail,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  Send,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type SupportMode = "chat" | "email";
type MessageSource = "agent" | "user" | "store";

type ChatMessage = {
  id: number;
  source: MessageSource;
  name: string;
  text: string;
  time: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    source: "agent",
    name: "SurplusEats Care",
    text: "Halo, kami siap bantu. Kalau ini soal pickup, kirim order ID agar kami bisa cek lebih cepat.",
    time: "Baru saja",
  },
];

const quickTopics = [
  {
    title: "Pesanan & Pickup",
    description: "Tanya status order, QR, atau lokasi restoran.",
    icon: PackageCheck,
  },
  {
    title: "Refund",
    description: "Laporkan makanan tidak sesuai atau toko tutup.",
    icon: RefreshCcw,
  },
  {
    title: "Pembayaran",
    description: "Cek struk, metode bayar, atau transaksi gagal.",
    icon: ReceiptText,
  },
] as const;

export default function CustomerSupportPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SupportMode>("chat");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [emailCategory, setEmailCategory] = useState("Pesanan");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: currentMessages.length + 1,
        source: "user",
        name: "Kamu",
        text: trimmedMessage,
        time: "Sekarang",
      },
      {
        id: currentMessages.length + 2,
        source: "agent",
        name: "SurplusEats Care",
        text: "Pesan sudah kami terima. Tim support akan membantu mengecek detailnya.",
        time: "Sekarang",
      },
    ]);
    setMessage("");
  };

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!emailMessage.trim()) {
      return;
    }

    setEmailSent(true);
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-white px-6 pt-10 pb-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </button>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold tracking-wider text-emerald-600 uppercase">
              Online
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
              <Headphones size={28} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-gray-950">
                Support Center
              </h1>
              <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                Chat dengan support atau kirim laporan email untuk pesanan,
                refund, dan pickup.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("chat")}
              className={`rounded-xl py-2.5 text-sm font-extrabold transition-colors ${
                mode === "chat"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Live Chat
            </button>
            <button
              type="button"
              onClick={() => setMode("email")}
              className={`rounded-xl py-2.5 text-sm font-extrabold transition-colors ${
                mode === "email"
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Email
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 pb-40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="mb-6 grid grid-cols-1 gap-3">
            {quickTopics.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="flex items-center gap-4 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold text-gray-950">
                    {title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </section>

          {mode === "chat" ? (
            <section className="space-y-4">
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <p className="text-xs leading-5 font-semibold text-emerald-800">
                    Untuk refund atau makanan tidak sesuai, lampirkan kronologi
                    di halaman pengajuan refund agar admin bisa meninjau.
                  </p>
                </div>
              </div>

              {messages.map((chat) => {
                const isUser = chat.source === "user";
                const isStore = chat.source === "store";

                return (
                  <article
                    key={chat.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-[24px] p-4 shadow-sm ${
                        isUser
                          ? "rounded-br-md bg-emerald-500 text-white"
                          : isStore
                            ? "rounded-bl-md border border-blue-100 bg-blue-50 text-blue-950"
                            : "rounded-bl-md border border-gray-100 bg-white text-gray-950"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        {isStore ? (
                          <Store size={15} />
                        ) : isUser ? (
                          <MessageCircle size={15} />
                        ) : (
                          <Headphones size={15} />
                        )}
                        <span className="text-xs font-extrabold">
                          {chat.name}
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-6 font-medium ${
                          isUser ? "text-white" : "text-current"
                        }`}
                      >
                        {chat.text}
                      </p>
                      <p
                        className={`mt-2 text-[10px] font-bold ${
                          isUser ? "text-emerald-50" : "text-gray-400"
                        }`}
                      >
                        {chat.time}
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}

          {mode === "email" ? (
            <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              {emailSent ? (
                <div className="py-6 text-center">
                  <CheckCircle2
                    size={48}
                    className="mx-auto mb-4 text-emerald-600"
                  />
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Laporan terkirim
                  </h2>
                  <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                    Tim SurplusEats akan membalas lewat email yang terhubung ke
                    akun kamu.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSent(false);
                      setEmailMessage("");
                    }}
                    className="mt-6 w-full rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500"
                  >
                    Buat Laporan Baru
                  </button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleEmailSubmit}>
                  <div>
                    <label
                      htmlFor="support-category"
                      className="mb-2 block text-sm font-extrabold text-gray-800"
                    >
                      Kategori
                    </label>
                    <select
                      id="support-category"
                      value={emailCategory}
                      onChange={(event) => setEmailCategory(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      <option>Pesanan</option>
                      <option>Refund</option>
                      <option>Pembayaran</option>
                      <option>Akun</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="support-order"
                      className="mb-2 block text-sm font-extrabold text-gray-800"
                    >
                      Order ID
                    </label>
                    <input
                      id="support-order"
                      type="text"
                      placeholder="Masukkan order ID dari riwayat pesanan"
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="support-message"
                      className="mb-2 block text-sm font-extrabold text-gray-800"
                    >
                      Detail Masalah
                    </label>
                    <textarea
                      id="support-message"
                      value={emailMessage}
                      onChange={(event) => setEmailMessage(event.target.value)}
                      placeholder="Tulis kronologi singkat agar tim support bisa membantu lebih cepat..."
                      className="min-h-36 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!emailMessage.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    <Mail size={18} />
                    Kirim Email Support
                  </button>
                </form>
              )}
            </section>
          ) : null}

          <section className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href="/orders"
              className="rounded-2xl border border-gray-100 bg-white p-4 text-sm font-extrabold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Riwayat Order
            </Link>
            <Link
              href="/orders"
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
            >
              Refund
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>

        {mode === "chat" ? (
          <form
            onSubmit={handleSendMessage}
            className="absolute right-0 bottom-0 left-0 z-20 border-t border-gray-100 bg-white px-6 py-4"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-2 focus-within:border-emerald-500 focus-within:bg-white">
              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tulis pesan..."
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                aria-label="Kirim pesan"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
