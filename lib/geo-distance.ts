import type { Food } from "@/lib/customer-data";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;
export const NEARBY_PICKUP_RADIUS_KM = 5;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function hasValidCoordinates(coordinates: Coordinates) {
  return (
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  if (!hasValidCoordinates(from) || !hasValidCoordinates(to)) {
    return null;
  }

  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function getMapsSearchUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function getMapsQueryUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getDirectionsUrl(origin: Coordinates, destination: Coordinates) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
}

export function getPickupRouteUrl(
  origin: Coordinates | null,
  destination: Coordinates | null,
  fallbackQuery: string,
) {
  if (origin && destination) {
    return {
      label: "Rute Pickup",
      url: getDirectionsUrl(origin, destination),
    };
  }

  if (destination) {
    return {
      label: "Buka Maps",
      url: getMapsSearchUrl(destination.latitude, destination.longitude),
    };
  }

  return {
    label: "Arahkan Lokasi",
    url: getMapsQueryUrl(fallbackQuery),
  };
}

export function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round((distanceKm * 1000) / 50) * 50);
    return `${meters} m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceKm)} km`;
}

export function applyFoodDistance(food: Food, origin: Coordinates | null) {
  const destination =
    food.restaurantLatitude !== null &&
    food.restaurantLatitude !== undefined &&
    food.restaurantLongitude !== null &&
    food.restaurantLongitude !== undefined
      ? {
          latitude: food.restaurantLatitude,
          longitude: food.restaurantLongitude,
        }
      : null;

  if (!destination) {
    return {
      ...food,
      distance: "Pin toko belum ada",
      distanceKm: null,
    };
  }

  if (!origin) {
    return {
      ...food,
      distance: "Lokasi belum aktif",
      distanceKm: null,
    };
  }

  const distanceKm = calculateDistanceKm(origin, destination);

  if (distanceKm === null) {
    return {
      ...food,
      distance: "Pin tidak valid",
      distanceKm: null,
    };
  }

  return {
    ...food,
    distance: formatDistance(distanceKm),
    distanceKm,
  };
}

export function hasFoodPickupCoordinates(food: Food) {
  return (
    food.restaurantLatitude !== null &&
    food.restaurantLatitude !== undefined &&
    food.restaurantLongitude !== null &&
    food.restaurantLongitude !== undefined
  );
}

export function isFoodWithinPickupRadius(
  food: Food,
  radiusKm = NEARBY_PICKUP_RADIUS_KM,
) {
  return food.distanceKm !== null && food.distanceKm !== undefined
    ? food.distanceKm <= radiusKm
    : false;
}

export function sortFoodsByDistance(foods: Food[]) {
  return [...foods].sort((firstFood, secondFood) => {
    const firstDistance = firstFood.distanceKm ?? Number.POSITIVE_INFINITY;
    const secondDistance = secondFood.distanceKm ?? Number.POSITIVE_INFINITY;

    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance;
    }

    return secondFood.stock - firstFood.stock;
  });
}
