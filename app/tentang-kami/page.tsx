import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Leaf,
  MapPin,
  QrCode,
  Store,
} from "lucide-react";

import { PublicSiteShell } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Tentang Kami | ResQFood",
  description:
    "Tentang ResQFood, marketplace makanan surplus untuk pickup langsung dari mitra.",
};

const steps = [
  {
    title: "Mitra menerbitkan menu",
    description:
      "Restoran, bakery, kafe, dan UMKM menampilkan makanan layak konsumsi yang tersedia untuk pickup.",
    icon: Store,
  },
  {
    title: "Customer memesan",
    description:
      "Customer memilih menu, menyelesaikan pembayaran, dan menerima detail waktu serta lokasi pickup.",
    icon: MapPin,
  },
  {
    title: "Pesanan diambil",
    description:
      "Pesanan diverifikasi menggunakan kode atau QR pickup langsung di lokasi mitra.",
    icon: QrCode,
  },
] as const;

export default function AboutPage() {
  return (
    <PublicSiteShell activeHref="/tentang-kami">
      <main>
        <section className="border-b border-emerald-100 bg-emerald-50/70">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_0.72fr] lg:items-center lg:px-8">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] text-emerald-700 uppercase">
                <Leaf size={17} />
                Tentang ResQFood
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight text-gray-950 sm:text-4xl">
                Membantu makanan layak konsumsi tidak berakhir sia-sia.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 font-medium text-gray-600 sm:text-base">
                ResQFood adalah marketplace makanan surplus yang mempertemukan
                customer dengan restoran, bakery, kafe, dan UMKM. Menu dipesan
                secara online lalu diambil langsung di lokasi mitra.
              </p>
            </div>

            <div className="border-l-4 border-emerald-500 bg-white p-6 shadow-sm">
              <BadgeCheck size={26} className="text-emerald-600" />
              <p className="mt-4 text-sm leading-7 font-semibold text-gray-700">
                ResQFood tidak menyediakan pengantaran. Model layanan kami
                berfokus pada pickup mandiri agar transaksi sederhana, lokasi
                jelas, dan makanan dapat segera diambil.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold tracking-[0.16em] text-emerald-600 uppercase">
              Cara Kerja
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Alur pickup yang transparan
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Icon size={21} />
                    </span>
                    <span className="text-xs font-extrabold text-gray-300">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-extrabold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 font-medium text-gray-600">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Identitas layanan
              </h2>
              <dl className="mt-6 grid gap-5 text-sm">
                <div>
                  <dt className="font-bold text-gray-500">Nama layanan</dt>
                  <dd className="mt-1 font-extrabold text-gray-950">ResQFood</dd>
                </div>
                <div>
                  <dt className="font-bold text-gray-500">Pengelola</dt>
                  <dd className="mt-1 font-extrabold text-gray-950">
                    Fhynn, Indonesia
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-gray-500">Website resmi</dt>
                  <dd className="mt-1 font-extrabold text-gray-950">
                    https://www.resqfood.store
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Komitmen kami
              </h2>
              <p className="mt-5 text-sm leading-7 font-medium text-gray-600">
                Kami mengembangkan layanan dengan fokus pada informasi menu
                yang jelas, pembayaran yang dapat ditelusuri, perlindungan data,
                dukungan refund, dan verifikasi pickup. Mitra tetap bertanggung
                jawab atas kualitas, keamanan, dan kesesuaian produk yang mereka
                jual.
              </p>
              <Link
                href="/kontak"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-600"
              >
                Hubungi ResQFood
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
}
