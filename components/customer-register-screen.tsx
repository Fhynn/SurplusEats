"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  HeartHandshake,
  Leaf,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

const preferences = ["Roti", "Nasi", "Snack", "Sayur"] as const;

const benefits = [
  "Akses makanan surplus lebih hemat.",
  "Notifikasi pickup dan promo terdekat.",
  "Riwayat order, voucher, dan refund dalam satu akun.",
] as const;

type RegisterForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

const inputClassName =
  "w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400";

export function CustomerRegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([
    "Roti",
    "Nasi",
  ]);
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordScore = useMemo(() => {
    let score = 0;

    if (form.password.length >= 6) score += 1;
    if (/[A-Z]/.test(form.password)) score += 1;
    if (/[0-9]/.test(form.password)) score += 1;
    if (form.password.length >= 10) score += 1;

    return score;
  }, [form.password]);

  const passwordLabel =
    passwordScore >= 3 ? "Kuat" : passwordScore === 2 ? "Cukup" : "Lemah";
  const passwordBarClassName =
    passwordScore >= 3
      ? "bg-emerald-500"
      : passwordScore === 2
        ? "bg-amber-400"
        : "bg-red-400";

  const isFormReady =
    form.name.trim() &&
    form.email.includes("@") &&
    form.phone.trim().length >= 10 &&
    form.password.length >= 6 &&
    acceptedTerms;

  const handleInputChange =
    (key: keyof RegisterForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const togglePreference = (preference: string) => {
    setSelectedPreferences((current) =>
      current.includes(preference)
        ? current.filter((item) => item !== preference)
        : [...current, preference],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormReady) {
      setNotice("Lengkapi data wajib dan setujui ketentuan layanan.");
      return;
    }

    setIsSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          preferences: selectedPreferences,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        redirectTo?: string;
      };

      if (!response.ok || !result.ok || !result.redirectTo) {
        setNotice(result.message || "Pendaftaran gagal. Coba lagi.");
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setNotice("Pendaftaran gagal karena koneksi bermasalah.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="flex min-h-full flex-1 flex-col bg-white">
        <header className="sticky top-0 z-20 bg-white px-6 pt-10 pb-4">
          <div className="mb-5 flex items-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label="Kembali ke login"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </button>
            <h1 className="ml-2 text-xl font-extrabold text-gray-900">
              Buat Akun
            </h1>
          </div>

          <div className="rounded-[28px] bg-emerald-500 p-5 text-white shadow-[0_16px_36px_rgba(16,185,129,0.22)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Leaf size={25} />
            </div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-100 uppercase">
              Food Hero Account
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              Selamatkan makanan enak dengan harga lebih hemat.
            </h2>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section className="mb-6 rounded-[24px] border border-gray-100 bg-gray-50 p-4">
            <div className="space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex gap-3 text-xs font-medium text-gray-500">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                  <span className="leading-5">{benefit}</span>
                </div>
              ))}
            </div>
          </section>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="ml-1 text-sm font-bold text-gray-700">
                Nama Lengkap
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                <User size={20} className="absolute left-4 text-gray-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={handleInputChange("name")}
                  placeholder="Nama sesuai akun"
                  required
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-sm font-bold text-gray-700">Email</label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                <Mail size={20} className="absolute left-4 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={handleInputChange("email")}
                  placeholder="nama@email.com"
                  required
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-sm font-bold text-gray-700">
                No. WhatsApp
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                <Phone size={20} className="absolute left-4 text-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleInputChange("phone")}
                  placeholder="08123456789"
                  required
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-sm font-bold text-gray-700">
                Password
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                <Lock size={20} className="absolute left-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleInputChange("password")}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full rounded-2xl bg-transparent py-4 pr-12 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 p-1 text-gray-400"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Lihat password"
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password ? (
                <div className="rounded-2xl bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold">
                    <span className="text-gray-500">Kekuatan password</span>
                    <span className="text-gray-900">{passwordLabel}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all ${passwordBarClassName}`}
                      style={{ width: `${Math.max(25, passwordScore * 25)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <section className="rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <UtensilsCrossed size={17} className="text-emerald-500" />
                <p className="text-sm font-extrabold text-gray-900">
                  Preferensi makanan
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {preferences.map((preference) => {
                  const isSelected = selectedPreferences.includes(preference);

                  return (
                    <button
                      key={preference}
                      type="button"
                      onClick={() => togglePreference(preference)}
                      className={`rounded-2xl px-4 py-2 text-xs font-extrabold transition-all ${
                        isSelected
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {preference}
                    </button>
                  );
                })}
              </div>
            </section>

            <label className="flex cursor-pointer gap-3 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-500"
              />
              <span className="text-xs leading-5 font-medium text-gray-500">
                Saya setuju dengan ketentuan layanan, kebijakan privasi, dan
                memahami bahwa fitur ini masih prototype UI.
              </span>
            </label>

            {notice ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 font-bold text-amber-700">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!isFormReady || isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              <HeartHandshake size={18} />
              {isSubmitting ? "Mendaftarkan Akun..." : "Daftar Sekarang"}
            </button>
          </form>

          <div className="mt-6 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-extrabold text-emerald-950">
                  Punya usaha makanan?
                </p>
                <Link
                  href="/register-mitra"
                  className="mt-1 inline-block text-xs font-extrabold text-emerald-700 hover:text-emerald-800"
                >
                  Daftar sebagai mitra SurplusEats
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Sudah punya akun?{" "}
            <Link
              href="/"
              className="font-bold text-emerald-600 transition-colors hover:text-emerald-700"
            >
              Masuk di sini
            </Link>
          </p>
        </main>
      </div>
    </MobileDeviceFrame>
  );
}
