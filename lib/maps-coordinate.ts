import type { Coordinates } from "@/lib/geo-distance";

const coordinateNumberPattern = "-?\\d{1,3}(?:\\.\\d+)?";

function normalizeCoordinateText(value: string) {
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

function isValidCoordinates(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function coordinatesFromMatch(match: RegExpMatchArray | null) {
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function parseCoordinatesFromText(value: string): Coordinates | null {
  const text = normalizeCoordinateText(value);

  if (!text) {
    return null;
  }

  const patterns = [
    new RegExp(`!3d(${coordinateNumberPattern})!4d(${coordinateNumberPattern})`),
    new RegExp(`@(${coordinateNumberPattern}),\\s*(${coordinateNumberPattern})`),
    new RegExp(
      `[?&](?:q|query|destination|origin)=(${coordinateNumberPattern})\\s*,\\s*(${coordinateNumberPattern})`,
    ),
    new RegExp(
      `(?:^|[^\\d])(${coordinateNumberPattern})\\s*,\\s*(${coordinateNumberPattern})(?:$|[^\\d])`,
    ),
  ];

  for (const pattern of patterns) {
    const coordinates = coordinatesFromMatch(text.match(pattern));

    if (coordinates) {
      return coordinates;
    }
  }

  return null;
}

export function formatCoordinatesInput(coordinates: Coordinates) {
  return {
    latitude: coordinates.latitude.toFixed(6),
    longitude: coordinates.longitude.toFixed(6),
  };
}
