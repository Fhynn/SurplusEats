import Link from "next/link";
import { AlertTriangle, LogOut } from "lucide-react";

export default function OwnerBannedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-10 font-[family-name:var(--font-plus-jakarta-sans)]">
      <section className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-gray-100 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-x-0 top-0 h-2 bg-red-600" />

        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle size={48} className="text-red-600" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">
          Akun Dibekukan
        </h1>
        <p className="mt-4 text-sm leading-7 font-medium text-gray-500">
          Akses dashboard restoran sedang dinonaktifkan sementara. Hubungi tim
          support untuk pemeriksaan lanjutan dan proses pemulihan akun.
        </p>

        <div className="mt-6 rounded-[24px] border border-red-100 bg-red-50 px-5 py-4 text-left">
          <p className="text-sm leading-6 font-bold text-red-700">
            Alasan Penangguhan: Dokumen usaha tidak valid dan terdapat aktivitas
            transaksi yang perlu diverifikasi ulang.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="mailto:support@surpluseats.id"
            className="block w-full rounded-2xl bg-gray-900 px-5 py-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-colors hover:bg-red-600"
          >
            Hubungi Support
          </Link>
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <LogOut size={17} />
            Keluar
          </Link>
        </div>
      </section>
    </main>
  );
}
