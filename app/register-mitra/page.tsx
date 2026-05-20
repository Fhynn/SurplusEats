"use client";

import {
  Banknote,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Send,
  ShieldCheck,
  Store,
  UploadCloud,
  User,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
} from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { WelcomeLoadingOverlay } from "@/components/welcome-loading-overlay";
import { waitForLoadingScreen } from "@/lib/loading-delay";

const inputWrapClassName =
  "relative rounded-2xl border border-gray-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-500/10";

const inputClassName =
  "w-full rounded-2xl bg-transparent py-3.5 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400";
const welcomeLoadingDelayMs = 4200;

const businessCategories = [
  "Bakery",
  "Restoran",
  "Warteg",
  "Kafe",
  "Catering",
] as const;

type UploadKind = "identity" | "permit" | "storefront";

const uploadRequirements: {
  id: UploadKind;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "identity",
    title: "Foto KTP Pemilik",
    description: "JPG, PNG, WEBP, atau PDF maksimal 6 MB",
    icon: Camera,
  },
  {
    id: "permit",
    title: "Surat Izin / NIB",
    description: "Dokumen legal usaha aktif",
    icon: FileText,
  },
  {
    id: "storefront",
    title: "Foto Toko",
    description: "Tampak depan lokasi pickup",
    icon: Store,
  },
];

const reviewChecklist = [
  "Identitas owner dan nama usaha harus cocok.",
  "Alamat pickup harus jelas untuk customer.",
  "Saldo baru bisa dicairkan setelah rekening tervalidasi.",
] as const;

type PartnerForm = {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  pickupWindow: string;
  averageSurplus: string;
  bankAccount: string;
  password: string;
};

type UploadedDocs = Record<UploadKind, File | null>;
type FormErrorKey = keyof PartnerForm | UploadKind;
type FormErrors = Partial<Record<FormErrorKey, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxUploadSize = 6 * 1024 * 1024;
const allowedUploadTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function getInputWrapClassName(error?: string) {
  return `${inputWrapClassName} ${
    error
      ? "border-red-200 bg-red-50/40 focus-within:border-red-300 focus-within:ring-red-500/10"
      : ""
  }`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-2 text-xs leading-5 font-bold text-red-600" role="alert">
      {message}
    </p>
  );
}

function validatePartnerForm(form: PartnerForm, uploadedDocs: UploadedDocs) {
  const errors: FormErrors = {};
  const phoneDigits = form.phone.replace(/\D/g, "");

  if (form.storeName.trim().length < 3) {
    errors.storeName = "Nama toko minimal 3 karakter.";
  }

  if (form.ownerName.trim().length < 3) {
    errors.ownerName = "Nama pemilik minimal 3 karakter sesuai identitas.";
  }

  if (!emailPattern.test(form.email.trim())) {
    errors.email = "Masukkan email owner yang valid.";
  }

  if (phoneDigits.length < 8) {
    errors.phone = "Nomor WhatsApp minimal 8 digit.";
  }

  if (form.password.length < 6) {
    errors.password = "Password owner minimal 6 karakter.";
  }

  if (form.address.trim().length < 20) {
    errors.address =
      "Alamat pickup terlalu pendek. Tulis alamat lengkap, nomor bangunan, area, dan patokan utama.";
  }

  const latitude = form.latitude.trim();
  const longitude = form.longitude.trim();

  if (!latitude && !longitude) {
    errors.latitude =
      "Titik lokasi toko wajib diisi. Klik Ambil Lokasi atau isi latitude dan longitude manual.";
  } else if ((latitude && !longitude) || (!latitude && longitude)) {
    errors.latitude = "Latitude dan longitude lokasi toko harus diisi bersama.";
  }

  if (latitude) {
    const latitudeNumber = Number(latitude);

    if (
      !Number.isFinite(latitudeNumber) ||
      latitudeNumber < -90 ||
      latitudeNumber > 90
    ) {
      errors.latitude = "Latitude lokasi toko harus berada di antara -90 dan 90.";
    }
  }

  if (longitude) {
    const longitudeNumber = Number(longitude);

    if (
      !Number.isFinite(longitudeNumber) ||
      longitudeNumber < -180 ||
      longitudeNumber > 180
    ) {
      errors.longitude =
        "Longitude lokasi toko harus berada di antara -180 dan 180.";
    }
  }

  if (form.pickupWindow.trim().length < 5) {
    errors.pickupWindow = "Tulis jam pickup, contoh: 17:00 - 21:00.";
  }

  if (form.averageSurplus.trim().length < 3) {
    errors.averageSurplus = "Tulis estimasi surplus, contoh: 10 porsi / hari.";
  }

  if (!uploadedDocs.identity) {
    errors.identity = "Foto KTP pemilik wajib diunggah.";
  }

  if (!uploadedDocs.permit) {
    errors.permit = "Surat izin atau NIB wajib diunggah.";
  }

  if (!uploadedDocs.storefront) {
    errors.storefront = "Foto tampak depan toko wajib diunggah.";
  }

  return errors;
}

function getFirstError(errors: FormErrors) {
  return Object.values(errors).find(Boolean) || "";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-extrabold text-gray-800">
      {children}
    </label>
  );
}

function UploadBox({
  title,
  description,
  icon: Icon,
  fileName,
  error,
  onChange,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  fileName?: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`group flex cursor-pointer flex-col rounded-[24px] border border-dashed px-5 py-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all ${
        error
          ? "border-red-200 bg-red-50"
          : fileName
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-300 bg-white hover:border-emerald-300 hover:bg-emerald-50"
      }`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={onChange}
      />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            fileName
              ? "bg-white text-emerald-600"
              : "bg-gray-50 text-gray-500 group-hover:bg-white group-hover:text-emerald-500"
          }`}
        >
          <Icon size={26} />
        </div>
        {fileName ? (
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-emerald-600">
            <CheckCircle2 size={12} />
            Terunggah
          </span>
        ) : null}
      </div>
      <p className="text-sm font-extrabold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
        {fileName || description}
      </p>
      <FieldError message={error} />
      <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-xs font-extrabold text-white transition-colors group-hover:bg-emerald-500">
        <UploadCloud size={14} />
        {fileName ? "Ganti File" : "Pilih File"}
      </span>
    </label>
  );
}

export default function RegisterMitraPage() {
  const router = useRouter();
  const [category, setCategory] =
    useState<(typeof businessCategories)[number]>("Bakery");
  const [form, setForm] = useState<PartnerForm>({
    storeName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    latitude: "",
    longitude: "",
    pickupWindow: "17:00 - 21:00",
    averageSurplus: "",
    bankAccount: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false);
  const [isLocatingStore, setIsLocatingStore] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocs>({
    identity: null,
    permit: null,
    storefront: null,
  });

  const completion = useMemo(() => {
    const requiredItems = [
      form.storeName,
      form.ownerName,
      form.email,
      form.phone,
      form.address,
      form.pickupWindow,
      form.averageSurplus,
      form.password,
      uploadedDocs.identity?.name,
      uploadedDocs.permit?.name,
      uploadedDocs.storefront?.name,
    ];
    const completed = requiredItems.filter(Boolean).length;

    return Math.round((completed / requiredItems.length) * 100);
  }, [form, uploadedDocs]);

  const handleInputChange =
    (key: keyof PartnerForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setNotice("");
      setFormErrors((current) => {
        if (!current[key]) {
          return current;
        }

        const next = { ...current };
        delete next[key];

        return next;
      });
    };

  const handleUploadChange =
    (key: UploadKind) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!allowedUploadTypes.has(file.type)) {
        setFormErrors((current) => ({
          ...current,
          [key]: "Format dokumen harus JPG, PNG, WEBP, atau PDF.",
        }));
        setNotice("Periksa dokumen yang ditandai merah.");
        return;
      }

      if (file.size > maxUploadSize) {
        setFormErrors((current) => ({
          ...current,
          [key]: "Ukuran dokumen maksimal 6 MB.",
        }));
        setNotice("Periksa dokumen yang ditandai merah.");
        return;
      }

      setUploadedDocs((current) => ({ ...current, [key]: file }));
      setNotice("");
      setFormErrors((current) => {
        if (!current[key]) {
          return current;
        }

        const next = { ...current };
        delete next[key];

        return next;
      });
    };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice("Browser belum mendukung akses lokasi.");
      return;
    }

    setIsLocatingStore(true);
    setNotice("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setFormErrors((current) => {
          if (!current.latitude && !current.longitude) {
            return current;
          }

          const next = { ...current };
          delete next.latitude;
          delete next.longitude;

          return next;
        });
        setIsLocatingStore(false);
      },
      () => {
        setNotice("Lokasi toko gagal diambil. Izinkan akses lokasi atau isi manual.");
        setIsLocatingStore(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 12_000,
      },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const validationErrors = validatePartnerForm(form, uploadedDocs);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setNotice(
        getFirstError(validationErrors) ||
          "Periksa data yang ditandai merah sebelum mendaftar.",
      );
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.set("ownerName", form.ownerName);
      formData.set("email", form.email);
      formData.set("phone", form.phone);
      formData.set("password", form.password);
      formData.set("storeName", form.storeName);
      formData.set("businessType", category);
      formData.set("address", form.address);
      formData.set("city", "Jakarta");
      formData.set("latitude", form.latitude);
      formData.set("longitude", form.longitude);
      formData.set(
        "description",
        `Jam pickup ${form.pickupWindow}. Estimasi surplus ${form.averageSurplus}. Rekening ${form.bankAccount || "belum diisi"}.`,
      );

      Object.entries(uploadedDocs).forEach(([key, file]) => {
        if (file) {
          formData.set(key, file);
        }
      });

      const [response] = await Promise.all([
        fetch("/api/auth/register-owner", {
          method: "POST",
          body: formData,
        }),
        waitForLoadingScreen(),
      ]);
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        redirectTo?: string;
        issues?: {
          fieldErrors?: Partial<Record<keyof PartnerForm, string[]>>;
        };
      };

      if (!response.ok || !result.ok || !result.redirectTo) {
        const apiFieldErrors = result.issues?.fieldErrors;

        if (apiFieldErrors) {
          const nextErrors: FormErrors = {};

          Object.entries(apiFieldErrors).forEach(([key, messages]) => {
            const message = messages?.[0];

            if (message) {
              nextErrors[key as keyof PartnerForm] = message;
            }
          });

          setFormErrors(nextErrors);
        }

        setNotice(result.message || "Pendaftaran mitra gagal. Coba lagi.");
        return;
      }

      setIsWelcomeLoading(true);
      await new Promise((resolve) => setTimeout(resolve, welcomeLoadingDelayMs));
      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setNotice("Pendaftaran mitra gagal karena koneksi bermasalah.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#f8fafc] px-5 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      {isSubmitting && !isWelcomeLoading ? (
        <LoadingScreen
          title="Mengirim pendaftaran..."
          description="Dokumen dan data mitra sedang dikirim ke ResQFood."
        />
      ) : null}
      {isWelcomeLoading ? (
        <WelcomeLoadingOverlay
          title="Pendaftaran diterima!"
          description="Akun mitra sudah dibuat. Kami sedang membuka halaman status verifikasi."
        />
      ) : null}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.84fr_1.16fr]"
      >
        <aside className="h-fit rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)] lg:sticky lg:top-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-7 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke login"
          >
            <ChevronLeft size={21} />
          </button>

          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.22)]">
            <Store size={31} />
          </div>

          <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
            ResQFood Partner
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">
            Pendaftaran Mitra Toko
          </h1>
          <p className="mt-4 text-sm leading-7 font-medium text-gray-500">
            Lengkapi profil usaha dan dokumen verifikasi agar admin bisa
            meninjau toko sebelum dashboard owner aktif.
          </p>

          <div className="mt-7 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-extrabold text-emerald-700">
              <span>Kelengkapan</span>
              <span>{completion}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {reviewChecklist.map((item) => (
              <div key={item} className="flex gap-3 text-xs font-medium text-gray-500">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />
                <span className="leading-5">{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Informasi Toko
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Data ini akan tampil di dashboard owner dan halaman customer.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Nama Toko</FieldLabel>
                <div className={getInputWrapClassName(formErrors.storeName)}>
                  <Store
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.storeName}
                    onChange={handleInputChange("storeName")}
                    placeholder="Nama usaha kamu"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.storeName)}
                  />
                </div>
                <FieldError message={formErrors.storeName} />
              </div>

              <div>
                <FieldLabel>Nama Pemilik</FieldLabel>
                <div className={getInputWrapClassName(formErrors.ownerName)}>
                  <User
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.ownerName}
                    onChange={handleInputChange("ownerName")}
                    placeholder="Nama sesuai KTP"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.ownerName)}
                  />
                </div>
                <FieldError message={formErrors.ownerName} />
              </div>

              <div>
                <FieldLabel>Email Owner</FieldLabel>
                <div className={getInputWrapClassName(formErrors.email)}>
                  <Mail
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={handleInputChange("email")}
                    placeholder="owner@email.com"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.email)}
                  />
                </div>
                <FieldError message={formErrors.email} />
              </div>

              <div>
                <FieldLabel>No. WhatsApp</FieldLabel>
                <div className={getInputWrapClassName(formErrors.phone)}>
                  <Phone
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={handleInputChange("phone")}
                    placeholder="08123456789"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.phone)}
                  />
                </div>
                <FieldError message={formErrors.phone} />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Password Owner</FieldLabel>
                <div className={getInputWrapClassName(formErrors.password)}>
                  <Lock
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleInputChange("password")}
                    placeholder="Minimal 6 karakter untuk login owner"
                    className="w-full rounded-2xl bg-transparent py-3.5 pr-12 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                    aria-invalid={Boolean(formErrors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 p-1 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={
                      showPassword ? "Sembunyikan password" : "Lihat password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <FieldError message={formErrors.password} />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Alamat Pickup</FieldLabel>
                <div className={getInputWrapClassName(formErrors.address)}>
                  <MapPin
                    size={19}
                    className="absolute top-4 left-4 text-emerald-500"
                  />
                  <textarea
                    required
                    rows={4}
                    value={form.address}
                    onChange={handleInputChange("address")}
                    placeholder="Tulis alamat lengkap dan patokan utama."
                    className={`${inputClassName} resize-none py-4`}
                    aria-invalid={Boolean(formErrors.address)}
                  />
                </div>
                <FieldError message={formErrors.address} />
              </div>

              <div className="md:col-span-2">
                <section className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">
                        Titik Lokasi Toko
                      </p>
                      <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                        Wajib diisi agar customer bisa melihat rute pickup.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocatingStore}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-300"
                    >
                      <Navigation size={15} />
                      {isLocatingStore ? "Mengambil..." : "Ambil Lokasi"}
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-extrabold text-gray-700">
                        Latitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={form.latitude}
                        onChange={handleInputChange("latitude")}
                        placeholder="-6.200000"
                        className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300 focus:border-emerald-500"
                        aria-invalid={Boolean(formErrors.latitude)}
                      />
                      <FieldError message={formErrors.latitude} />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-extrabold text-gray-700">
                        Longitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={form.longitude}
                        onChange={handleInputChange("longitude")}
                        placeholder="106.816666"
                        className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300 focus:border-emerald-500"
                        aria-invalid={Boolean(formErrors.longitude)}
                      />
                      <FieldError message={formErrors.longitude} />
                    </label>
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Operasional Surplus
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Bantu admin memahami tipe usaha dan jam pickup kamu.
              </p>
            </div>

            <FieldLabel>Kategori Usaha</FieldLabel>
            <div className="mb-5 flex flex-wrap gap-2">
              {businessCategories.map((item) => {
                const isActive = category === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
                      isActive
                        ? "bg-gray-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel>Jam Pickup</FieldLabel>
                <div className={getInputWrapClassName(formErrors.pickupWindow)}>
                  <Clock3
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.pickupWindow}
                    onChange={handleInputChange("pickupWindow")}
                    placeholder="17:00 - 21:00"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.pickupWindow)}
                  />
                </div>
                <FieldError message={formErrors.pickupWindow} />
              </div>

              <div>
                <FieldLabel>Estimasi Surplus</FieldLabel>
                <div className={getInputWrapClassName(formErrors.averageSurplus)}>
                  <FileText
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.averageSurplus}
                    onChange={handleInputChange("averageSurplus")}
                    placeholder="10 porsi / hari"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.averageSurplus)}
                  />
                </div>
                <FieldError message={formErrors.averageSurplus} />
              </div>

              <div>
                <FieldLabel>Rekening Pencairan</FieldLabel>
                <div className={getInputWrapClassName(formErrors.bankAccount)}>
                  <Banknote
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    type="text"
                    value={form.bankAccount}
                    onChange={handleInputChange("bankAccount")}
                    placeholder="BCA 1234567890"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.bankAccount)}
                  />
                </div>
                <FieldError message={formErrors.bankAccount} />
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Verifikasi Dokumen
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Dokumen dikirim ke admin untuk proses review usaha.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {uploadRequirements.map((item) => (
                <UploadBox
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  fileName={uploadedDocs[item.id]?.name}
                  error={formErrors[item.id]}
                  onChange={handleUploadChange(item.id)}
                />
              ))}
            </div>
          </section>

          {notice ? (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 font-bold text-amber-700">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              <Send size={18} />
              {isSubmitting ? "Mengirim Pendaftaran..." : "Kirim Pendaftaran"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/owner/verify")}
              className="min-h-14 rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-extrabold whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50"
            >
              Lihat Status
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
