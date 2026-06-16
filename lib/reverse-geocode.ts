import type { Coordinates } from "@/lib/geo-distance";

export type ReverseGeocodeResult = {
  label: string;
  addressLine: string;
  source?: "reverse" | "fallback";
};

type ReverseGeocodeResponse = {
  ok: boolean;
  message?: string;
  location?: ReverseGeocodeResult;
};

const reverseGeocodeTimeoutMs = 5000;

export function formatCoordinateLabel(coordinates: Coordinates) {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}

export async function reverseGeocodeCoordinates(
  coordinates: Coordinates,
): Promise<ReverseGeocodeResult | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), reverseGeocodeTimeoutMs);

  try {
    const params = new URLSearchParams({
      latitude: coordinates.latitude.toString(),
      longitude: coordinates.longitude.toString(),
    });
    const response = await fetch(`/api/locations/reverse?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ReverseGeocodeResponse;
    const location = data.location;

    if (
      !data.ok ||
      !location ||
      typeof location.label !== "string" ||
      typeof location.addressLine !== "string"
    ) {
      return null;
    }

    return {
      label: location.label || formatCoordinateLabel(coordinates),
      addressLine:
        location.addressLine || location.label || formatCoordinateLabel(coordinates),
      source: location.source,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
