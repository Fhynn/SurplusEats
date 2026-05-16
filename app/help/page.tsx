"use client";

import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  RefreshCcw,
  Search,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type FaqCategory = "Pesanan" | "Refund" | "Voucher" | "Akun";

type FaqItem = {
  id: string;
  title: string;
  category: FaqCategory;
  answer: string;
  actionLabel: string;
  actionHref: string;
};

const faqs: FaqItem[] = [
  {
    id: "cancel-order",
    title: "Cara membatalkan pesanan",
    category: "Pesanan",
    answer:
      "Buka Riwayat Pesanan, pilih order yang masih berjalan, lalu tekan Batalkan Pesanan. Jika makanan sudah siap diambil, pembatalan akan masuk proses review refund manual.",
    actionLabel: "Buka Pesanan",
    actionHref: "/orders",
  },
  {
    id: "bad-food",
    title: "Bagaimana jika makanan basi/tidak layak?",
    category: "Refund",
    answer:
      "Ajukan refund dari detail pesanan, pilih alasan kualitas makanan, lalu tulis kronologi dan bukti. Tim admin akan meninjau laporan sebelum dana dikembalikan.",
    actionLabel: "Ajukan Refund",
    actionHref: "/orders",
  },
  {
    id: "refund-withdraw",
    title: "Cara mencairkan refund",
    category: "Refund",
    answer:
      "Refund akan dikembalikan ke metode pembayaran awal atau saldo akun sesuai keputusan admin. Kamu bisa memantau update refund dari halaman notifikasi.",
    actionLabel: "Cek Notifikasi",
    actionHref: "/notifications",
  },
  {
    id: "closed-store",
    title: "Restoran tutup saat jam pickup",
    category: "Pesanan",
    answer:
      "Jika restoran tutup saat jam pickup, hubungi support dari detail tracking atau pusat bantuan. Sertakan order ID agar tim support bisa mencocokkan data pickup.",
    actionLabel: "Chat Support",
    actionHref: "/support",
  },
  {
    id: "claim-voucher",
    title: "Cara klaim voucher promo",
    category: "Voucher",
    answer:
      "Buka Voucher Saya, masukkan kode promo yang dibuat admin, lalu tekan Klaim. Voucher yang aktif akan mengikuti data dari database.",
    actionLabel: "Buka Voucher",
    actionHref: "/profile/vouchers",
  },
  {
    id: "account-security",
    title: "Mengubah data akun",
    category: "Akun",
    answer:
      "Data nama, email, nomor HP, dan password dapat diubah dari Pengaturan Akun. Untuk masalah login, gunakan reset password dari halaman masuk.",
    actionLabel: "Pengaturan Akun",
    actionHref: "/profile/settings",
  },
];

const categories: ("Semua" | FaqCategory)[] = [
  "Semua",
  "Pesanan",
  "Refund",
  "Voucher",
  "Akun",
];

const categoryIcon = {
  Pesanan: ShoppingBag,
  Refund: RefreshCcw,
  Voucher: Ticket,
  Akun: AlertCircle,
} as const;

export default function CustomerHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<(typeof categories)[number]>("Semua");
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory =
        activeCategory === "Semua" || faq.category === activeCategory;
      const matchesSearch =
        !normalizedQuery ||
        [faq.title, faq.category, faq.answer].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="sticky top-0 z-20 flex items-center bg-emerald-500 px-6 pt-10 pb-4 shadow-sm">
          <Link
            href="/profile/settings"
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-emerald-600"
            aria-label="Kembali ke pengaturan akun"
          >
            <ChevronLeft size={24} className="text-white" />
          </Link>
          <h1 className="ml-2 text-lg font-extrabold text-white">
            Pusat Bantuan
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="rounded-b-[40px] bg-emerald-500 px-6 pt-2 pb-10 text-white shadow-sm">
            <h2 className="mb-2 text-2xl font-extrabold tracking-tight">
              Ada yang bisa
              <br />
              kami bantu?
            </h2>
            <div className="relative mt-4">
              <Search
                size={18}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-600"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari topik bantuan..."
                className="w-full rounded-2xl bg-white py-3.5 pr-4 pl-11 text-sm font-medium text-gray-900 shadow-lg shadow-emerald-600/20 outline-none placeholder:text-gray-400"
              />
            </div>
          </section>

          <div className="space-y-6 px-6 py-8">
            <section>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((category) => {
                  const isActive = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-colors ${
                        isActive
                          ? "bg-gray-900 text-white"
                          : "bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-gray-900">
                  Topik Populer
                </h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-700">
                  {filteredFaqs.length} topik
                </span>
              </div>

              {filteredFaqs.length > 0 ? (
                <div className="space-y-3">
                  {filteredFaqs.map((faq) => {
                    const Icon = categoryIcon[faq.category];

                    return (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => setSelectedFaq(faq)}
                        className="group flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition-colors hover:bg-emerald-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                            <Icon size={18} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-gray-700 group-hover:text-emerald-700">
                              {faq.title}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-gray-400">
                              {faq.category}
                            </span>
                          </span>
                        </div>
                        <ChevronRight
                          size={18}
                          className="ml-2 shrink-0 text-gray-400 group-hover:text-emerald-500"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                  <Search size={28} className="mx-auto mb-3 text-gray-400" />
                  <h4 className="text-sm font-extrabold text-gray-900">
                    Topik tidak ditemukan
                  </h4>
                  <p className="mt-2 text-xs leading-5 font-medium text-gray-500">
                    Coba kata kunci lain atau hubungi support.
                  </p>
                </div>
              )}
            </section>

            <section className="border-t border-gray-100 pt-6">
              <h3 className="mb-4 text-base font-extrabold text-gray-900">
                Hubungi Kami
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/support"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 transition-shadow hover:shadow-md"
                >
                  <span className="rounded-full bg-white p-2 shadow-sm">
                    <MessageCircle size={24} className="text-blue-500" />
                  </span>
                  <span className="text-sm font-bold text-blue-800">
                    Live Chat
                  </span>
                </Link>
                <Link
                  href="/support"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 transition-shadow hover:shadow-md"
                >
                  <span className="rounded-full bg-white p-2 shadow-sm">
                    <Mail size={24} className="text-emerald-500" />
                  </span>
                  <span className="text-sm font-bold text-emerald-800">
                    Email Support
                  </span>
                </Link>
              </div>
            </section>
          </div>
        </div>

        {selectedFaq ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm">
            <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                    {selectedFaq.category}
                  </span>
                  <h2 className="mt-3 text-xl font-extrabold tracking-tight text-gray-950">
                    {selectedFaq.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFaq(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                  aria-label="Tutup jawaban"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="rounded-[24px] bg-gray-50 p-5 text-sm leading-7 font-medium text-gray-600">
                {selectedFaq.answer}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFaq(null)}
                  className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Tutup
                </button>
                <Link
                  href={selectedFaq.actionHref}
                  className="flex items-center justify-center rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600"
                >
                  {selectedFaq.actionLabel}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
