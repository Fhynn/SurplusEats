"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  ExternalLink,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";

type VerificationDocument = {
  id: string;
  type: string;
  label: string;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  revision: number;
  asset?: {
    url: string;
    pathname: string;
    contentType: string | null;
    size: number | null;
  } | null;
  revisions: VerificationDocumentRevision[];
};

type VerificationDocumentRevision = {
  id: string;
  revision: number;
  status: string;
  note: string | null;
  event: string;
  createdById: string | null;
  createdAt: string;
  asset?: {
    url: string;
    pathname: string;
    contentType: string | null;
    size: number | null;
  } | null;
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
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  submittedAt: string;
  documents: VerificationDocument[];
  restaurant?: { id: string; name: string; slug: string } | null;
};

type ChecklistState = {
  identityMatches: boolean;
  businessPermitValid: boolean;
  storefrontMatches: boolean;
  pickupLocationValid: boolean;
};

type DocumentReviewDraft = {
  status: "submitted" | "accepted" | "rejected";
  note: string;
};

const emptyChecklist: ChecklistState = {
  identityMatches: false,
  businessPermitValid: false,
  storefrontMatches: false,
  pickupLocationValid: false,
};

const checklistItems: Array<{
  key: keyof ChecklistState;
  title: string;
  description: string;
}> = [
  {
    key: "identityMatches",
    title: "Identitas pemilik sesuai",
    description: "Nama pendaftar, KTP, dan akun owner merujuk orang yang sama.",
  },
  {
    key: "businessPermitValid",
    title: "Dokumen usaha valid",
    description: "NIB atau izin usaha terbaca dan sesuai dengan data toko.",
  },
  {
    key: "storefrontMatches",
    title: "Foto toko sesuai",
    description: "Tampak depan toko cocok dengan usaha dan lokasi pickup.",
  },
  {
    key: "pickupLocationValid",
    title: "Titik pickup dapat digunakan",
    description: "Koordinat maps tersedia dan masuk akal untuk customer.",
  },
];

const rejectionTemplates = [
  "Identitas pemilik belum jelas atau tidak sesuai dengan data pendaftaran.",
  "Dokumen NIB atau izin usaha tidak terbaca, kedaluwarsa, atau tidak sesuai.",
  "Foto tampak depan toko belum menunjukkan lokasi pickup dengan jelas.",
  "Titik lokasi pickup tidak sesuai dengan alamat usaha yang didaftarkan.",
  "Data pengajuan belum lengkap. Silakan perbaiki dokumen yang ditandai lalu kirim ulang.",
] as const;

const requiredDocumentTypes = new Set([
  "IDENTITY",
  "BUSINESS_PERMIT",
  "STOREFRONT_PHOTO",
]);

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

function formatFileSize(size: number | null | undefined) {
  if (!size) {
    return "-";
  }

  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentStatusLabel(status: string) {
  if (status === "accepted") {
    return "Diterima";
  }

  if (status === "rejected") {
    return "Perlu revisi";
  }

  return "Menunggu review";
}

function getDocumentStatusClassName(status: string) {
  if (status === "accepted") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default function AdminVerificationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] =
    useState<RestaurantApplication | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDocuments, setIsSavingDocuments] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"error" | "success">("error");
  const [checklist, setChecklist] =
    useState<ChecklistState>(emptyChecklist);
  const [documentReviewDrafts, setDocumentReviewDrafts] = useState<
    Record<string, DocumentReviewDraft>
  >({});
  const [previewDocument, setPreviewDocument] =
    useState<VerificationDocument | null>(null);

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
      setDocumentReviewDrafts(
        Object.fromEntries(
          data.application.documents.map((document) => [
            document.id,
            {
              status:
                document.status === "accepted" ||
                document.status === "rejected"
                  ? document.status
                  : "submitted",
              note: document.reviewNote || "",
            },
          ]),
        ),
      );
      setChecklist({
        identityMatches:
          data.application.documents.find(
            (document) => document.type === "IDENTITY",
          )?.status === "accepted",
        businessPermitValid:
          data.application.documents.find(
            (document) => document.type === "BUSINESS_PERMIT",
          )?.status === "accepted",
        storefrontMatches:
          data.application.documents.find(
            (document) => document.type === "STOREFRONT_PHOTO",
          )?.status === "accepted",
        pickupLocationValid:
          data.application.latitude !== null &&
          data.application.longitude !== null,
      });
      setNoticeTone("success");
      setNotice(null);
    } catch (error) {
      setNoticeTone("error");
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

  useEffect(() => {
    if (!previewDocument) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewDocument(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewDocument]);

  const requiredDocuments =
    application?.documents.filter((document) =>
      requiredDocumentTypes.has(document.type),
    ) ?? [];
  const allRequiredDocumentsAccepted =
    requiredDocuments.length === requiredDocumentTypes.size &&
    requiredDocuments.every((document) => document.status === "accepted");
  const allChecklistComplete = Object.values(checklist).every(Boolean);
  const canApprove = allRequiredDocumentsAccepted && allChecklistComplete;
  const revisionHistory =
    application?.documents
      .flatMap((document) =>
        document.revisions.map((revision) => ({
          ...revision,
          documentId: document.id,
          documentLabel: document.label,
          documentType: document.type,
        })),
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ) ?? [];

  const updateDocumentDraft = (
    documentId: string,
    update: Partial<DocumentReviewDraft>,
  ) => {
    setDocumentReviewDrafts((current) => ({
      ...current,
      [documentId]: {
        status: current[documentId]?.status || "submitted",
        note: current[documentId]?.note || "",
        ...update,
      },
    }));
  };

  const saveDocumentReviews = async () => {
    if (!application || isSavingDocuments) {
      return;
    }

    const reviews = application.documents
      .map((document) => ({
        document,
        draft: documentReviewDrafts[document.id],
      }))
      .filter(
        (
          item,
        ): item is {
          document: VerificationDocument;
          draft: DocumentReviewDraft;
        } =>
          item.draft?.status === "accepted" ||
          item.draft?.status === "rejected",
      );

    if (reviews.length !== application.documents.length) {
      setNoticeTone("error");
      setNotice("Tentukan status diterima atau revisi untuk seluruh dokumen.");
      return;
    }

    const invalidRejectedDocument = reviews.find(
      ({ draft }) =>
        draft.status === "rejected" && draft.note.trim().length < 5,
    );

    if (invalidRejectedDocument) {
      setNoticeTone("error");
      setNotice(
        `Tulis alasan revisi ${invalidRejectedDocument.document.label} minimal 5 karakter.`,
      );
      return;
    }

    setIsSavingDocuments(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/restaurant-applications/${application.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviews: reviews.map(({ document, draft }) => ({
              documentId: document.id,
              status: draft.status,
              note: draft.note.trim() || undefined,
            })),
          }),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Checklist dokumen gagal disimpan.");
      }

      await loadApplication();
      setNoticeTone("success");
      setNotice("Checklist dokumen berhasil disimpan.");
    } catch (error) {
      setNoticeTone("error");
      setNotice(
        error instanceof Error
          ? error.message
          : "Checklist dokumen gagal disimpan.",
      );
    } finally {
      setIsSavingDocuments(false);
    }
  };

  const reviewApplication = async (status: "APPROVED" | "REJECTED") => {
    if (!application || isSubmitting) {
      return;
    }

    if (status === "APPROVED" && !canApprove) {
      setNoticeTone("error");
      setNotice(
        "Semua dokumen harus diterima dan seluruh checklist wajib dicentang.",
      );
      return;
    }

    if (status === "REJECTED" && adminNote.trim().length < 10) {
      setNoticeTone("error");
      setNotice("Pilih template atau tulis alasan penolakan minimal 10 karakter.");
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const response = await fetch("/api/restaurant-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          status,
          adminNote: adminNote.trim() || undefined,
          checklist,
        }),
      });
      const data = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Review pengajuan gagal.");
      }

      await loadApplication();
      setNoticeTone("success");
      setNotice(
        status === "APPROVED"
          ? "Pengajuan mitra disetujui."
          : "Pengajuan dikembalikan untuk revisi.",
      );
    } catch (error) {
      setNoticeTone("error");
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
        <div
          className={`rounded-2xl border p-4 text-sm font-bold ${
            noticeTone === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
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
                    icon: Banknote,
                    label: "Rekening",
                    value:
                      application.bankName &&
                      application.bankAccountNumber &&
                      application.bankAccountHolder
                        ? `${application.bankName} ${application.bankAccountNumber} a.n. ${application.bankAccountHolder}`
                        : "Belum diisi",
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
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Checklist Dokumen
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    Buka preview, periksa file, lalu tentukan hasil setiap dokumen.
                  </p>
                </div>
                {application.status !== "APPROVED" ? (
                  <button
                    type="button"
                    onClick={() => void saveDocumentReviews()}
                    disabled={isSavingDocuments}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:cursor-wait disabled:bg-gray-300"
                  >
                    <Save size={16} />
                    {isSavingDocuments ? "Menyimpan..." : "Simpan Checklist"}
                  </button>
                ) : null}
              </div>
              {application.documents.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                  Belum ada dokumen yang diunggah untuk pengajuan ini.
                </p>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {application.documents.map((document) => {
                    const draft = documentReviewDrafts[document.id] || {
                      status: "submitted",
                      note: "",
                    };

                    return (
                      <article
                        key={document.id}
                        className="rounded-[24px] border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-gray-950">
                                {document.label}
                              </p>
                              <p className="mt-1 text-xs font-bold text-gray-400">
                                Versi {document.revision} ·{" "}
                                {formatFileSize(document.asset?.size)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold ${getDocumentStatusClassName(
                              document.status,
                            )}`}
                          >
                            {getDocumentStatusLabel(document.status)}
                          </span>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDocument(document)}
                            disabled={!document.asset?.url}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-extrabold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                          >
                            <Eye size={15} />
                            Preview
                          </button>
                          {document.asset?.url ? (
                            <a
                              href={document.asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                              title="Buka file asli"
                            >
                              <Download size={16} />
                            </a>
                          ) : null}
                        </div>

                        {application.status !== "APPROVED" ? (
                          <>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentDraft(document.id, {
                                    status: "accepted",
                                    note: "",
                                  })
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-extrabold transition-colors ${
                                  draft.status === "accepted"
                                    ? "bg-emerald-500 text-white"
                                    : "border border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                <Check size={15} />
                                Terima
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDocumentDraft(document.id, {
                                    status: "rejected",
                                  })
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-extrabold transition-colors ${
                                  draft.status === "rejected"
                                    ? "bg-red-500 text-white"
                                    : "border border-red-100 bg-white text-red-600 hover:bg-red-50"
                                }`}
                              >
                                <X size={15} />
                                Minta revisi
                              </button>
                            </div>
                            {draft.status === "rejected" ? (
                              <textarea
                                value={draft.note}
                                onChange={(event) =>
                                  updateDocumentDraft(document.id, {
                                    note: event.target.value,
                                  })
                                }
                                placeholder="Jelaskan bagian dokumen yang harus diperbaiki..."
                                className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-red-100 bg-white p-3 text-xs leading-5 font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-red-300 focus:ring-4 focus:ring-red-500/10"
                              />
                            ) : null}
                          </>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-950">
                    <History size={20} className="text-emerald-600" />
                    Riwayat Revisi
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    Semua versi upload dan keputusan review tetap tercatat.
                  </p>
                </div>
                <span className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-extrabold text-gray-600">
                  {revisionHistory.length} aktivitas
                </span>
              </div>

              {revisionHistory.length === 0 ? (
                <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                  Riwayat versi belum tersedia untuk dokumen lama.
                </p>
              ) : (
                <div className="space-y-3">
                  {revisionHistory.map((revision) => (
                    <article
                      key={revision.id}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-gray-950">
                          {revision.documentLabel} · Versi {revision.revision}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-500">
                          {revision.event === "REPLACED"
                            ? "File diganti oleh mitra"
                            : revision.event === "REVIEWED"
                              ? `Direview: ${getDocumentStatusLabel(revision.status)}`
                              : "Dokumen pertama dikirim"}
                          {" · "}
                          {formatTime(revision.createdAt)}
                        </p>
                        {revision.note ? (
                          <p className="mt-2 text-xs leading-5 font-semibold text-red-600">
                            {revision.note}
                          </p>
                        ) : null}
                      </div>
                      {revision.asset?.url ? (
                        <a
                          href={revision.asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 transition-colors hover:bg-gray-100"
                        >
                          <Eye size={14} />
                          Lihat versi
                        </a>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="h-fit space-y-6 lg:sticky lg:top-24">
            <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-950">
                Checklist Final
              </h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Seluruh pemeriksaan wajib selesai sebelum restoran diaktifkan.
              </p>

              <div className="mt-5 space-y-3">
                {checklistItems.map((item) => (
                  <label
                    key={item.key}
                    className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ${
                      checklist[item.key]
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={(event) =>
                        setChecklist((current) => ({
                          ...current,
                          [item.key]: event.target.checked,
                        }))
                      }
                      disabled={application.status === "APPROVED"}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
                    />
                    <span>
                      <span className="block text-sm font-extrabold text-gray-950">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 font-semibold text-gray-500">
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div
                className={`mt-5 rounded-2xl border p-4 ${
                  canApprove
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-amber-100 bg-amber-50 text-amber-800"
                }`}
              >
                <div className="flex gap-3">
                  {canApprove ? (
                    <CheckCircle2 size={19} className="shrink-0" />
                  ) : (
                    <ShieldAlert size={19} className="shrink-0" />
                  )}
                  <p className="text-xs leading-5 font-bold">
                    {canApprove
                      ? "Semua persyaratan approval sudah lengkap."
                      : "Simpan review dokumen dan selesaikan checklist final."}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-950">
                Keputusan Admin
              </h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Alasan penolakan akan tampil di halaman status owner.
              </p>

              <div className="mt-5">
                <p className="mb-2 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Template alasan
                </p>
                <div className="flex flex-wrap gap-2">
                  {rejectionTemplates.map((template, index) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setAdminNote(template)}
                      className="rounded-full border border-red-100 bg-red-50 px-3 py-2 text-left text-[11px] font-extrabold text-red-700 transition-colors hover:bg-red-100"
                    >
                      Template {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-5 block text-sm font-extrabold text-gray-700">
                Catatan admin
                <textarea
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Pilih template atau tulis hasil review..."
                />
              </label>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void reviewApplication("APPROVED")}
                  disabled={
                    isSubmitting ||
                    !canApprove ||
                    application.status === "APPROVED"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <CheckCircle2 size={17} />
                  Setujui
                </button>
                <button
                  type="button"
                  onClick={() => void reviewApplication("REJECTED")}
                  disabled={
                    isSubmitting ||
                    adminNote.trim().length < 10 ||
                    application.status === "APPROVED"
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <XCircle size={17} />
                  Minta Revisi
                </button>
              </div>
            </section>
          </aside>
        </section>
      ) : null}

      {previewDocument?.asset?.url ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div className="min-w-0">
                <p className="text-xs font-extrabold tracking-wider text-emerald-600 uppercase">
                  Preview Dokumen · Versi {previewDocument.revision}
                </p>
                <h2 className="mt-1 truncate text-lg font-extrabold text-gray-950">
                  {previewDocument.label}
                </h2>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  {previewDocument.asset.contentType || "File"} ·{" "}
                  {formatFileSize(previewDocument.asset.size)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={previewDocument.asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-950"
                  title="Buka file asli"
                >
                  <ExternalLink size={17} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                  title="Tutup preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
              {previewDocument.asset.contentType === "application/pdf" ? (
                <iframe
                  src={previewDocument.asset.url}
                  title={`Preview ${previewDocument.label}`}
                  className="h-[72vh] w-full rounded-2xl border-0 bg-white"
                />
              ) : (
                <div className="flex min-h-[60vh] items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewDocument.asset.url}
                    alt={previewDocument.label}
                    className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
