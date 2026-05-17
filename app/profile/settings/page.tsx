"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Edit2,
  HelpCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  ShieldCheck,
  Smartphone,
  Ticket,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type PreferenceKey =
  | "pushNotification"
  | "promoEmail"
  | "locationAccess"
  | "pickupReminder";
type ConfirmationType = "logout" | "delete" | null;

const accountMenus = [
  {
    href: "/profile/addresses",
    label: "Alamat Tersimpan",
    description: "Kelola alamat pickup favorit",
    icon: MapPin,
    iconClassName: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    badge: undefined,
  },
  {
    href: "/profile/vouchers",
    label: "Voucher Saya",
    description: "Klaim dan pakai promo aktif",
    icon: Ticket,
    iconClassName: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    badge: "2 Baru",
  },
  {
    href: "/help",
    label: "Pusat Bantuan",
    description: "FAQ, refund, dan support",
    icon: HelpCircle,
    iconClassName: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
    badge: undefined,
  },
] as const;

const preferenceItems = [
  {
    key: "pushNotification",
    title: "Notifikasi push",
    description: "Update order, refund, dan voucher baru.",
    icon: Bell,
  },
  {
    key: "pickupReminder",
    title: "Pengingat pickup",
    description: "Ingatkan sebelum jam ambil pesanan.",
    icon: Smartphone,
  },
  {
    key: "promoEmail",
    title: "Email promo",
    description: "Terima info diskon makanan surplus.",
    icon: Ticket,
  },
  {
    key: "locationAccess",
    title: "Akses lokasi",
    description: "Bantu cari restoran surplus terdekat.",
    icon: MapPin,
  },
] as const satisfies ReadonlyArray<{
  key: PreferenceKey;
  title: string;
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

export default function CustomerAccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>(
    {
      pushNotification: true,
      promoEmail: false,
      locationAccess: true,
      pickupReminder: true,
    },
  );
  const [confirmationType, setConfirmationType] =
    useState<ConfirmationType>(null);
  const [securityNotice, setSecurityNotice] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      setIsLoadingUser(true);

      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as {
          ok: boolean;
          user?: { name: string; email: string };
        };

        if (!ignore) {
          setUser(data.user ?? null);
        }
      } finally {
        if (!ignore) {
          setIsLoadingUser(false);
        }
      }
    }

    void loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  const handleToggle = (key: PreferenceKey) => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: !currentPreferences[key],
    }));
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const handleDeleteAccount = () => {
    setConfirmationType(null);
    setSecurityNotice(
      "Permintaan hapus akun sudah dicatat dan akan diproses oleh tim.",
    );
  };
  const displayName = isLoadingUser ? "Memuat profil" : user?.name || "Customer";
  const displayEmail = isLoadingUser
    ? "Menyinkronkan akun..."
    : user?.email || "Akun belum tersedia";

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 pt-10 pb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label="Kembali ke profil"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </Link>
            <h1 className="text-lg font-extrabold text-gray-900">
              Pengaturan Akun
            </h1>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-50 text-emerald-600 shadow-sm">
                <UserRound size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold text-gray-900">
                  {displayName}
                </h2>
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  {displayEmail}
                </p>
              </div>
              <Link
                href="/profile/edit"
                className="rounded-xl bg-gray-50 p-2 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                aria-label="Ubah profil"
              >
                <Edit2 size={18} />
              </Link>
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm">
            {accountMenus.map(
              ({ href, label, description, icon: Icon, iconClassName, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex w-full items-center justify-between border-b border-gray-50 p-4 transition-colors last:border-b-0 hover:bg-gray-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`rounded-xl p-2.5 transition-colors ${iconClassName}`}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-gray-900">
                        {label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-gray-400">
                        {description}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {badge ? (
                      <span className="rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                    <ChevronRight
                      size={18}
                      className="text-gray-300 group-hover:text-gray-500"
                    />
                  </span>
                </Link>
              ),
            )}
          </section>

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  Preferensi
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Atur notifikasi dan pengalaman aplikasi.
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
                <Bell size={20} />
              </div>
            </div>

            <div className="space-y-3">
              {preferenceItems.map(({ key, title, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-xl bg-white p-2 text-gray-500 shadow-sm">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold text-gray-900">
                        {title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 font-medium text-gray-500">
                        {description}
                      </span>
                    </span>
                  </div>
                  <Toggle
                    enabled={preferences[key]}
                    onToggle={() => handleToggle(key)}
                    label={title}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  Keamanan
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Lindungi akun dan sesi login kamu.
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
                <ShieldCheck size={20} />
              </div>
            </div>

            {securityNotice ? (
              <p className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 font-bold text-emerald-700">
                {securityNotice}
              </p>
            ) : null}

            <div className="space-y-3">
              <Link
                href="/forgot-password"
                className="group flex items-center justify-between rounded-2xl bg-gray-50 p-4 transition-colors hover:bg-emerald-50"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-white p-2 text-gray-500 shadow-sm group-hover:text-emerald-600">
                    <LockKeyhole size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-gray-900">
                      Ubah Password
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      Reset password melalui verifikasi email
                    </span>
                  </span>
                </span>
                <ChevronRight size={18} className="text-gray-300" />
              </Link>

              <button
                type="button"
                onClick={() =>
                  setSecurityNotice("Semua sesi lain ditandai keluar di UI.")
                }
                className="flex w-full items-center justify-between rounded-2xl bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-xl bg-white p-2 text-gray-500 shadow-sm">
                    <Smartphone size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-gray-900">
                      Perangkat Aktif
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      1 perangkat sedang login
                    </span>
                  </span>
                </span>
                <span className="text-xs font-extrabold text-emerald-600">
                  Logout lain
                </span>
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setConfirmationType("logout")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-100"
            >
              <LogOut size={18} />
              Keluar Akun
            </button>
            <button
              type="button"
              onClick={() => setConfirmationType("delete")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm font-extrabold text-gray-500 transition-colors hover:bg-gray-50"
            >
              <Trash2 size={18} />
              Hapus Akun
            </button>
          </section>
        </div>

        {confirmationType ? (
          <div className="absolute inset-0 z-50 flex items-end overflow-y-auto bg-gray-950/35 backdrop-blur-sm">
            <div
              className="max-h-[92%] w-full overflow-y-auto rounded-t-[36px] bg-white px-6 pt-6 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]"
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                {confirmationType === "logout" ? (
                  <LogOut size={30} />
                ) : (
                  <Trash2 size={30} />
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-gray-950">
                  {confirmationType === "logout"
                    ? "Keluar dari akun?"
                    : "Hapus akun?"}
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 font-medium text-gray-500">
                  {confirmationType === "logout"
                    ? "Kamu akan kembali ke halaman login SurplusEats."
                    : "Permintaan hapus akun akan diproses setelah kamu mengonfirmasi tindakan ini."}
                </p>
              </div>
              <div className="sticky bottom-0 -mx-6 mt-7 grid grid-cols-2 gap-3 border-t border-gray-100 bg-white px-6 pt-3 pb-1">
                <button
                  type="button"
                  onClick={() => setConfirmationType(null)}
                  className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={
                    confirmationType === "logout"
                      ? handleLogout
                      : handleDeleteAccount
                  }
                  className="rounded-2xl bg-red-500 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-red-600"
                >
                  {confirmationType === "logout" ? "Keluar" : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
