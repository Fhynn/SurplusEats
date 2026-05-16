"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Store,
  TimerReset,
  Volume2,
  X,
} from "lucide-react";
import { useState } from "react";

type PreferenceKey =
  | "soundNotification"
  | "autoReject"
  | "pickupReminder"
  | "lowStockAlert";
type ModalType = "hours" | "location" | "logout" | null;

type StoreSettings = {
  storeName: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  pickupInstruction: string;
  openTime: string;
  closeTime: string;
  autoRejectAfter: string;
};

const preferenceItems = [
  {
    key: "soundNotification",
    label: "Notifikasi Suara",
    description: "Putar suara saat pesanan baru masuk.",
    icon: Volume2,
  },
  {
    key: "autoReject",
    label: "Auto-Reject",
    description: "Tolak pesanan otomatis jika tidak dikonfirmasi.",
    icon: TimerReset,
  },
  {
    key: "pickupReminder",
    label: "Pengingat Pickup",
    description: "Ingatkan staf sebelum jadwal pickup dimulai.",
    icon: Clock,
  },
  {
    key: "lowStockAlert",
    label: "Alert Stok Menipis",
    description: "Beri notifikasi saat stok surplus hampir habis.",
    icon: Bell,
  },
] as const satisfies ReadonlyArray<{
  key: PreferenceKey;
  label: string;
  description: string;
  icon: typeof Bell;
}>;

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
        enabled ? "bg-emerald-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function OwnerSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: "Bakehouse Bakery",
    category: "Bakery & Pastry",
    email: "owner@bakehouse.example.com",
    phone: "+62 811-2219-7004",
    address: "Jl. Senopati No. 18, Jakarta Selatan",
    pickupInstruction: "Ambil di kasir utama. Tunjukkan QR pickup ke staf.",
    openTime: "09:00",
    closeTime: "21:00",
    autoRejectAfter: "10",
  });
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>(
    {
      soundNotification: true,
      autoReject: false,
      pickupReminder: true,
      lowStockAlert: true,
    },
  );
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [notice, setNotice] = useState("");

  const updateSetting = (key: keyof StoreSettings, value: string) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));
    setNotice("");
  };

  const togglePreference = (key: PreferenceKey) => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: !currentPreferences[key],
    }));
    setNotice("");
  };

  const handleSave = () => {
    setNotice("Pengaturan toko berhasil disimpan di prototype UI.");
    setActiveModal(null);
  };

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-gray-900">
      <header className="overflow-hidden rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
              Owner Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
              Pengaturan Toko
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-gray-500">
              Kelola profil UMKM, preferensi operasional, lokasi pickup, dan
              akses akun owner.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-500"
          >
            <Save size={17} />
            Simpan Pengaturan
          </button>
        </div>

        {notice ? (
          <div className="mt-5 flex gap-3 rounded-[22px] border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0" />
            <p className="text-sm font-bold">{notice}</p>
          </div>
        ) : null}
      </header>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-950">
                  Profil UMKM
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Informasi dasar yang tampil untuk customer dan admin.
                </p>
              </div>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Nama Toko
                </span>
                <div className="relative">
                  <Store
                    size={18}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(event) =>
                      updateSetting("storeName", event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-11 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Kategori
                </span>
                <select
                  value={settings.category}
                  onChange={(event) =>
                    updateSetting("category", event.target.value)
                  }
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                >
                  <option>Bakery & Pastry</option>
                  <option>Kafe & Minuman</option>
                  <option>Masakan Rumahan</option>
                  <option>Noodle Shop</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Email Owner
                </span>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(event) =>
                      updateSetting("email", event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-11 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Nomor Telepon
                </span>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(event) =>
                      updateSetting("phone", event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-11 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveModal("hours")}
              className="flex w-full items-center gap-4 rounded-[32px] border border-gray-100 bg-white p-5 text-left shadow-[0_10px_40px_rgba(15,23,42,0.05)] transition-colors hover:border-emerald-100 hover:bg-emerald-50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 shadow-sm">
                <Clock size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-gray-900">
                  Info Jam Buka
                </span>
                <span className="mt-0.5 block text-xs font-medium text-gray-500">
                  {settings.openTime} - {settings.closeTime} WIB
                </span>
              </span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("location")}
              className="flex w-full items-center gap-4 rounded-[32px] border border-gray-100 bg-white p-5 text-left shadow-[0_10px_40px_rgba(15,23,42,0.05)] transition-colors hover:border-emerald-100 hover:bg-emerald-50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
                <MapPin size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-gray-900">
                  Lokasi Penjemputan
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium text-gray-500">
                  {settings.address}
                </span>
              </span>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Preferensi Operasional
              </h2>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Atur perilaku dashboard saat order dan stok berubah.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {preferenceItems.map(({ key, label, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-[24px] border border-gray-100 bg-gray-50/70 p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-xl bg-white p-2 text-emerald-500 shadow-sm">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold text-gray-900">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 font-medium text-gray-500">
                        {description}
                      </span>
                    </span>
                  </div>
                  <Toggle
                    enabled={preferences[key]}
                    onToggle={() => togglePreference(key)}
                    label={label}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-lg font-extrabold text-gray-950">
              Status Toko
            </h2>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              Toko aktif dan bisa menerima pesanan surplus selama jam operasional.
            </p>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                <span className="text-sm font-bold text-gray-500">
                  Auto-reject
                </span>
                <strong className="text-sm font-extrabold text-gray-950">
                  {preferences.autoReject ? "Aktif" : "Nonaktif"}
                </strong>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                <span className="text-sm font-bold text-gray-500">
                  Batas konfirmasi
                </span>
                <strong className="text-sm font-extrabold text-gray-950">
                  {settings.autoRejectAfter} menit
                </strong>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-amber-100 bg-amber-50 p-6">
            <AlertTriangle size={24} className="text-amber-600" />
            <h2 className="mt-4 text-lg font-extrabold text-amber-900">
              Catatan Prototype
            </h2>
            <p className="mt-2 text-sm leading-6 font-semibold text-amber-800">
              Pengaturan ini masih disimpan di state lokal sampai backend dan
              database tersedia.
            </p>
          </section>

          <button
            type="button"
            onClick={() => setActiveModal("logout")}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-red-50 px-5 py-4 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-100"
          >
            <LogOut size={18} />
            Keluar dari Akun Owner
          </button>
        </aside>
      </section>

      {activeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                  Owner Settings
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                  {activeModal === "hours"
                    ? "Info Jam Buka"
                    : activeModal === "location"
                      ? "Lokasi Pickup"
                      : "Keluar Akun"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            {activeModal === "hours" ? (
              <div className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-extrabold text-gray-800">
                      Jam Buka
                    </span>
                    <input
                      type="time"
                      value={settings.openTime}
                      onChange={(event) =>
                        updateSetting("openTime", event.target.value)
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-extrabold text-gray-800">
                      Jam Tutup
                    </span>
                    <input
                      type="time"
                      value={settings.closeTime}
                      onChange={(event) =>
                        updateSetting("closeTime", event.target.value)
                      }
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Auto-Reject Setelah
                  </span>
                  <select
                    value={settings.autoRejectAfter}
                    onChange={(event) =>
                      updateSetting("autoRejectAfter", event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                  >
                    <option value="5">5 menit</option>
                    <option value="10">10 menit</option>
                    <option value="15">15 menit</option>
                    <option value="20">20 menit</option>
                  </select>
                </label>
              </div>
            ) : null}

            {activeModal === "location" ? (
              <div className="space-y-4 p-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Alamat Pickup
                  </span>
                  <textarea
                    value={settings.address}
                    onChange={(event) =>
                      updateSetting("address", event.target.value)
                    }
                    className="min-h-28 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Instruksi Pickup
                  </span>
                  <textarea
                    value={settings.pickupInstruction}
                    onChange={(event) =>
                      updateSetting("pickupInstruction", event.target.value)
                    }
                    className="min-h-28 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-bold text-gray-900 outline-none focus:border-emerald-400 focus:bg-white"
                  />
                </label>
              </div>
            ) : null}

            {activeModal === "logout" ? (
              <div className="p-6 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <LogOut size={30} />
                </div>
                <h3 className="text-xl font-extrabold text-gray-950">
                  Keluar dari akun owner?
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 font-medium text-gray-500">
                  Kamu akan kembali ke halaman login SurplusEats.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={activeModal === "logout" ? handleLogout : handleSave}
                className={`rounded-2xl px-5 py-3 text-sm font-extrabold text-white transition-colors ${
                  activeModal === "logout"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                {activeModal === "logout" ? "Keluar" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
