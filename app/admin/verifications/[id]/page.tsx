"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  XCircle,
} from "lucide-react";

type VerificationDocument = {
  id: string;
  type: string;
  label: string;
  status: string;
  asset?: { url: string; pathname: string } | null;
};

type RestaurantApplication = {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  submittedAt: string;
  documents: VerificationDocument[];
  restaurant?: { id: string; name: string; slug: string } | null;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export default function AdminVerificationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] =
    useState<RestaurantApplication | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/restaurant-applications/${params.id}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        application?: RestaurantApplication;
      };

      if (!response.ok || !data.ok || !data.application) {
        throw new Error(data.message || "Pengajuan tidak ditemukan.");
      }

      setApplication(data.application);
      setAdminNote(data.application.adminNote || "");
      setNotice(null);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Pengajuan gagal dimuat.",
      );
      setApplication(null);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const reviewApplication = async (status: "APPROVED" | "REJECTED") => {
    if (!application || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/restaurant-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          status,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Review pengajuan gagal.");
      }

      await loadApplication();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Review pengajuan gagal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="flex flex-col justify-between gap-4 rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/dashboard?tab=verification"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Kembali"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
              Verification Review
            </p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-gray-950">
              {application?.businessName ||
                (isLoading ? "Memuat pengajuan..." : "Pengajuan tidak ditemukan")}
            </h1>
          </div>
        </div>

        {application ? (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${
              application.status === "APPROVED"
                ? "bg-emerald-50 text-emerald-700"
                : application.status === "REJECTED"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {application.status === "APPROVED" ? (
              <CheckCircle2 size={16} />
            ) : application.status === "REJECTED" ? (
              <XCircle size={16} />
            ) : (
              <Clock3 size={16} />
            )}
            {application.status}
          </span>
        ) : null}
      </header>

      {notice ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
          Memuat pengajuan...
        </div>
      ) : application ? (
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                Data Usaha
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    icon: Building2,
                    label: "Nama Usaha",
                    value: application.businessName,
                  },
                  {
                    icon: Building2,
                    label: "Kategori",
                    value: application.businessType,
                  },
                  {
                    icon: Mail,
                    label: "Email",
                    value: application.email,
                  },
                  {
                    icon: Phone,
                    label: "Telepon",
                    value: application.phone,
                  },
                  {
                    icon: MapPin,
                    label: "Alamat",
                    value: `${application.address}, ${application.city}`,
                  },
                  {
                    icon: Clock3,
                    label: "Diajukan",
                    value: formatTime(application.submittedAt),
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <Icon size={18} className="mb-3 text-emerald-600" />
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      {label}
                    </p>
                    <p className="mt-1 text-sm leading-6 font-extrabold text-gray-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {application.description ? (
                <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm leading-6 font-medium text-gray-600">
                  {application.description}
                </p>
              ) : null}
              {application.latitude !== null && application.longitude !== null ? (
                <a
                  href={getMapsUrl(application.latitude, application.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600"
                >
                  <MapPin size={16} />
                  Buka titik lokasi toko
                  <ExternalLink size={14} />
                </a>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-extrabold text-gray-950">
                Dokumen Upload
              </h2>
              {application.documents.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                  Belum ada dokumen yang diunggah untuk pengajuan ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {application.documents.map((document) => (
                    <a
                      key={document.id}
                      href={document.asset?.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText size={20} className="shrink-0 text-emerald-600" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-gray-950">
                            {document.label}
                          </p>
                          <p className="text-xs font-bold text-gray-400">
                            {document.type}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-gray-600">
                        {document.status}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-gray-950">
              Keputusan Admin
            </h2>
            <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
              Approve akan membuat restoran approved untuk owner terkait.
            </p>
            <label className="mt-5 block text-sm font-extrabold text-gray-700">
              Catatan admin
              <textarea
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-900 outline-none focus:border-emerald-300 focus:bg-white"
                placeholder="Tulis catatan review..."
              />
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => reviewApplication("APPROVED")}
                disabled={isSubmitting}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Setujui
              </button>
              <button
                type="button"
                onClick={() => reviewApplication("REJECTED")}
                disabled={isSubmitting}
                className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-extrabold text-white disabled:bg-gray-300"
              >
                Tolak
              </button>
            </div>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
