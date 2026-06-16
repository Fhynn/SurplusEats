export const reviewReportReasons = [
  "Konten tidak pantas",
  "Spam atau promosi",
  "Tidak sesuai pengalaman toko",
  "Mengandung data pribadi",
  "Lainnya",
] as const;

export const maxReviewImages = 4;

export const reviewImageContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ReviewReportReason = (typeof reviewReportReasons)[number];

export function isValidReviewImageContentType(contentType: string | null) {
  return reviewImageContentTypes.includes(
    contentType as (typeof reviewImageContentTypes)[number],
  );
}

export function normalizeReviewSort(value: string | null) {
  if (value === "oldest") return "oldest";
  if (value === "highest") return "highest";
  if (value === "lowest") return "lowest";
  if (value === "helpful") return "helpful";
  return "latest";
}

export function normalizeReviewRatingFilter(value: string | null) {
  const rating = Number(value);

  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}
