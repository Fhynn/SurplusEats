"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type ResetStage = "email" | "reset" | "done";

const resetSteps: Array<{ id: ResetStage; label: string }> = [
  { id: "email", label: "Email" },
  { id: "reset", label: "Verifikasi" },
  { id: "done", label: "Selesai" },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<ResetStage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [notice, setNotice] = useState("");

  const stageIndex = resetSteps.findIndex((step) => step.id === stage);
  const canSendEmail = email.trim().length > 4 && email.includes("@");

  const passwordScore = useMemo(() => {
    let score = 0;

    if (newPassword.length >= 6) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    return score;
  }, [newPassword]);

  const passwordLabel =
    passwordScore >= 3 ? "Kuat" : passwordScore === 2 ? "Cukup" : "Lemah";
  const passwordBarClassName =
    passwordScore >= 3
      ? "bg-emerald-500"
      : passwordScore === 2
        ? "bg-amber-500"
        : "bg-rose-500";
  const passwordsMatch =
    confirmPassword.length === 0 || newPassword === confirmPassword;
  const canResetPassword =
    code.trim().length >= 4 &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    passwordsMatch;

  useEffect(() => {
    if (stage !== "reset" || resendTimer <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendTimer((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [stage, resendTimer]);

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSendEmail) {
      return;
    }

    setStage("reset");
    setResendTimer(30);
    setNotice("Kode verifikasi sudah dikirim ke email kamu.");
  };

  const handleResetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canResetPassword) {
      return;
    }

    setNotice("");
    setStage("done");
  };

  const handleBack = () => {
    if (stage === "reset") {
      setStage("email");
      setNotice("");
      return;
    }

    router.push("/");
  };

  const handleResendCode = () => {
    if (resendTimer > 0) {
      return;
    }

    setResendTimer(30);
    setNotice("Kode baru sudah dikirim. Gunakan kode terakhir yang masuk.");
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <div className="flex h-full flex-1 flex-col bg-white">
        <div className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 pt-10 pb-4">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label={
              stage === "reset" ? "Kembali ke input email" : "Kembali ke login"
            }
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
          <div className="mb-7">
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
                  ? "Verifikasi akun"
                  : "Password diperbarui"}
            </h1>
            <p className="mt-3 text-sm leading-6 font-medium text-gray-500">
              {stage === "email"
                ? "Masukkan email akun SurplusEats. Kami akan mengirim kode OTP untuk memastikan akun benar milik kamu."
                : stage === "reset"
                  ? `Kode OTP dikirim ke ${email || "email kamu"}. Masukkan kode, lalu buat password baru.`
                  : "Akun sudah siap digunakan lagi dengan password baru."}
            </p>
          </div>

          <div className="mb-7 grid grid-cols-3 gap-2">
            {resetSteps.map((step, index) => {
              const isComplete = index < stageIndex;
              const isCurrent = index === stageIndex;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border p-3 ${
                    isCurrent
                      ? "border-emerald-200 bg-emerald-50"
                      : isComplete
                        ? "border-gray-200 bg-gray-50"
                        : "border-gray-100 bg-white"
                  }`}
                >
                  <div
                    className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                      isComplete || isCurrent
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isComplete ? <CheckCircle2 size={15} /> : index + 1}
                  </div>
                  <p
                    className={`text-[11px] font-extrabold ${
                      isCurrent ? "text-emerald-700" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {stage === "email" ? (
            <form className="space-y-5" onSubmit={handleEmailSubmit}>
              <div className="space-y-1.5">
                <label
                  htmlFor="reset-email"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Email akun
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

              <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Proses aman
                  </h2>
                </div>
                <div className="space-y-3 text-sm font-semibold text-gray-600">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />
                    <span>Kode hanya dikirim ke email terdaftar.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />
                    <span>Password baru dibuat setelah OTP valid.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />
                    <span>Sesi lama akan diminta login ulang.</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSendEmail}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 py-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all duration-200 hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:shadow-none"
              >
                Kirim Kode OTP
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

              <p className="text-center text-xs font-semibold text-gray-500">
                Ingat password?{" "}
                <Link href="/" className="font-extrabold text-emerald-600">
                  Masuk sekarang
                </Link>
              </p>
            </form>
          ) : null}

          {stage === "reset" ? (
            <form className="space-y-5" onSubmit={handleResetSubmit}>
              {notice ? (
                <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-semibold text-sky-800">
                  <Mail size={18} className="mt-0.5 shrink-0" />
                  <p>{notice}</p>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label
                  htmlFor="reset-code"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Kode OTP
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
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="248109"
                    required
                    className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm font-extrabold tracking-[0.28em] text-gray-900 outline-none placeholder:font-semibold placeholder:tracking-normal placeholder:text-gray-400"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <Clock3 size={14} />
                    Kode berlaku terbatas
                  </p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendTimer > 0}
                    className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-extrabold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent"
                  >
                    <RefreshCcw size={14} />
                    {resendTimer > 0
                      ? `Kirim ulang ${resendTimer}s`
                      : "Kirim ulang"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Password baru
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
                {newPassword ? (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold">
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

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="ml-1 text-sm font-bold text-gray-700"
                >
                  Ulangi password baru
                </label>
                <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-emerald-500 focus-within:bg-white">
                  <Lock size={20} className="absolute left-4 text-gray-400" />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Ketik ulang password"
                    required
                    className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
                {confirmPassword ? (
                  <p
                    className={`ml-1 text-xs font-bold ${
                      passwordsMatch ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {passwordsMatch
                      ? "Password sudah cocok."
                      : "Password belum sama."}
                  </p>
                ) : null}
              </div>

              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <p className="text-sm leading-6 font-semibold text-emerald-800">
                    Gunakan kombinasi huruf besar, angka, dan simbol. Hindari
                    password yang sama dengan aplikasi lain.
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
                  Password untuk {email || "akun kamu"} sudah berhasil
                  diperbarui di prototype UI.
                </p>
              </div>

              <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <p className="text-sm leading-6 font-semibold text-gray-600">
                    Untuk keamanan, gunakan password baru ini saat login dan
                    jangan bagikan kode OTP ke siapa pun.
                  </p>
                </div>
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
