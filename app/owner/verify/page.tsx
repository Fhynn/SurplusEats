"use client";

import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Store,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { OwnerVerifyActions } from "@/components/owner-verify-actions";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
type RestaurantStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";
type StepTone = "done" | "active" | "pending" | "rejected";

type VerificationDocument = {
  id: string;
  type: string;
  label: string;
  status: string;
};

type OwnerProfileResponse = {
  ok: boolean;
  message?: string;
  owner?: {
    name: string;
    email: string;
    phone: string | null;
  };
  restaurant: {
    name: string;
    status: RestaurantStatus;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    verificationDocuments?: VerificationDocument[];
  } | null;
  latestApplication: {
    id: string;
    applicantName: string;
    businessName: string;
    businessType: string;
    address: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    status: ApplicationStatus;
    adminNote: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    documents: VerificationDocument[];
  } | null;
};

type VerificationStep = {
  title: string;
  description: string;
  status: string;
  tone: StepTone;
};

type DocumentCheck = {
  label: string;
  detail: string;
  icon: LucideIcon;
  status: string;
  className: string;
};

const toneClassNameByStepTone = {
  active: {
    dot: "bg-amber-500 text-white",
    card: "border-amber-100 bg-amber-50",
    title: "text-amber-950",
    status: "bg-white text-amber-600",
  },
  done: {
    dot: "bg-emerald-500 text-white",
    card: "border-emerald-100 bg-emerald-50",
    title: "text-emerald-950",
    status: "bg-white text-emerald-600",
  },
  pending: {
    dot: "bg-gray-200 text-gray-500",
    card: "border-gray-100 bg-white",
    title: "text-gray-900",
    status: "bg-gray-100 text-gray-500",
  },
  rejected: {
    dot: "bg-red-500 text-white",
    card: "border-red-100 bg-red-50",
    title: "text-red-950",
    status: "bg-white text-red-600",
  },
} as const;

const documentMeta: Record<string, { label: string; icon: LucideIcon }> = {
  BUSINESS_PERMIT: {
    label: "Dokumen usaha",
    icon: FileText,
  },
  IDENTITY: {
    label: "Identitas pemilik",
    icon: ShieldCheck,
  },
  STOREFRONT_PHOTO: {
    label: "Foto toko",
    icon: Store,
  },
};

function getStatusCopy(
  profile: OwnerProfileResponse | null,
): {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  topBarClassName: string;
  estimate: string;
  status: string;
} {
  const application = profile?.latestApplication ?? null;
  const restaurant = profile?.restaurant ?? null;

  if (restaurant?.status === "APPROVED") {
    return {
      eyebrow: "Verification Approved",
      title: "Toko Sudah Aktif",
      description:
        "Restoran sudah disetujui admin. Kamu bisa mengelola menu surplus dan menerima order.",
      estimate: "Aktif",
      icon: CheckCircle2,
      iconClassName: "bg-emerald-50 text-emerald-500",
      status: "Disetujui",
      topBarClassName: "bg-emerald-500",
    };
  }

  if (application?.status === "REJECTED") {
    return {
      eyebrow: "Verification Rejected",
      title: "Pengajuan Perlu Diperbaiki",
      description:
        application.adminNote ||
        "Admin belum bisa menyetujui data usaha. Periksa catatan admin dan hubungi support bila perlu.",
      estimate: "Perlu revisi",
      icon: XCircle,
      iconClassName: "bg-red-50 text-red-500",
      status: "Ditolak",
      topBarClassName: "bg-red-500",
    };
  }

  return {
    eyebrow: "Verification Review",
    title: "Menunggu Verifikasi",
    description:
      "Akun restoran sedang diperiksa admin. Dokumen usaha, identitas pemilik, dan lokasi pickup divalidasi sebelum toko aktif menerima order.",
    estimate: "1-2 hari kerja",
    icon: Clock3,
    iconClassName: "bg-amber-50 text-amber-500",
    status: application ? "Dokumen masuk" : "Belum ada pengajuan",
    topBarClassName: "bg-amber-500",
  };
}

function createVerificationSteps(
  profile: OwnerProfileResponse | null,
): VerificationStep[] {
  const application = profile?.latestApplication ?? null;
  const restaurant = profile?.restaurant ?? null;
  const hasLocation = Boolean(
    (application?.latitude !== null && application?.longitude !== null) ||
      (restaurant?.latitude !== null && restaurant?.longitude !== null),
  );
  const isApproved = restaurant?.status === "APPROVED";
  const isRejected = application?.status === "REJECTED";

  return [
    {
      title: "Pendaftaran diterima",
      description: application
        ? `${application.businessName} masuk pada ${new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(new Date(application.submittedAt))}.`
        : "Belum ada data pendaftaran mitra untuk akun ini.",
      status: application ? "Selesai" : "Belum ada",
      tone: application ? "done" : "pending",
    },
    {
      title: "Review dokumen legal",
      description: isRejected
        ? application?.adminNote || "Admin menolak dokumen atau data usaha."
        : isApproved
          ? "Dokumen sudah lolos review admin."
          : "Admin memeriksa izin usaha, identitas, dan foto toko.",
      status: isRejected ? "Ditolak" : isApproved ? "Selesai" : "Diproses",
      tone: isRejected ? "rejected" : isApproved ? "done" : "active",
    },
    {
      title: "Validasi lokasi pickup",
      description: hasLocation
        ? "Titik lokasi pickup sudah tersimpan untuk navigasi customer."
        : "Titik lokasi belum lengkap, admin belum bisa menyetujui toko.",
      status: hasLocation ? "Siap" : "Menunggu",
      tone: hasLocation ? "done" : "pending",
    },
    {
      title: "Dashboard owner aktif",
      description: isApproved
        ? "Dashboard sudah bisa dipakai untuk berjualan."
        : "Dashboard penuh aktif setelah admin menyetujui restoran.",
      status: isApproved ? "Aktif" : "Berikutnya",
      tone: isApproved ? "done" : "pending",
    },
  ];
}

function createDocumentChecks(
  profile: OwnerProfileResponse | null,
): DocumentCheck[] {
  const documents = profile?.latestApplication?.documents ?? [];
  const documentChecks = documents.map((document) => {
    const meta = documentMeta[document.type] ?? {
      label: document.label,
      icon: FileCheck2,
    };

    return {
      label: meta.label,
      detail: document.label,
      icon: meta.icon,
      status: document.status === "pending" ? "Review" : document.status,
      className:
        document.status === "pending"
          ? "bg-amber-50 text-amber-600"
          : "bg-emerald-50 text-emerald-600",
    };
  });
  const application = profile?.latestApplication ?? null;
  const hasLocation = Boolean(
    application?.latitude !== null && application?.longitude !== null,
  );

  return [
    ...documentChecks,
    {
      label: "Lokasi pickup",
      detail: application
        ? `${application.address}, ${application.city}`
        : "Belum ada alamat usaha.",
      icon: MapPin,
      status: hasLocation ? "Siap" : "Kosong",
      className: hasLocation
        ? "bg-blue-50 text-blue-600"
        : "bg-red-50 text-red-600",
    },
    {
      label: "Rekening pencairan",
      detail: "Rekening diverifikasi saat payout pertama diajukan.",
      icon: Banknote,
      status: "Nanti",
      className: "bg-gray-100 text-gray-600",
    },
  ];
}

export default function OwnerVerifyPage() {
  const [profile, setProfile] = useState<OwnerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setIsLoading(true);
      setNotice(null);

      try {
        const response = await fetch("/api/owner/profile", {
          cache: "no-store",
        });
        const data = (await response.json()) as OwnerProfileResponse;

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Status verifikasi gagal dimuat.");
        }

        if (!ignore) {
          setProfile(data);
        }
      } catch (error) {
        if (!ignore) {
          setProfile(null);
          setNotice(
            error instanceof Error
              ? error.message
              : "Status verifikasi gagal dimuat.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  const statusCopy = getStatusCopy(profile);
  const StatusIcon = statusCopy.icon;
  const verificationSteps = useMemo(
    () => createVerificationSteps(profile),
    [profile],
  );
  const documentChecks = useMemo(() => createDocumentChecks(profile), [profile]);

  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-gray-100 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className={`absolute inset-x-0 top-0 h-2 ${statusCopy.topBarClassName}`} />

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)]">
              <Store size={24} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-950">
                {profile?.latestApplication?.businessName || "ResQFood Owner"}
              </p>
              <p className="text-xs font-semibold text-gray-400">
                {profile?.owner?.email || "Status owner"}
              </p>
            </div>
          </div>

          <div
            className={`mb-7 flex h-24 w-24 items-center justify-center rounded-[28px] ${statusCopy.iconClassName}`}
          >
            <StatusIcon size={48} />
          </div>

          <p className="text-xs font-extrabold tracking-[0.22em] text-amber-500 uppercase">
            {statusCopy.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">
            {isLoading ? "Memuat Verifikasi" : statusCopy.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 font-medium text-gray-500">
            {notice || statusCopy.description}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-amber-600 uppercase">
                Estimasi
              </p>
              <p className="mt-1 text-lg font-extrabold text-amber-900">
                {isLoading ? "Memuat" : statusCopy.estimate}
              </p>
            </div>
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-emerald-600 uppercase">
                Status
              </p>
              <p className="mt-1 text-lg font-extrabold text-emerald-900">
                {isLoading ? "Memuat" : statusCopy.status}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-4 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
              {isLoading ? (
                <RefreshCcw size={18} className="animate-spin" />
              ) : (
                <LayoutDashboard size={18} />
              )}
              {profile?.restaurant?.status === "APPROVED"
                ? "Dashboard owner sudah aktif"
                : "Dashboard aktif setelah admin approve"}
            </div>
            <OwnerVerifyActions />
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
                  Tahapan aktivasi akun owner dari data pengajuan terbaru.
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
                      {step.tone === "pending" || step.tone === "active" ? (
                        <Clock3 size={15} />
                      ) : step.tone === "rejected" ? (
                        <XCircle size={16} />
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
                Diambil dari dokumen yang diupload saat daftar mitra.
              </p>
            </div>

            {isLoading ? (
              <div className="rounded-[24px] bg-gray-50 p-6 text-center text-sm font-bold text-gray-500">
                Memuat dokumen...
              </div>
            ) : documentChecks.length === 0 ? (
              <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5">
                <div className="flex gap-3">
                  <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <p className="text-sm leading-6 font-semibold text-amber-800">
                    Belum ada dokumen verifikasi tersimpan untuk akun ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {documentChecks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={`${item.label}-${item.status}`}
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
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
