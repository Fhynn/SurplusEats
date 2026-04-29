"use client";

import { Camera, FileText, MapPin, Send, Store, UploadCloud, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

const inputWrapClassName =
  "relative rounded-2xl border border-gray-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-500/10";

const inputClassName =
  "w-full rounded-2xl bg-transparent py-3.5 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400";

function UploadBox({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof Camera;
}) {
  return (
    <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-300 bg-white px-5 py-7 text-center shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all hover:border-emerald-300 hover:bg-emerald-50">
      <input type="file" className="sr-only" />
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-500 transition-colors group-hover:bg-white group-hover:text-emerald-500">
        <Icon size={26} />
      </div>
      <p className="text-sm font-extrabold text-gray-900">{title}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-xs font-extrabold text-white transition-colors group-hover:bg-emerald-500">
        <UploadCloud size={14} />
        Pilih File
      </span>
    </label>
  );
}

export default function RegisterMitraPage() {
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/owner/verify");
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f8fafc] px-5 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
            SurplusEats Partner
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
            Pendaftaran Mitra Toko
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 font-medium text-gray-500">
            Lengkapi informasi toko dan dokumen verifikasi agar akun owner bisa
            segera ditinjau oleh Admin.
          </p>
        </div>

        <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
          <h2 className="text-lg font-extrabold text-gray-950">Informasi Toko</h2>
          <div className="mt-5 grid gap-4">
            <div className={inputWrapClassName}>
              <Store
                size={19}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
              />
              <input
                required
                type="text"
                placeholder="Nama Toko"
                className={inputClassName}
              />
            </div>

            <div className={inputWrapClassName}>
              <User
                size={19}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
              />
              <input
                required
                type="text"
                placeholder="Nama Pemilik"
                className={inputClassName}
              />
            </div>

            <div className={inputWrapClassName}>
              <MapPin size={19} className="absolute top-4 left-4 text-emerald-500" />
              <textarea
                required
                rows={5}
                placeholder="Alamat Lengkap"
                className={`${inputClassName} resize-none py-4`}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
          <h2 className="text-lg font-extrabold text-gray-950">
            Verifikasi Dokumen
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <UploadBox
              title="Foto KTP Pemilik"
              description="Upload JPG, PNG, atau PDF"
              icon={Camera}
            />
            <UploadBox
              title="Surat Izin/NIB"
              description="Dokumen legal usaha"
              icon={FileText}
            />
          </div>
        </section>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-emerald-500"
        >
          <Send size={18} />
          Kirim Pendaftaran
        </button>
      </form>
    </main>
  );
}
