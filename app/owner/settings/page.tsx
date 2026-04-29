import Link from "next/link";
import {
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  ToggleRight,
} from "lucide-react";

const profileOptions = [
  {
    label: "Info Jam Buka",
    description: "Atur hari operasional dan jadwal pickup.",
    icon: Clock,
  },
  {
    label: "Lokasi Penjemputan",
    description: "Perbarui alamat dan titik pickup pelanggan.",
    icon: MapPin,
  },
] as const;

const preferenceOptions = [
  "Notifikasi Suara",
  "Auto-Reject",
] as const;

export default function OwnerSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 text-gray-900">
      <header className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
          Owner Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
          Pengaturan Toko
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-gray-500">
          Kelola profil UMKM, preferensi operasional, dan akses akun owner.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
          <h2 className="px-1 text-sm font-extrabold text-gray-950">
            Profil UMKM
          </h2>
          <div className="mt-4 space-y-3">
            {profileOptions.map(({ label, description, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex w-full items-center gap-4 rounded-[24px] border border-gray-100 bg-gray-50/70 p-4 text-left transition-colors hover:border-emerald-100 hover:bg-emerald-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-sm">
                  <Icon size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-gray-900">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-gray-500">
                    {description}
                  </span>
                </span>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
          <h2 className="px-1 text-sm font-extrabold text-gray-950">Preferensi</h2>
          <div className="mt-4 space-y-3">
            {preferenceOptions.map((label) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-[24px] border border-gray-100 bg-gray-50/70 p-4"
              >
                <span className="text-sm font-extrabold text-gray-900">
                  {label}
                </span>
                <ToggleRight size={34} className="shrink-0 text-emerald-500" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <Link
        href="/"
        className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-red-50 px-5 py-4 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-100"
      >
        <LogOut size={18} />
        Keluar dari Akun Owner
      </Link>
    </div>
  );
}
