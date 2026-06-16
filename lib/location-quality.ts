import type { Coordinates } from "@/lib/geo-distance";

const INDONESIA_BOUNDS = {
  minLatitude: -11.2,
  maxLatitude: 6.5,
  minLongitude: 94.5,
  maxLongitude: 141.5,
};
const minimumCoordinateDecimalPlaces = 4;
const suspiciousDefaultPickupCenters = [
  {
    latitude: -6.175392,
    longitude: 106.827153,
    label: "titik awal peta Jakarta",
  },
] as const;

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

function getDecimalPlaces(value: number) {
  const rawValue = Math.abs(value).toString().toLowerCase();

  if (!rawValue.includes("e")) {
    return rawValue.split(".")[1]?.length ?? 0;
  }

  return value.toFixed(8).replace(/0+$/, "").split(".")[1]?.length ?? 0;
}

export function hasPrecisePickupCoordinates(coordinates: Coordinates) {
  return (
    getDecimalPlaces(coordinates.latitude) >= minimumCoordinateDecimalPlaces &&
    getDecimalPlaces(coordinates.longitude) >= minimumCoordinateDecimalPlaces
  );
}

export function getSuspiciousDefaultPickupCenterLabel(coordinates: Coordinates) {
  const matchingCenter = suspiciousDefaultPickupCenters.find(
    (center) =>
      Math.abs(coordinates.latitude - center.latitude) <= 0.000001 &&
      Math.abs(coordinates.longitude - center.longitude) <= 0.000001,
  );

  return matchingCenter?.label ?? null;
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

  const defaultCenterLabel = getSuspiciousDefaultPickupCenterLabel(coordinates);

  if (defaultCenterLabel) {
    return `Titik lokasi toko terlihat masih di ${defaultCenterLabel}. Cari nama toko/jalan di peta atau aktifkan GPS, lalu pilih pin toko yang sebenarnya.`;
  }

  if (!isInsideIndonesiaServiceArea(coordinates)) {
    return "Titik lokasi toko terlihat di luar area layanan Indonesia. Pilih pin toko di Indonesia.";
  }

  if (!hasPrecisePickupCoordinates(coordinates)) {
    return "Titik lokasi toko terlalu kasar. Gunakan Cari di Peta atau Ambil Lokasi agar pin pickup lebih presisi.";
  }

  return null;
}
