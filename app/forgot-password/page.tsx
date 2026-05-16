"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type ResetStage = "email" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<ResetStage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSendEmail = email.trim().length > 4 && email.includes("@");
  const canResetPassword = code.trim().length >= 4 && newPassword.length >= 6;

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSendEmail) {
      return;
    }

    setStage("reset");
  };

  const handleResetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canResetPassword) {
      return;
    }

    setStage("done");
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="flex h-full flex-1 flex-col bg-white">
        <div className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 pt-10 pb-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke login"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <Link
            href="/help"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
            aria-label="Buka bantuan"
          >
            <HelpCircle size={20} />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <div className="mb-8">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-50 text-emerald-600">
              {stage === "done" ? (
                <CheckCircle2 size={30} />
              ) : (
                <ShieldCheck size={30} />
              )}
            </div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
              Account Recovery
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-950">
              {stage === "email"
                ? "Reset password"
                : stage === "reset"
                  ? "Buat password baru"
                  : "Password diperbarui"}
            </h1>
            <p className="mt-3 text-sm leading-6 font-medium text-gray-500">
              {stage === "email"
                ? "Masukkan email akun SurplusEats kamu. Kami akan mengirim kode verifikasi untuk mengamankan proses reset."
                : stage === "reset"
                  ? `Kode reset dikirim ke ${email || "email kamu"}. Masukkan kode dan password baru.`
                  : "Kamu bisa masuk lagi menggunakan password baru. Pastikan tidak membagikan password ke siapa pun."}
            </p>
          </div>

          {stage === "email" ? (
            <form className="space-y-5" onSubmit={handleEmailSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-email"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Email
                </label>
                <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                  <Mail size={20} className="absolute left-4 text-gray-400" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSendEmail}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 py-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all duration-200 hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:shadow-none"
              >
                Kirim Kode Reset
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </form>
          ) : null}

          {stage === "reset" ? (
            <form className="space-y-5" onSubmit={handleResetSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-code"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Kode Verifikasi
                </label>
                <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                  <KeyRound
                    size={20}
                    className="absolute left-4 text-gray-400"
                  />
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Contoh: 2481"
                    required
                    className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Password Baru
                </label>
                <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                  <Lock size={20} className="absolute left-4 text-gray-400" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
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

              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <p className="text-sm leading-6 font-semibold text-emerald-800">
                    Gunakan kombinasi huruf, angka, dan simbol agar akun lebih
                    aman.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canResetPassword}
                className="w-full rounded-2xl bg-gray-900 py-4 text-sm font-bold text-white transition-all duration-300 hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Reset Password
              </button>
            </form>
          ) : null}

          {stage === "done" ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-6 text-center">
                <CheckCircle2
                  size={48}
                  className="mx-auto mb-4 text-emerald-600"
                />
                <h2 className="text-lg font-extrabold text-gray-950">
                  Akun siap digunakan
                </h2>
                <p className="mt-2 text-sm leading-6 font-medium text-gray-600">
                  Password sudah berhasil diperbarui di prototype UI.
                </p>
              </div>

              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-colors hover:bg-emerald-600"
              >
                Masuk Sekarang
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/help"
                className="flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white py-4 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Butuh Bantuan
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </MobileDeviceFrame>
  );
}
