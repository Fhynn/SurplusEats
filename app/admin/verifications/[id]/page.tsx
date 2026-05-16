"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  Store,
  UserRound,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type VerificationStatus = "pending" | "approved" | "rejected";
type ChecklistStatus = "valid" | "warning" | "invalid";

type VerificationStore = {
  id: string;
  date: string;
  storeName: string;
  category: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  businessType: string;
  estimatedDailySurplus: string;
  pickupWindow: string;
  bankAccount: string;
  riskScore: number;
  recommendation: string;
};

type DocumentFile = {
  label: string;
  name: string;
  type: "identity" | "store" | "license";
  status: ChecklistStatus;
};

type ChecklistItem = {
  label: string;
  description: string;
  status: ChecklistStatus;
};

const verificationStores: VerificationStore[] = [
  {
    id: "UMKM-24081",
    date: "30 Apr 2026",
    storeName: "Warung Nasi Bu Rini",
    category: "Masakan Rumahan",
    owner: "Rini Handayani",
    email: "rini.handayani@example.com",
    phone: "+62 812-2219-8821",
    address:
      "Jl. Cipete Raya No. 18, Cilandak, Jakarta Selatan, DKI Jakarta 12410",
    city: "Jakarta Selatan",
    businessType: "UMKM makanan siap saji",
    estimatedDailySurplus: "18-25 porsi per hari",
    pickupWindow: "19:00 - 21:00 WIB",
    bankAccount: "BCA **** 4201",
    riskScore: 18,
    recommendation:
      "Dokumen terlihat lengkap. Admin dapat menyetujui setelah mengecek kecocokan alamat toko dan foto etalase.",
  },
  {
    id: "UMKM-24079",
    date: "30 Apr 2026",
    storeName: "Kopi Sore Kemang",
    category: "Kafe & Minuman",
    owner: "Aditya Mahendra",
    email: "aditya.mahendra@example.com",
    phone: "+62 813-4401-7730",
    address:
      "Jl. Kemang Timur No. 55, Mampang Prapatan, Jakarta Selatan, DKI Jakarta 12730",
    city: "Jakarta Selatan",
    businessType: "Kafe",
    estimatedDailySurplus: "12-18 paket roti dan minuman",
    pickupWindow: "20:00 - 22:00 WIB",
    bankAccount: "Mandiri **** 8821",
    riskScore: 24,
    recommendation:
      "Kelayakan baik. Perlu konfirmasi jam pickup agar tidak melewati jam operasional outlet.",
  },
  {
    id: "UMKM-24073",
    date: "29 Apr 2026",
    storeName: "Roti Lembut Nana",
    category: "Bakery",
    owner: "Nana Kartika",
    email: "nana.kartika@example.com",
    phone: "+62 857-1120-9452",
    address:
      "Jl. Bintaro Utama Sektor 3A No. 12, Pondok Aren, Tangerang Selatan 15225",
    city: "Tangerang Selatan",
    businessType: "Bakery rumahan",
    estimatedDailySurplus: "20-30 roti per hari",
    pickupWindow: "18:00 - 20:30 WIB",
    bankAccount: "BNI **** 1142",
    riskScore: 42,
    recommendation:
      "Foto toko perlu dicek ulang karena sebagian area produksi tidak terlihat jelas.",
  },
  {
    id: "UMKM-24070",
    date: "29 Apr 2026",
    storeName: "Mie Ayam Pak Darto",
    category: "Noodle Shop",
    owner: "Sudarsono",
    email: "sudarsono@example.com",
    phone: "+62 822-9102-1140",
    address:
      "Jl. Tebet Barat Dalam Raya No. 7, Tebet, Jakarta Selatan, DKI Jakarta 12810",
    city: "Jakarta Selatan",
    businessType: "Warung makan",
    estimatedDailySurplus: "10-15 porsi per hari",
    pickupWindow: "19:30 - 21:00 WIB",
    bankAccount: "BRI **** 9088",
    riskScore: 58,
    recommendation:
      "Butuh verifikasi manual tambahan karena dokumen izin usaha belum sepenuhnya terbaca.",
  },
];

const documentFiles: DocumentFile[] = [
  {
    label: "KTP Pemilik",
    name: "ktp_pemilik.pdf",
    type: "identity",
    status: "valid",
  },
  {
    label: "Foto Toko",
    name: "foto_toko_depan.jpg",
    type: "store",
    status: "valid",
  },
  {
    label: "Surat Izin Usaha",
    name: "surat_izin_usaha.pdf",
    type: "license",
    status: "warning",
  },
];

const checklist: ChecklistItem[] = [
  {
    label: "Identitas pemilik",
    description: "Nama pemilik sesuai dengan dokumen identitas.",
    status: "valid",
  },
  {
    label: "Alamat toko",
    description: "Alamat pendaftaran dapat dicocokkan dengan area operasional.",
    status: "valid",
  },
  {
    label: "Legalitas usaha",
    description: "Dokumen izin tersedia, tetapi perlu cek kualitas scan.",
    status: "warning",
  },
  {
    label: "Kategori makanan",
    description: "Kategori sesuai dengan produk surplus yang akan dijual.",
    status: "valid",
  },
];

const statusClassName: Record<ChecklistStatus, string> = {
  valid: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  warning: "bg-amber-50 text-amber-600 ring-amber-100",
  invalid: "bg-red-50 text-red-600 ring-red-100",
};

const statusLabel: Record<ChecklistStatus, string> = {
  valid: "Valid",
  warning: "Perlu Cek",
  invalid: "Tidak Valid",
};

function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700">
        <CheckCircle2 size={16} />
        Disetujui
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700">
        <XCircle size={16} />
        Ditolak
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-700">
      <Clock3 size={16} />
      Menunggu Review
    </span>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
        <Icon size={20} />
      </div>
      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 font-extrabold text-gray-950">
        {value}
      </p>
    </div>
  );
}

function DocumentIcon({ type }: { type: DocumentFile["type"] }) {
  if (type === "store") {
    return <ImageIcon size={22} />;
  }

  if (type === "license") {
    return <FileText size={22} />;
  }

  return <FileCheck2 size={22} />;
}

export default function AdminVerificationDetailPage() {
  const params = useParams<{ id: string }>();
  const store = useMemo(() => {
    return (
      verificationStores.find((verification) => verification.id === params.id) ??
      verificationStores[0]
    );
  }, [params.id]);

  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [adminNote, setAdminNote] = useState(store.recommendation);

  const riskTone =
    store.riskScore >= 55
      ? "text-red-600"
      : store.riskScore >= 35
        ? "text-amber-600"
        : "text-emerald-600";

  const handleApprove = () => {
    setStatus("approved");
    setAdminNote("Ajuan disetujui. Toko dapat mulai mengaktifkan menu surplus.");
  };

  const handleReject = () => {
    setStatus("rejected");
    setAdminNote(
      "Ajuan ditolak sementara. Pemilik perlu mengunggah ulang dokumen yang lebih jelas.",
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900 selection:bg-emerald-200">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-gray-900 text-white shadow-[12px_0_36px_rgba(0,0,0,0.08)] lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <ShieldCheck size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">
                  Surplus<span className="text-emerald-400">Admin</span>
                </p>
                <p className="text-xs font-semibold text-gray-400">
                  Verification Review
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="px-3 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              Navigasi
            </p>
            <Link
              href="/admin/dashboard"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:bg-emerald-500/10 hover:text-white"
            >
              <ReceiptText size={20} className="text-gray-500" />
              Dashboard Admin
            </Link>
            <Link
              href={`/admin/verifications/${store.id}`}
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/10"
            >
              <Building2 size={20} className="text-emerald-400" />
              Detail Verifikasi
            </Link>
          </nav>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72">
          <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  aria-label="Kembali ke dashboard admin"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                    Verification Detail
                  </p>
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-950 md:text-2xl">
                    {store.storeName}
                  </h1>
                </div>
              </div>

              <VerificationBadge status={status} />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gray-950 text-white shadow-[0_14px_34px_rgba(17,24,39,0.18)]">
                        <Store size={28} />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                            {store.category}
                          </span>
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-extrabold text-gray-600">
                            {store.id}
                          </span>
                        </div>
                        <h2 className="truncate text-2xl font-extrabold tracking-tight text-gray-950">
                          {store.storeName}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
                          Ajuan pendaftaran partner masuk pada {store.date}.
                          Admin perlu memeriksa identitas, dokumen, dan kesiapan
                          pickup sebelum toko aktif.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-700">
                      {store.businessType}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InfoItem
                      icon={UserRound}
                      label="Pemilik"
                      value={store.owner}
                    />
                    <InfoItem icon={Mail} label="Email" value={store.email} />
                    <InfoItem icon={Phone} label="Telepon" value={store.phone} />
                    <InfoItem
                      icon={MapPin}
                      label="Kota"
                      value={store.city}
                    />
                    <InfoItem
                      icon={Clock3}
                      label="Pickup"
                      value={store.pickupWindow}
                    />
                    <InfoItem
                      icon={ReceiptText}
                      label="Rekening"
                      value={store.bankAccount}
                    />
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6">
                    <h2 className="text-xl font-extrabold text-gray-950">
                      Dokumen Lampiran
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      Simulasi review dokumen yang diunggah saat pendaftaran
                      partner.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {documentFiles.map((document) => (
                      <div
                        key={document.label}
                        className="rounded-[24px] border border-gray-100 bg-gray-50 p-5"
                      >
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white text-emerald-600">
                            <DocumentIcon type={document.type} />
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${statusClassName[document.status]}`}
                          >
                            {statusLabel[document.status]}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-gray-950">
                          {document.label}
                        </h3>
                        <p className="mt-1 truncate text-xs font-semibold text-gray-500">
                          {document.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6">
                    <h2 className="text-xl font-extrabold text-gray-950">
                      Checklist Review
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      Poin audit dasar sebelum admin mengaktifkan toko.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {checklist.map((item) => (
                      <div
                        key={item.label}
                        className="flex gap-4 rounded-[24px] border border-gray-100 bg-gray-50 p-5"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${statusClassName[item.status]}`}
                        >
                          {item.status === "valid" ? (
                            <Check size={18} />
                          ) : item.status === "warning" ? (
                            <AlertTriangle size={18} />
                          ) : (
                            <XCircle size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-gray-950">
                            {item.label}
                          </h3>
                          <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-500">
                        Risk Score
                      </p>
                      <h2 className={`mt-1 text-4xl font-extrabold ${riskTone}`}>
                        {store.riskScore}
                      </h2>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                      <AlertTriangle size={22} />
                    </div>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        store.riskScore >= 55
                          ? "bg-red-500"
                          : store.riskScore >= 35
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${store.riskScore}%` }}
                    />
                  </div>
                  <p className="mt-4 text-sm leading-6 font-medium text-gray-500">
                    Skor simulasi berdasarkan kelengkapan dokumen, kualitas scan,
                    kategori makanan, dan kecocokan alamat.
                  </p>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Detail Operasional
                  </h2>
                  <div className="mt-5 space-y-4">
                    <div className="border-b border-gray-100 pb-4">
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Alamat
                      </p>
                      <p className="mt-1 text-sm leading-6 font-bold text-gray-900">
                        {store.address}
                      </p>
                    </div>
                    <div className="border-b border-gray-100 pb-4">
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Surplus Harian
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {store.estimatedDailySurplus}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Jam Pickup
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {store.pickupWindow}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Keputusan Admin
                  </h2>
                  <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
                    Status ini masih lokal di UI sampai backend tersedia.
                  </p>

                  <label
                    htmlFor="admin-note"
                    className="mt-5 block text-xs font-extrabold tracking-wider text-gray-400 uppercase"
                  >
                    Catatan Review
                  </label>
                  <textarea
                    id="admin-note"
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />

                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(16,185,129,0.24)] transition-colors hover:bg-emerald-600"
                    >
                      <CheckCircle2 size={17} />
                      Approve & Aktifkan
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <XCircle size={17} />
                      Tolak Ajuan
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
