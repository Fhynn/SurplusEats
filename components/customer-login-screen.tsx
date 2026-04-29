"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Leaf, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

export function CustomerLoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
        <section className="relative h-[40%] w-full shrink-0">
          <Image
            src="https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=1200&auto=format&fit=crop"
            alt="Healthy food for SurplusEats login"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/20 to-gray-900/80" />

          <div className="absolute inset-x-6 top-8 z-10 flex items-center justify-between animate-[fade-down_700ms_ease-out_both]">
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

          <div className="absolute bottom-12 left-6 z-10 animate-[fade-up_800ms_ease-out_both]">
            <h1 className="mb-1 text-3xl font-extrabold leading-tight tracking-tight text-white">
              Selamat
              <br />
              Datang!
            </h1>
            <p className="text-sm font-medium text-emerald-50/90">
              Mari selamatkan makanan lezat hari ini.
            </p>
          </div>
        </section>

        <section className="relative z-20 -mt-8 flex flex-1 flex-col rounded-t-[32px] bg-white px-6 pt-8 pb-6 shadow-[0_-15px_40px_rgba(0,0,0,0.15)] animate-[sheet-up_650ms_ease-out_both]">
          <div className="mx-auto mb-8 h-1.5 w-12 rounded-full bg-gray-200" />

          <form
            className="flex flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              router.push("/home");
            }}
          >
            <div className="flex-1 space-y-5">
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
                    type="email"
                    placeholder="nama@email.com"
                    onFocus={() => setEmailFocus(true)}
                    onBlur={() => setEmailFocus(false)}
                    className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm text-gray-900 outline-none placeholder:text-gray-400"
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
                    href="#"
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    onFocus={() => setPassFocus(true)}
                    onBlur={() => setPassFocus(false)}
                    className="w-full rounded-2xl bg-transparent py-4 pr-12 pl-12 text-sm text-gray-900 outline-none placeholder:text-gray-400"
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

              <div className="pt-2">
                <button
                  type="submit"
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 py-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all duration-200 hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] active:scale-[0.98]"
                >
                  <span className="relative z-10">Masuk Sekarang</span>
                  <ArrowRight
                    size={18}
                    className="relative z-10 transition-transform group-hover:translate-x-1"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </button>
              </div>
            </div>

            <div className="mt-8">
              <p className="pb-4 text-center text-sm text-gray-500">
                Belum punya akun?{" "}
                <Link
                  href="/register"
                  className="font-bold text-emerald-600 transition-colors hover:text-emerald-700"
                >
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </form>
        </section>
    </MobileDeviceFrame>
  );
}
