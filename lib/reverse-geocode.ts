import type { Coordinates } from "@/lib/geo-distance";

export type ReverseGeocodeResult = {
  label: string;
  addressLine: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

const reverseGeocodeTimeoutMs = 2500;

function truncateText(value: string, maxLength: number) {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function uniqueParts(parts: Array<string | undefined>) {
  const seen = new Set<string>();

  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const key = part.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildShortLabel(response: NominatimReverseResponse) {
  const address = response.address ?? {};
  const parts = uniqueParts([
    address.road,
    address.neighbourhood,
    address.suburb,
    address.village,
    address.city_district,
    address.city,
    address.town,
    address.county,
    address.state,
  ]);

  if (parts.length > 0) {
    return truncateText(parts.slice(0, 3).join(", "), 80);
  }

  return truncateText(response.display_name || "Lokasi aktif", 80);
}

export function formatCoordinateLabel(coordinates: Coordinates) {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

export async function reverseGeocodeCoordinates(
  coordinates: Coordinates,
): Promise<ReverseGeocodeResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), reverseGeocodeTimeoutMs);

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      "accept-language": "id",
      zoom: "18",
      lat: coordinates.latitude.toString(),
      lon: coordinates.longitude.toString(),
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as NominatimReverseResponse;
    const addressLine = truncateText(data.display_name || "", 220);
    const label = buildShortLabel(data);

    if (!addressLine && !label) {
      return null;
    }

    return {
      label: label || formatCoordinateLabel(coordinates),
      addressLine: addressLine || label || formatCoordinateLabel(coordinates),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
