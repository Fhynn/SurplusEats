import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Banknote,
  CheckCircle2,
  Clock3,
  FileWarning,
  HelpCircle,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldAlert,
  Store,
} from "lucide-react";

const restrictionReasons = [
  {
    title: "Dokumen usaha perlu validasi ulang",
    description:
      "Data izin usaha tidak sepenuhnya cocok dengan nama toko yang terdaftar.",
    icon: FileWarning,
    className: "bg-red-50 text-red-600",
  },
  {
    title: "Aktivitas transaksi ditahan",
    description:
      "Beberapa settlement perlu dicek sebelum saldo owner bisa dicairkan.",
    icon: Banknote,
    className: "bg-amber-50 text-amber-600",
  },
  {
    title: "Akses dashboard dibatasi",
    description:
      "Menu, pesanan, dan pencairan dana dikunci sampai pemeriksaan selesai.",
    icon: LockKeyhole,
    className: "bg-gray-100 text-gray-600",
  },
] as const;

const reviewTimeline = [
  {
    title: "Akun dibekukan sementara",
    time: "Hari ini, 09:20",
    description: "Sistem menahan akses karena ada data yang perlu diverifikasi.",
    status: "Selesai",
    isDone: true,
  },
  {
    title: "Tim admin meninjau dokumen",
    time: "Estimasi 1 hari kerja",
    description: "Admin mencocokkan dokumen usaha, histori pickup, dan refund.",
    status: "Berjalan",
    isDone: false,
  },
  {
    title: "Keputusan pemulihan akun",
    time: "Setelah review",
    description: "Owner akan menerima hasil review melalui email dan notifikasi.",
    status: "Menunggu",
    isDone: false,
  },
] as const;

const lockedAccess = [
  "Publish menu baru",
  "Menerima order customer",
  "Pencairan saldo",
  "Mengubah data legal toko",
] as const;

export default function OwnerBannedPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-gray-100 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="absolute inset-x-0 top-0 h-2 bg-red-600" />

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
              <Store size={24} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-950">
                ResQFood Owner
              </p>
              <p className="text-xs font-semibold text-gray-400">
                Akun owner
              </p>
            </div>
          </div>

          <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[28px] bg-red-50 text-red-600">
            <Ban size={48} />
          </div>

          <p className="text-xs font-extrabold tracking-[0.22em] text-red-500 uppercase">
            Account Restricted
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">
            Akun Owner Dibekukan
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 font-medium text-gray-500">
            Akses dashboard restoran sedang dinonaktifkan sementara. Pembekuan
            ini dipakai untuk melindungi customer, transaksi, dan data toko
            sampai proses review selesai.
          </p>

          <div className="mt-7 rounded-[24px] border border-red-100 bg-red-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-600" />
              <p className="text-sm font-extrabold text-red-900">
                Alasan utama
              </p>
            </div>
            <p className="text-sm leading-6 font-bold text-red-700">
              Dokumen usaha belum valid dan ada aktivitas transaksi yang perlu
              diverifikasi ulang oleh admin.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-gray-400 uppercase">
                Case ID
              </p>
              <p className="mt-1 font-mono text-lg font-extrabold text-gray-950">
                CASE-OWN-2408
              </p>
            </div>
            <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-amber-600 uppercase">
                Review
              </p>
              <p className="mt-1 text-lg font-extrabold text-amber-900">
                1-3 hari kerja
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <a
              href="mailto:support@resqfood.id?subject=Banding%20Akun%20Owner%20CASE-OWN-2408"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-colors hover:bg-red-600"
            >
              <Mail size={18} />
              Ajukan Banding
            </a>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="mailto:support@resqfood.id"
                className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5 text-sm font-extrabold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <HelpCircle size={17} />
                Support
              </a>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <LogOut size={17} />
                Keluar
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-950">
                  Dampak Pembekuan
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Fitur yang sementara tidak bisa digunakan.
                </p>
              </div>
              <AlertTriangle size={24} className="text-red-500" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lockedAccess.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[20px] border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <LockKeyhole size={17} />
                  </div>
                  <p className="text-sm font-extrabold text-gray-900">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Yang Perlu Diperbaiki
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Lengkapi poin berikut saat menghubungi support.
              </p>
            </div>

            <div className="space-y-3">
              {restrictionReasons.map((reason) => {
                const Icon = reason.icon;

                return (
                  <article
                    key={reason.title}
                    className="rounded-[24px] border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${reason.className}`}
                      >
                        <Icon size={21} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-950">
                          {reason.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Timeline Review
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Tahapan pemulihan akun owner.
              </p>
            </div>

            <div className="relative space-y-4 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-0.5 before:bg-gray-100">
              {reviewTimeline.map((item) => (
                <div key={item.title} className="relative flex gap-4">
                  <div
                    className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm ${
                      item.isDone
                        ? "bg-red-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {item.isDone ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Clock3 size={15} />
                    )}
                  </div>
                  <div className="flex-1 rounded-[22px] border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-extrabold text-gray-950">
                        {item.title}
                      </h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-gray-500">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-400">
                      {item.time}
                    </p>
                    <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
