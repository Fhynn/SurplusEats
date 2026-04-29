import { Clock } from "lucide-react";

export default function OwnerVerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-10 font-[family-name:var(--font-plus-jakarta-sans)]">
      <section className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-gray-100 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-x-0 top-0 h-2 bg-amber-500" />

        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-50">
          <Clock size={48} className="text-amber-500" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-950">
          Menunggu Verifikasi
        </h1>
        <p className="mt-4 text-sm leading-7 font-medium text-gray-500">
          Akun restoran kamu sedang di-review oleh Admin SurplusEats. Kami akan
          mengecek dokumen dan mengaktifkan dashboard setelah proses verifikasi
          selesai.
        </p>

        <div className="mt-8 rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-left">
          <p className="text-sm font-bold text-amber-800">
            Estimasi proses: 1-2 hari kerja.
          </p>
        </div>
      </section>
    </main>
  );
}
