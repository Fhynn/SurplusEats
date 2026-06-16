import { calculateDistanceKm, type Coordinates } from "@/lib/geo-distance";

export type RecentLocationSource = "customer" | "store";

export type RecentLocation = {
  id: string;
  source: RecentLocationSource;
  label: string;
  addressLine?: string;
  coordinates: Coordinates;
  updatedAt: string;
};

const storageKey = "resqfood:recent-locations:v1";
const maxLocationsPerSource = 6;
const sameLocationThresholdKm = 0.05;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createLocationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRecentLocation(value: unknown): value is RecentLocation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const location = value as Partial<RecentLocation>;

  return Boolean(
    (location.source === "customer" || location.source === "store") &&
      typeof location.label === "string" &&
      location.coordinates &&
      Number.isFinite(location.coordinates.latitude) &&
      Number.isFinite(location.coordinates.longitude) &&
      typeof location.updatedAt === "string",
  );
}

function readAllRecentLocations() {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const parsed = JSON.parse(storage.getItem(storageKey) || "[]") as unknown;

    return Array.isArray(parsed)
      ? parsed.filter(isRecentLocation).sort((first, second) =>
          second.updatedAt.localeCompare(first.updatedAt),
        )
      : [];
  } catch {
    return [];
  }
}

function writeAllRecentLocations(locations: RecentLocation[]) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(locations));
  } catch {
    // Recent location is a convenience cache; app flow must keep working if it fails.
  }
}

export function readRecentLocations(source?: RecentLocationSource) {
  return readAllRecentLocations().filter((location) =>
    source ? location.source === source : true,
  );
}

export function saveRecentLocation({
  source,
  label,
  addressLine,
  coordinates,
}: {
  source: RecentLocationSource;
  label: string;
  addressLine?: string;
  coordinates: Coordinates;
}) {
  const allLocations = readAllRecentLocations();
  const normalizedLabel = label.trim() || "Lokasi terakhir";
  const now = new Date().toISOString();
  const nextLocation: RecentLocation = {
    id: createLocationId(),
    source,
    label: normalizedLabel,
    addressLine: addressLine?.trim() || undefined,
    coordinates,
    updatedAt: now,
  };
  const otherLocations = allLocations.filter((location) => {
    if (location.source !== source) {
      return true;
    }

    const distanceKm = calculateDistanceKm(location.coordinates, coordinates);

    return distanceKm === null || distanceKm > sameLocationThresholdKm;
  });
  const sameSourceLocations = [
    nextLocation,
    ...otherLocations.filter((location) => location.source === source),
  ].slice(0, maxLocationsPerSource);
  const nextLocations = [
    ...sameSourceLocations,
    ...otherLocations.filter((location) => location.source !== source),
  ].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

  writeAllRecentLocations(nextLocations);

  return nextLocation;
}
