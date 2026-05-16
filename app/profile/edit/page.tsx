"use client";

import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function CustomerEditProfilePage() {
  const [profile, setProfile] = useState<ProfileForm>({
    fullName: "",
    email: "",
    phone: "",
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");

  const isProfileInvalid =
    !profile.fullName.trim() ||
    !profile.email.includes("@") ||
    profile.phone.trim().length < 8;
  const isPasswordInvalid =
    !passwordForm.currentPassword.trim() ||
    passwordForm.newPassword.length < 6 ||
    passwordForm.newPassword !== passwordForm.confirmPassword;

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json()) as {
        ok: boolean;
        user?: { name: string; email: string; phone?: string | null };
      };

      if (!ignore && data.user) {
        setProfile((currentProfile) => ({
          ...currentProfile,
          fullName: data.user?.name ?? "",
          email: data.user?.email ?? "",
          phone: data.user?.phone ?? "",
        }));
      }
    }

    void loadUser();

    return () => {
      ignore = true;
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleProfileChange = (key: keyof ProfileForm, value: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [key]: value,
    }));
    setProfileNotice("");
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(URL.createObjectURL(file));
    setProfileNotice("Foto profil siap disimpan.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isProfileInvalid) {
      setProfileNotice("Lengkapi nama, email valid, dan nomor HP terlebih dahulu.");
      return;
    }

    setProfileNotice("Perubahan profil berhasil disimpan di prototype UI.");
  };

  const handlePasswordChange = (key: keyof PasswordForm, value: string) => {
    setPasswordForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
    setPasswordNotice("");
  };

  const handleSavePassword = () => {
    if (isPasswordInvalid) {
      setPasswordNotice(
        "Password baru minimal 6 karakter dan konfirmasi harus sama.",
      );
      return;
    }

    setPasswordNotice("Password berhasil diperbarui di prototype UI.");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleClosePassword = () => {
    setIsPasswordOpen(false);
    setPasswordNotice("");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-white">
      <form
        onSubmit={handleSubmit}
        className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white"
      >
        <header className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4 shadow-sm">
          <Link
            href="/profile/settings"
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke pengaturan akun"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </Link>
          <h1 className="ml-2 text-lg font-extrabold text-gray-900">
            Ubah Profil
          </h1>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 pb-48 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-6 flex flex-col items-center justify-center">
            <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-emerald-50 text-emerald-600 shadow-md">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User size={38} />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="sr-only"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Edit2 size={24} className="text-white" />
              </span>
            </label>
            <span className="mt-3 text-xs font-bold text-emerald-600">
              Ganti Foto Profil
            </span>
          </div>

          {profileNotice ? (
            <div
              className={`flex gap-3 rounded-[20px] border p-4 ${
                profileNotice.includes("berhasil") ||
                profileNotice.includes("siap")
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border-red-100 bg-red-50 text-red-700"
              }`}
            >
              <CheckCircle2 size={20} className="shrink-0" />
              <p className="text-xs leading-5 font-bold">{profileNotice}</p>
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="full-name"
                className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase"
              >
                Nama Lengkap
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 shadow-sm transition-all focus-within:border-emerald-500">
                <User size={18} className="absolute left-4 text-gray-400" />
                <input
                  id="full-name"
                  type="text"
                  value={profile.fullName}
                  onChange={(event) =>
                    handleProfileChange("fullName", event.target.value)
                  }
                  className="w-full bg-transparent py-3.5 pr-4 pl-11 text-sm font-bold text-gray-900 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase"
              >
                Email
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 shadow-sm transition-all focus-within:border-emerald-500">
                <Mail size={18} className="absolute left-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(event) =>
                    handleProfileChange("email", event.target.value)
                  }
                  className="w-full bg-transparent py-3.5 pr-4 pl-11 text-sm font-bold text-gray-900 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="phone"
                className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase"
              >
                Nomor HP
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 shadow-sm transition-all focus-within:border-emerald-500">
                <Phone size={18} className="absolute left-4 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(event) =>
                    handleProfileChange("phone", event.target.value)
                  }
                  className="w-full bg-transparent py-3.5 pr-4 pl-11 text-sm font-bold text-gray-900 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase"
              >
                Password
              </label>
              <div className="relative flex items-center rounded-2xl border border-gray-200 bg-gray-50 shadow-sm transition-all">
                <Lock size={18} className="absolute left-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value="surpluseats"
                  readOnly
                  className="w-full bg-transparent py-3.5 pr-16 pl-11 text-sm font-bold text-gray-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(true)}
                  className="absolute right-4 text-xs font-bold text-emerald-600"
                >
                  Ubah
                </button>
              </div>
            </div>

            <section className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex gap-3">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />
                <p className="text-xs leading-5 font-semibold text-emerald-800">
                  Gunakan email dan nomor HP aktif agar update order, refund, dan
                  voucher tidak terlewat.
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 left-0 border-t border-gray-50 bg-white p-6">
          <button
            type="submit"
            disabled={isProfileInvalid}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            <Save size={18} />
            Simpan Perubahan
          </button>
        </div>

        {isPasswordOpen ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm">
            <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                    Security
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                    Ubah Password
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClosePassword}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                  aria-label="Tutup ubah password"
                >
                  <X size={18} />
                </button>
              </div>

              {passwordNotice ? (
                <p
                  className={`mb-4 rounded-2xl border p-3 text-xs leading-5 font-bold ${
                    passwordNotice.includes("berhasil")
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "border-red-100 bg-red-50 text-red-700"
                  }`}
                >
                  {passwordNotice}
                </p>
              ) : null}

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Password Lama
                  </span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      handlePasswordChange(
                        "currentPassword",
                        event.target.value,
                      )
                    }
                    placeholder="Masukkan password lama"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Password Baru
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        handlePasswordChange("newPassword", event.target.value)
                      }
                      placeholder="Minimal 6 karakter"
                      className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 pr-12 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400"
                      aria-label={
                        showPassword ? "Sembunyikan password" : "Lihat password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Konfirmasi Password
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      handlePasswordChange(
                        "confirmPassword",
                        event.target.value,
                      )
                    }
                    placeholder="Ulangi password baru"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleClosePassword}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSavePassword}
                  disabled={isPasswordInvalid}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                >
                  <Save size={17} />
                  Simpan
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </MobileDeviceFrame>
  );
}
