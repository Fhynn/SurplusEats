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

import { LoadingScreen } from "@/components/loading-screen";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { WelcomeLoadingOverlay } from "@/components/welcome-loading-overlay";
import { waitForLoadingScreen } from "@/lib/loading-delay";

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
const welcomeLoadingDelayMs = 4200;

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
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false);

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
      const [response] = await Promise.all([
        fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            preferences: selectedPreferences,
          }),
        }),
        waitForLoadingScreen(),
      ]);
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        redirectTo?: string;
      };

      if (!response.ok || !result.ok || !result.redirectTo) {
        setNotice(result.message || "Pendaftaran gagal. Coba lagi.");
        return;
      }

      setIsWelcomeLoading(true);
      await new Promise((resolve) => setTimeout(resolve, welcomeLoadingDelayMs));
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
      {isSubmitting && !isWelcomeLoading ? (
        <LoadingScreen
          scope="frame"
          title="Membuat akun..."
          description="Data akun kamu sedang diproses."
        />
      ) : null}
      {isWelcomeLoading ? (
        <WelcomeLoadingOverlay
          scope="frame"
          title="Selamat datang!"
          description="Akun kamu sudah siap. Kami sedang menyiapkan beranda ResQFood."
        />
      ) : null}
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white md:grid md:grid-cols-[minmax(0,0.92fr)_minmax(480px,1.08fr)]">
        <header className="sticky top-0 z-20 bg-white px-6 pt-10 pb-4 md:relative md:flex md:h-full md:flex-col md:justify-center md:overflow-hidden md:bg-emerald-600 md:px-10 md:py-12 lg:px-16">
          <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.20),transparent_38%)] md:block" />
          <div className="mb-5 flex items-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="relative -ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100 md:text-white md:hover:bg-white/10"
              aria-label="Kembali ke login"
            >
              <ChevronLeft size={24} className="text-gray-800 md:text-white" />
            </button>
            <h1 className="relative ml-2 text-xl font-extrabold text-gray-900 md:text-white">
              Buat Akun
            </h1>
          </div>

          <div className="relative rounded-[28px] bg-emerald-500 p-5 text-white shadow-[0_16px_36px_rgba(16,185,129,0.22)] md:bg-white/10 md:p-8 md:shadow-none md:ring-1 md:ring-white/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 md:h-14 md:w-14">
              <Leaf size={25} />
            </div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-100 uppercase">
              Food Hero Account
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-4xl">
              Selamatkan makanan enak dengan harga lebih hemat.
            </h2>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 pb-12 [scrollbar-width:none] sm:px-6 md:px-10 md:py-10 lg:px-16 [&::-webkit-scrollbar]:hidden">
          <section className="mx-auto mb-6 max-w-3xl rounded-[24px] border border-gray-100 bg-gray-50 p-4">
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

          <form
            className="mx-auto max-w-3xl space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0"
            onSubmit={handleSubmit}
          >
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
                  className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-emerald-600"
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

            <section className="rounded-[24px] border border-gray-100 bg-gray-50 p-4 md:col-span-2">
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
                      className={`min-h-11 rounded-2xl px-4 py-2 text-xs font-extrabold transition-all ${
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

            <label className="flex cursor-pointer gap-3 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm md:col-span-2">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-500"
              />
              <span className="text-xs leading-5 font-medium text-gray-500">
                Saya setuju dengan ketentuan layanan, kebijakan privasi, dan
                penggunaan akun ResQFood.
              </span>
            </label>

            {notice ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 font-bold text-amber-700 md:col-span-2">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!isFormReady || isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none md:col-span-2"
            >
              <HeartHandshake size={18} />
              {isSubmitting ? "Mendaftarkan Akun..." : "Daftar Sekarang"}
            </button>
          </form>

          <div className="mx-auto mt-6 max-w-3xl rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-extrabold text-emerald-950">
                  Punya usaha makanan?
                </p>
                <Link
                  href="/register-mitra"
                  className="mt-1 inline-flex min-h-11 items-center text-xs font-extrabold text-emerald-700 hover:text-emerald-800"
                >
                  Daftar sebagai mitra ResQFood
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Sudah punya akun?{" "}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center font-bold text-emerald-600 transition-colors hover:text-emerald-700"
            >
              Masuk di sini
            </Link>
          </p>
        </main>
      </div>
    </MobileDeviceFrame>
  );
}
