"use client";

import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

export function CustomerRegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="flex h-full flex-1 flex-col bg-white">
        <div className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke login"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <h1 className="ml-2 text-xl font-extrabold text-gray-900">Buat Akun</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-12">
          <p className="mb-8 text-sm text-gray-500">
            Gabung jadi Food Hero dan mulai selamatkan makanan enak dengan harga
            miring!
          </p>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              router.push("/");
            }}
          >
            <div className="space-y-1.5">
              <label className="ml-1 text-sm font-bold text-gray-700">
                Nama Lengkap
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                <User size={20} className="absolute left-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="John Doe"
                  required
                  className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm text-gray-900 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-sm font-bold text-gray-700">Email</label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                <Mail size={20} className="absolute left-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="nama@email.com"
                  required
                  className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm text-gray-900 outline-none"
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
                  placeholder="08123456789"
                  required
                  className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm text-gray-900 outline-none"
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
                  placeholder="Buat password"
                  required
                  className="w-full rounded-2xl bg-transparent py-4 pr-12 pl-12 text-sm text-gray-900 outline-none"
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
            </div>

            <div className="pt-6">
              <button
                type="submit"
                className="w-full rounded-2xl bg-gray-900 py-4 text-sm font-bold text-white transition-all duration-300 hover:bg-emerald-500 active:scale-[0.98]"
              >
                Daftar Sekarang
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Sudah punya akun?{" "}
            <Link
              href="/"
              className="font-bold text-emerald-600 transition-colors hover:text-emerald-700"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
