import type { Coordinates } from "@/lib/geo-distance";

const INDONESIA_BOUNDS = {
  minLatitude: -11.2,
  maxLatitude: 6.5,
  minLongitude: 94.5,
  maxLongitude: 141.5,
};

export function hasValidCoordinateRange(
  coordinates: Coordinates | null | undefined,
) {
  return Boolean(
    coordinates &&
      Number.isFinite(coordinates.latitude) &&
      coordinates.latitude >= -90 &&
      coordinates.latitude <= 90 &&
      Number.isFinite(coordinates.longitude) &&
      coordinates.longitude >= -180 &&
      coordinates.longitude <= 180,
  );
}

export function isLikelyPlaceholderCoordinates(coordinates: Coordinates) {
  return (
    Math.abs(coordinates.latitude) < 0.0001 &&
    Math.abs(coordinates.longitude) < 0.0001
  );
}

export function isInsideIndonesiaServiceArea(coordinates: Coordinates) {
  return (
    coordinates.latitude >= INDONESIA_BOUNDS.minLatitude &&
    coordinates.latitude <= INDONESIA_BOUNDS.maxLatitude &&
    coordinates.longitude >= INDONESIA_BOUNDS.minLongitude &&
    coordinates.longitude <= INDONESIA_BOUNDS.maxLongitude
  );
}

export function getStorePickupCoordinateIssue(
  coordinates: Coordinates | null | undefined,
) {
  if (!coordinates) {
    return "Titik lokasi toko wajib diisi.";
  }

  if (!hasValidCoordinateRange(coordinates)) {
    return "Titik lokasi toko tidak valid. Pilih ulang pin toko.";
  }

  if (isLikelyPlaceholderCoordinates(coordinates)) {
    return "Titik lokasi toko masih berada di koordinat kosong. Pilih pin toko yang sebenarnya.";
  }

  if (!isInsideIndonesiaServiceArea(coordinates)) {
    return "Titik lokasi toko terlihat di luar area layanan Indonesia. Pilih pin toko di Indonesia.";
  }

  return null;
}
