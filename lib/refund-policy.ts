export type RefundStatusValue =
  | "PENDING"
  | "REVIEWING"
  | "APPROVED"
  | "REJECTED"
  | "PAID";

export type RefundReasonOption = {
  id: string;
  label: string;
  description: string;
  evidenceHint: string;
};

export const refundReviewSlaHours = 24;
export const refundPayoutSlaHours = 24;

export const refundReasonOptions = [
  {
    id: "not_as_described",
    label: "Makanan tidak sesuai deskripsi",
    description: "Item, ukuran, atau komposisi berbeda dari detail menu.",
    evidenceHint: "Foto item dan bukti label pesanan.",
  },
  {
    id: "quality_issue",
    label: "Kualitas makanan tidak layak",
    description: "Makanan rusak, basi, bau, atau kondisi kemasan bermasalah.",
    evidenceHint: "Foto makanan, kemasan, dan kondisi saat diterima.",
  },
  {
    id: "store_closed",
    label: "Restoran membatalkan atau tutup saat pickup",
    description: "Toko tidak melayani pickup sesuai jadwal yang tertera.",
    evidenceHint: "Foto lokasi/toko atau chat dengan pihak toko jika ada.",
  },
  {
    id: "missing_item",
    label: "Item pesanan kurang",
    description: "Jumlah item yang diterima tidak sesuai order.",
    evidenceHint: "Foto semua item yang diterima dan struk order.",
  },
  {
    id: "pickup_code_issue",
    label: "QR atau kode pickup bermasalah",
    description: "Kode tidak bisa diverifikasi walau order valid.",
    evidenceHint: "Screenshot kode pickup dan keterangan dari kasir.",
  },
  {
    id: "other_order_issue",
    label: "Masalah lain terkait pesanan",
    description: "Masalah valid lain yang belum masuk kategori di atas.",
    evidenceHint: "Lampirkan bukti yang paling menjelaskan masalah.",
  },
] as const satisfies RefundReasonOption[];

export const refundAdminDecisionTemplates = [
  "Bukti valid dan refund disetujui sesuai nominal order.",
  "Bukti perlu ditinjau lebih lanjut. Admin meminta kronologi tambahan.",
  "Refund ditolak karena bukti belum cukup atau tidak sesuai ketentuan.",
  "Refund dibayarkan dan status transaksi sudah disesuaikan.",
] as const;

const finalRefundStatuses = new Set<RefundStatusValue>(["REJECTED", "PAID"]);

export function isValidRefundReason(reason: string) {
  return refundReasonOptions.some((option) => option.label === reason);
}

export function getRefundReasonOption(reason: string) {
  return refundReasonOptions.find((option) => option.label === reason) ?? null;
}

export function getRefundStatusLabel(status: RefundStatusValue) {
  const labels: Record<RefundStatusValue, string> = {
    APPROVED: "Disetujui",
    PAID: "Dibayarkan",
    PENDING: "Menunggu review",
    REJECTED: "Ditolak",
    REVIEWING: "Sedang ditinjau",
  };

  return labels[status];
}

export function isFinalRefundStatus(status: RefundStatusValue) {
  return finalRefundStatuses.has(status);
}

export function getRefundReviewDueAt(createdAt: string | Date) {
  const dueAt = new Date(createdAt);
  dueAt.setHours(dueAt.getHours() + refundReviewSlaHours);

  return dueAt;
}

export function getRefundPayoutDueAt(reviewedAt: string | Date | null) {
  if (!reviewedAt) {
    return null;
  }

  const dueAt = new Date(reviewedAt);
  dueAt.setHours(dueAt.getHours() + refundPayoutSlaHours);

  return dueAt;
}

export function getRefundSlaState({
  createdAt,
  reviewedAt,
  status,
  now = new Date(),
}: {
  createdAt: string | Date;
  reviewedAt?: string | Date | null;
  status: RefundStatusValue;
  now?: Date;
}) {
  if (status === "APPROVED") {
    const payoutDueAt = getRefundPayoutDueAt(reviewedAt ?? null);

    return {
      dueAt: payoutDueAt,
      isBreached: payoutDueAt ? now > payoutDueAt : false,
      label: payoutDueAt
        ? `Pembayaran maksimal ${refundPayoutSlaHours} jam setelah disetujui`
        : "Menunggu waktu approval",
    };
  }

  if (isFinalRefundStatus(status)) {
    return {
      dueAt: null,
      isBreached: false,
      label: "SLA selesai",
    };
  }

  const reviewDueAt = getRefundReviewDueAt(createdAt);

  return {
    dueAt: reviewDueAt,
    isBreached: now > reviewDueAt,
    label: `Review maksimal ${refundReviewSlaHours} jam setelah pengajuan`,
  };
}
