import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Headphones,
  Mail,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";

import {
  PublicSiteShell,
  supportEmail,
} from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "Kontak Support | ResQFood",
  description:
    "Hubungi support ResQFood untuk bantuan akun, pembayaran, pickup, refund, dan kemitraan.",
};

const supportTopics = [
  "Akun dan proses masuk",
  "Pembayaran dan status transaksi",
  "Pesanan, pickup, serta kode QR",
  "Refund dan bukti transaksi",
  "Pendaftaran dan verifikasi mitra",
  "Privasi atau keamanan akun",
] as const;

export default function ContactPage() {
  return (
    <PublicSiteShell activeHref="/kontak">
      <main>
        <section className="border-b border-emerald-100 bg-emerald-50/70">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-[0.18em] text-emerald-700 uppercase">
              <Headphones size={18} />
              Kontak Support
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
              Sampaikan masalah dengan detail yang aman dan jelas.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 font-medium text-gray-600 sm:text-base">
              Tim ResQFood membantu pertanyaan customer, mitra, pembayaran,
              pickup, refund, privasi, dan keamanan akun.
            </p>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div className="space-y-4">
            <a
              href={`mailto:${supportEmail}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-emerald-300"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Mail size={21} />
              </span>
              <h2 className="mt-5 text-lg font-extrabold">Email Support</h2>
              <p className="mt-2 break-all text-sm font-bold text-emerald-700">
                {supportEmail}
              </p>
              <p className="mt-3 text-xs leading-5 font-medium text-gray-500">
                Target respons maksimal dua hari kerja, bergantung pada
                kompleksitas laporan.
              </p>
            </a>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Clock3 size={21} />
              </span>
              <h2 className="mt-5 text-lg font-extrabold">Waktu Layanan</h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-600">
                Senin-Jumat, pukul 09.00-17.00 WIB. Laporan keamanan dan
                transaksi tetap dapat dikirim kapan saja melalui email.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Hal yang dapat kami bantu
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {supportTopics.map((topic) => (
                <li
                  key={topic}
                  className="flex min-h-14 items-center gap-3 border-b border-gray-200 py-3 text-sm font-bold text-gray-700"
                >
                  <MessageSquareText
                    size={18}
                    className="shrink-0 text-emerald-600"
                  />
                  {topic}
                </li>
              ))}
            </ul>

            <div className="mt-8 border-l-4 border-amber-400 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={21}
                  className="mt-0.5 shrink-0 text-amber-700"
                />
                <div>
                  <h3 className="font-extrabold text-amber-950">
                    Jangan kirim data rahasia
                  </h3>
                  <p className="mt-2 text-sm leading-6 font-medium text-amber-900">
                    Support tidak pernah meminta password, OTP, PIN, private
                    key, atau data kartu. Untuk masalah order, cukup sertakan
                    email akun, kode order, kronologi, dan bukti yang relevan.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-600"
              >
                Masuk ke ResQFood
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/register-mitra"
                className="inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-extrabold text-emerald-700 hover:bg-emerald-50"
              >
                Daftar sebagai Mitra
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
}
