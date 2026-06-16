import { NextResponse } from "next/server";
import { z } from "zod";

import { getCachedJson } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NominatimReverseResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

type ReverseLocationPayload = {
  label: string;
  addressLine: string;
  source: "reverse" | "fallback";
};

const reverseSchema = z.object({
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
});

const reverseGeocodeTimeoutMs = 4500;
const reverseGeocodeCacheTtlMs = 1000 * 60 * 60 * 24 * 14;

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

function formatCoordinateLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
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

function buildFallbackLocation(latitude: number, longitude: number): ReverseLocationPayload {
  const coordinateLabel = formatCoordinateLabel(latitude, longitude);

  return {
    label: coordinateLabel,
    addressLine: coordinateLabel,
    source: "fallback",
  };
}

function toLocationPayload(
  data: NominatimReverseResponse,
  latitude: number,
  longitude: number,
): ReverseLocationPayload {
  const fallback = buildFallbackLocation(latitude, longitude);
  const addressLine = truncateText(data.display_name || "", 220);
  const label = buildShortLabel(data);

  return {
    label: label || fallback.label,
    addressLine: addressLine || label || fallback.addressLine,
    source: addressLine || label ? "reverse" : "fallback",
  };
}

async function fetchReverseLocation(latitude: number, longitude: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), reverseGeocodeTimeoutMs);

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      "accept-language": "id",
      zoom: "18",
      lat: latitude.toString(),
      lon: longitude.toString(),
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          "Accept-Language": "id",
          "User-Agent": "ResQFood/1.0 (https://resqfood.store)",
        },
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Reverse geocode failed with ${response.status}.`);
    }

    return toLocationPayload(
      (await response.json()) as NominatimReverseResponse,
      latitude,
      longitude,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = reverseSchema.safeParse({
    latitude: url.searchParams.get("latitude") ?? url.searchParams.get("lat"),
    longitude: url.searchParams.get("longitude") ?? url.searchParams.get("lon"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Koordinat lokasi tidak valid.",
      },
      { status: 400 },
    );
  }

  const latitude = parsed.data.latitude;
  const longitude = parsed.data.longitude;
  const roundedLatitude = Number(latitude.toFixed(5));
  const roundedLongitude = Number(longitude.toFixed(5));

  try {
    const location = await getCachedJson(
      {
        key: `reverse-geocode:${roundedLatitude}:${roundedLongitude}`,
        ttlMs: reverseGeocodeCacheTtlMs,
      },
      () => fetchReverseLocation(roundedLatitude, roundedLongitude),
    );

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    console.warn("Reverse geocode failed; using coordinate fallback", error);

    return NextResponse.json({
      ok: true,
      location: buildFallbackLocation(latitude, longitude),
    });
  }
}
