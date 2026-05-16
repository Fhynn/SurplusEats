import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Store,
} from "lucide-react";

const verificationSteps = [
  {
    title: "Pendaftaran diterima",
    description: "Data dasar toko dan pemilik sudah masuk ke sistem.",
    status: "Selesai",
    tone: "done",
  },
  {
    title: "Review dokumen legal",
    description: "Admin memeriksa izin usaha, identitas, dan foto toko.",
    status: "Diproses",
    tone: "active",
  },
  {
    title: "Validasi lokasi pickup",
    description: "Alamat pickup dicek agar customer tidak salah tujuan.",
    status: "Menunggu",
    tone: "pending",
  },
  {
    title: "Dashboard owner aktif",
    description: "Toko bisa mulai membuat menu surplus setelah disetujui.",
    status: "Berikutnya",
    tone: "pending",
  },
] as const;

const documentChecks = [
  {
    label: "Identitas pemilik",
    detail: "KTP dan kontak owner terbaca jelas.",
    icon: ShieldCheck,
    status: "Valid",
    className: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Dokumen usaha",
    detail: "Izin usaha sedang dicocokkan manual.",
    icon: FileText,
    status: "Review",
    className: "bg-amber-50 text-amber-600",
  },
  {
    label: "Lokasi pickup",
    detail: "Alamat toko sudah tersimpan di peta operasional.",
    icon: MapPin,
    status: "Siap",
    className: "bg-blue-50 text-blue-600",
  },
  {
    label: "Rekening pencairan",
    detail: "Nomor rekening akan diverifikasi sebelum payout pertama.",
    icon: Banknote,
    status: "Nanti",
    className: "bg-gray-100 text-gray-600",
  },
] as const;

const toneClassNameByStepTone = {
  done: {
    dot: "bg-emerald-500 text-white",
    card: "border-emerald-100 bg-emerald-50",
    title: "text-emerald-950",
    status: "bg-white text-emerald-600",
  },
  active: {
    dot: "bg-amber-500 text-white",
    card: "border-amber-100 bg-amber-50",
    title: "text-amber-950",
    status: "bg-white text-amber-600",
  },
  pending: {
    dot: "bg-gray-200 text-gray-500",
    card: "border-gray-100 bg-white",
    title: "text-gray-900",
    status: "bg-gray-100 text-gray-500",
  },
} as const;

export default function OwnerVerifyPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-gray-100 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="absolute inset-x-0 top-0 h-2 bg-amber-500" />

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)]">
              <Store size={24} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-950">
                SurplusOwner
              </p>
              <p className="text-xs font-semibold text-gray-400">
                Bakehouse Bakery
              </p>
            </div>
          </div>

          <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[28px] bg-amber-50 text-amber-500">
            <Clock3 size={48} />
          </div>

          <p className="text-xs font-extrabold tracking-[0.22em] text-amber-500 uppercase">
            Verification Review
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">
            Menunggu Verifikasi
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 font-medium text-gray-500">
            Akun restoran sedang diperiksa admin. Dokumen usaha, identitas
            pemilik, rekening pencairan, dan lokasi pickup akan divalidasi
            sebelum toko aktif menerima order.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-amber-600 uppercase">
                Estimasi
              </p>
              <p className="mt-1 text-lg font-extrabold text-amber-900">
                1-2 hari kerja
              </p>
            </div>
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-emerald-600 uppercase">
                Status
              </p>
              <p className="mt-1 text-lg font-extrabold text-emerald-900">
                Dokumen masuk
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Link
              href="/owner/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] transition-colors hover:bg-emerald-500"
            >
              <LayoutDashboard size={18} />
              Lihat Preview Dashboard
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="mailto:support@surpluseats.id"
                className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5 text-sm font-extrabold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <HelpCircle size={17} />
                Support
              </Link>
              <Link
                href="/"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-center text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Login
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-950">
                  Progress Verifikasi
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Tahapan aktivasi akun owner.
                </p>
              </div>
              <FileCheck2 size={24} className="text-gray-400" />
            </div>

            <div className="relative space-y-4 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-0.5 before:bg-gray-100">
              {verificationSteps.map((step) => {
                const tone = toneClassNameByStepTone[step.tone];

                return (
                  <div key={step.title} className="relative flex gap-4">
                    <div
                      className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm ${tone.dot}`}
                    >
                      {step.tone === "pending" ? (
                        <Clock3 size={15} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                    </div>
                    <div
                      className={`flex-1 rounded-[22px] border p-4 ${tone.card}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h3 className={`text-sm font-extrabold ${tone.title}`}>
                          {step.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${tone.status}`}
                        >
                          {step.status}
                        </span>
                      </div>
                      <p className="text-xs leading-5 font-medium text-gray-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Checklist Dokumen
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Ringkasan data yang sedang dicek admin.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {documentChecks.map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="rounded-[24px] border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.className}`}
                      >
                        <Icon size={21} />
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-gray-500">
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-gray-950">
                      {item.label}
                    </h3>
                    <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
                      {item.detail}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
