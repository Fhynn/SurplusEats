"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  Store,
  TicketPercent,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { waitForLoadingScreen } from "@/lib/loading-delay";

const trustItems = [
  "Pickup QR aman",
  "Voucher dan refund tersimpan",
  "Dampak food rescue tercatat",
] as const;

export function CustomerLoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isReady = normalizedEmail.includes("@") && password.length >= 4;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isReady) {
      setNotice("Masukkan email valid dan password terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    setNotice("");

    try {
      const [response] = await Promise.all([
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            rememberMe,
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
        setNotice(result.message || "Login gagal. Cek email dan password.");
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setNotice("Login gagal karena koneksi bermasalah.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      {isSubmitting ? (
        <LoadingScreen
          scope="frame"
          title="Memeriksa akun..."
          description="Kami sedang memvalidasi email dan password kamu."
        />
      ) : null}
      <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white">
        <section className="relative h-[34%] min-h-[230px] w-full shrink-0 md:min-h-[250px]">
          <Image
            src="https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=1200&auto=format&fit=crop"
            alt="Healthy food for SurplusEats login"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gray-950/45" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gray-950/80 to-transparent" />

          <div className="absolute inset-x-6 top-8 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 backdrop-blur-md">
              <Leaf size={14} className="fill-emerald-400 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wide text-white">
                SurplusEats
              </span>
            </div>
            <div className="rounded-full bg-emerald-500/90 px-3 py-1 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-white">
                #SaveGoodFood
              </span>
            </div>
          </div>

          <div className="absolute right-6 bottom-7 left-6 z-10">
            <h1 className="text-[27px] leading-tight font-extrabold tracking-tight text-white md:text-3xl">
              Masuk dan mulai selamatkan makanan hari ini.
            </h1>
            <p className="mt-2 text-sm leading-6 font-medium text-emerald-50/95">
              Cari makanan surplus terdekat, ambil dengan QR pickup, dan lacak
              semua pesanan dari satu akun.
            </p>
          </div>
        </section>

        <section className="relative z-20 -mt-7 flex flex-1 flex-col rounded-t-[32px] bg-white px-6 pt-6 pb-8 shadow-[0_-15px_40px_rgba(0,0,0,0.15)]">
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

          <form
            className="flex flex-1 flex-col"
            onSubmit={handleSubmit}
            autoComplete="off"
          >
            <div className="flex-1 space-y-4">
              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <TicketPercent size={17} className="text-emerald-600" />
                  <p className="text-sm font-extrabold text-emerald-950">
                    Benefit akun
                  </p>
                </div>
                <div className="grid gap-2">
                  {trustItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-700"
                    >
                      <CheckCircle2 size={14} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Email
                </label>
                <div
                  className={`relative flex items-center rounded-2xl border bg-gray-50 transition-all duration-300 ${
                    emailFocus
                      ? "border-emerald-500 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
                      : "border-gray-200"
                  }`}
                >
                  <Mail
                    size={20}
                    className={`absolute left-4 transition-colors ${
                      emailFocus ? "text-emerald-500" : "text-gray-400"
                    }`}
                  />
                  <input
                    id="email"
                    name="surpluseats-login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@email.com"
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-1p-ignore="true"
                    data-lpignore="true"
                    onFocus={() => setEmailFocus(true)}
                    onBlur={() => setEmailFocus(false)}
                    className="w-full rounded-2xl bg-transparent py-3.5 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="ml-1 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-gray-700"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-700"
                  >
                    Lupa password?
                  </Link>
                </div>
                <div
                  className={`relative flex items-center rounded-2xl border bg-gray-50 transition-all duration-300 ${
                    passFocus
                      ? "border-emerald-500 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
                      : "border-gray-200"
                  }`}
                >
                  <Lock
                    size={20}
                    className={`absolute left-4 transition-colors ${
                      passFocus ? "text-emerald-500" : "text-gray-400"
                    }`}
                  />
                  <input
                    id="password"
                    name="surpluseats-login-passcode"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="new-password"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    onFocus={() => setPassFocus(true)}
                    onBlur={() => setPassFocus(false)}
                    className="w-full rounded-2xl bg-transparent py-3.5 pr-12 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 p-1 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={
                      showPassword ? "Sembunyikan password" : "Lihat password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-500">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-emerald-500"
                  />
                  Ingat akun
                </label>
                <Link
                  href="/register-mitra"
                  className="flex items-center gap-1.5 text-xs font-extrabold text-gray-600 hover:text-emerald-600"
                >
                  <Store size={14} />
                  Daftar Mitra
                </Link>
              </div>

              {notice ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 font-bold text-blue-700">
                  {notice}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!isReady || isSubmitting}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all duration-200 hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
              >
                <span className="relative z-10">
                  {isSubmitting ? "Memeriksa Akun..." : "Masuk Sekarang"}
                </span>
                <ArrowRight
                  size={18}
                  className="relative z-10 transition-transform group-hover:translate-x-1"
                />
              </button>

            </div>

            <p className="mt-6 pb-2 text-center text-sm text-gray-500">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="font-bold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                Daftar sekarang
              </Link>
            </p>
          </form>
        </section>
      </div>
    </MobileDeviceFrame>
  );
}
