"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LeafyGreen,
  Lock,
  Mail,
  ShieldCheck,
  Store,
  Ticket,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { waitForLoadingScreen } from "@/lib/loading-delay";

export function CustomerLoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="relative flex min-h-screen flex-col bg-white lg:flex-row">
      {isSubmitting ? (
        <LoadingScreen
          title="Memeriksa akun..."
          description="Kami sedang memvalidasi email dan password kamu."
        />
      ) : null}

      <section className="relative h-56 w-full shrink-0 bg-gray-100 sm:h-72 lg:h-screen lg:w-[45%]">
        <Image
          src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop"
          alt="Healthy food"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent lg:hidden" />
      </section>

      <section className="relative z-20 -mt-6 flex w-full flex-1 flex-col items-center rounded-t-[2rem] bg-white p-6 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.15)] sm:p-10 lg:mt-0 lg:w-[55%] lg:justify-center lg:rounded-none lg:shadow-none">
        <div className="mt-2 w-full max-w-md lg:mt-0">
          <div className="mx-auto mb-8 h-1.5 w-12 rounded-full bg-gray-200 lg:hidden" />

          <div className="mb-8 flex items-center justify-center gap-2.5 lg:justify-start">
            <div className="rounded-2xl border border-emerald-50 bg-emerald-100 p-2.5 text-emerald-600 shadow-sm">
              <LeafyGreen size={28} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-gray-900">
              ResQFood
            </span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">
              Mulai hari ini.
            </h1>
            <p className="text-sm leading-relaxed text-gray-500">
              Cari makanan surplus terdekat, ambil dengan QR pickup, dan lacak
              pesananmu.
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-emerald-100/60 bg-emerald-50/50 p-4">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-emerald-50 bg-white p-1.5 shadow-sm">
                  <ShieldCheck size={18} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-900">
                  Pickup QR yang aman
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-emerald-50 bg-white p-1.5 shadow-sm">
                  <Ticket size={18} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-900">
                  Voucher & refund tersimpan
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-emerald-50 bg-white p-1.5 shadow-sm">
                  <Leaf size={18} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-emerald-900">
                  Dampak food rescue tercatat
                </span>
              </div>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-gray-700"
              >
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  name="resqfood-login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 pr-4 pl-11 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="nama@email.com"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore="true"
                  data-lpignore="true"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="resqfood-login-passcode"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3.5 pr-12 pl-11 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Masukkan password"
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-colors hover:text-emerald-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <label className="group flex cursor-pointer items-center">
                <span className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="h-5 w-5 rounded border-2 border-gray-300 transition-colors peer-checked:border-emerald-600 peer-checked:bg-emerald-600" />
                  <svg
                    className="pointer-events-none absolute h-5 w-5 text-white opacity-0 peer-checked:opacity-100"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="ml-2.5 text-sm font-medium text-gray-600 group-hover:text-gray-900">
                  Ingat akun
                </span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
              >
                Lupa password?
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
              className="group mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 font-bold text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.5)] transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
            >
              {isSubmitting ? "Memeriksa Akun..." : "Masuk Sekarang"}
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Atau
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <Link
            href="/register-mitra"
            className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 py-3.5 text-sm font-bold text-emerald-700 transition-all hover:border-emerald-200 hover:bg-emerald-100 active:scale-[0.98]"
          >
            <Store size={18} className="text-emerald-600" />
            Daftar Mitra
          </Link>

          <p className="mt-10 mb-6 text-center text-sm font-medium text-gray-600">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-bold text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
