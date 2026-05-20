import type { Coordinates } from "@/lib/geo-distance";

export type ApiCustomerAddress = {
  label: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
};

export type CustomerLocation = {
  label: string;
  coordinates: Coordinates | null;
  hasSavedAddress: boolean;
};

export const defaultCustomerLocation: CustomerLocation = {
  label: "Pilih lokasi",
  coordinates: null,
  hasSavedAddress: false,
};

function getCoordinates(address: ApiCustomerAddress) {
  if (
    address.latitude === null ||
    address.longitude === null ||
    !Number.isFinite(address.latitude) ||
    !Number.isFinite(address.longitude)
  ) {
    return null;
  }

  return {
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

export function getCustomerLocationFromAddresses(
  addresses: ApiCustomerAddress[] = [],
) {
  const primaryAddress = addresses.find((address) => address.isPrimary);
  const fallbackAddress = primaryAddress ?? addresses[0];
  const coordinateAddress =
    (primaryAddress && getCoordinates(primaryAddress) ? primaryAddress : null) ??
    addresses.find((address) => getCoordinates(address));

  if (coordinateAddress) {
    return {
      label: coordinateAddress.label,
      coordinates: getCoordinates(coordinateAddress),
      hasSavedAddress: true,
    };
  }

  if (fallbackAddress) {
    return {
      label: fallbackAddress.label,
      coordinates: null,
      hasSavedAddress: true,
    };
  }

  return defaultCustomerLocation;
}
