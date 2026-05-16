"use client";

import {
  Banknote,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Mail,
  MapPin,
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

const inputWrapClassName =
  "relative rounded-2xl border border-gray-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-500/10";

const inputClassName =
  "w-full rounded-2xl bg-transparent py-3.5 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400";

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
    description: "JPG, PNG, atau PDF maksimal 5 MB",
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
  pickupWindow: string;
  averageSurplus: string;
  bankAccount: string;
};

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
  onChange,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  fileName?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`group flex cursor-pointer flex-col rounded-[24px] border border-dashed px-5 py-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all ${
        fileName
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-300 bg-white hover:border-emerald-300 hover:bg-emerald-50"
      }`}
    >
      <input type="file" className="sr-only" onChange={onChange} />
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
    pickupWindow: "17:00 - 21:00",
    averageSurplus: "",
    bankAccount: "",
  });
  const [uploadedDocs, setUploadedDocs] = useState<Record<UploadKind, string>>({
    identity: "",
    permit: "",
    storefront: "",
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
      uploadedDocs.identity,
      uploadedDocs.permit,
      uploadedDocs.storefront,
    ];
    const completed = requiredItems.filter(Boolean).length;

    return Math.round((completed / requiredItems.length) * 100);
  }, [form, uploadedDocs]);

  const handleInputChange =
    (key: keyof PartnerForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleUploadChange =
    (key: UploadKind) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      setUploadedDocs((current) => ({ ...current, [key]: file.name }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/owner/verify");
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f8fafc] px-5 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      <form
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
            SurplusEats Partner
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
                <div className={inputWrapClassName}>
                  <Store
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.storeName}
                    onChange={handleInputChange("storeName")}
                    placeholder="Contoh: Bakehouse Bakery"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Nama Pemilik</FieldLabel>
                <div className={inputWrapClassName}>
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
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Email Owner</FieldLabel>
                <div className={inputWrapClassName}>
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
                  />
                </div>
              </div>

              <div>
                <FieldLabel>No. WhatsApp</FieldLabel>
                <div className={inputWrapClassName}>
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
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Alamat Pickup</FieldLabel>
                <div className={inputWrapClassName}>
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
                  />
                </div>
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
                <div className={inputWrapClassName}>
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
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Estimasi Surplus</FieldLabel>
                <div className={inputWrapClassName}>
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
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Rekening Pencairan</FieldLabel>
                <div className={inputWrapClassName}>
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
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Verifikasi Dokumen
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                File hanya disimulasikan di prototype UI ini.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {uploadRequirements.map((item) => (
                <UploadBox
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  fileName={uploadedDocs[item.id]}
                  onChange={handleUploadChange(item.id)}
                />
              ))}
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="submit"
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-emerald-500"
            >
              <Send size={18} />
              Kirim Pendaftaran
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
