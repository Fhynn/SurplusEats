import type { Coordinates } from "@/lib/geo-distance";

export type BestBrowserLocationResult = {
  coordinates: Coordinates;
  accuracy: number | null;
  samples: number;
  timedOut: boolean;
};

type BestBrowserLocationOptions = {
  targetAccuracyMeters?: number;
  maximumAcceptedAccuracyMeters?: number;
  settleMs?: number;
  timeoutMs?: number;
};

function getAccuracy(position: GeolocationPosition) {
  return Number.isFinite(position.coords.accuracy)
    ? position.coords.accuracy
    : Number.POSITIVE_INFINITY;
}

function toLocationResult(
  position: GeolocationPosition,
  samples: number,
  timedOut: boolean,
): BestBrowserLocationResult {
  const accuracy = getAccuracy(position);

  return {
    coordinates: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    },
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    samples,
    timedOut,
  };
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Izinkan akses lokasi browser dulu.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Lokasi perangkat belum tersedia. Pastikan GPS aktif lalu coba lagi.";
  }

  return "Lokasi otomatis belum berhasil. Aktifkan GPS atau lokasi presisi lalu coba lagi.";
}

export function getBestBrowserLocation({
  targetAccuracyMeters = 50,
  maximumAcceptedAccuracyMeters = 150,
  settleMs = 12_000,
  timeoutMs = 22_000,
}: BestBrowserLocationOptions = {}) {
  return new Promise<BestBrowserLocationResult>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Browser belum mendukung akses lokasi."));
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let samples = 0;
    let settled = false;
    let watchId: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      if (settleTimer) {
        clearTimeout(settleTimer);
      }

      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    };

    const finish = (timedOut: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (!bestPosition) {
        reject(
          new Error(
            "Lokasi otomatis belum berhasil. Aktifkan GPS atau lokasi presisi lalu coba lagi.",
          ),
        );
        return;
      }

      if (getAccuracy(bestPosition) > maximumAcceptedAccuracyMeters) {
        reject(
          new Error(
            "Lokasi otomatis belum cukup akurat. Aktifkan GPS atau lokasi presisi lalu coba lagi.",
          ),
        );
        return;
      }

      resolve(toLocationResult(bestPosition, samples, timedOut));
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (settled) {
          return;
        }

        samples += 1;

        if (!bestPosition || getAccuracy(position) < getAccuracy(bestPosition)) {
          bestPosition = position;
        }

        if (getAccuracy(bestPosition) <= targetAccuracyMeters) {
          finish(false);
          return;
        }

        settleTimer ??= setTimeout(() => finish(false), settleMs);
      },
      (error) => {
        if (settled) {
          return;
        }

        if (bestPosition) {
          finish(false);
          return;
        }

        settled = true;
        cleanup();
        reject(new Error(getGeolocationErrorMessage(error)));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutMs,
      },
    );

    timeoutTimer = setTimeout(() => finish(true), timeoutMs);
  });
}

export function getLocationAccuracyNotice(accuracy: number | null) {
  if (accuracy === null) {
    return "Lokasi otomatis tersimpan.";
  }

  const roundedAccuracy = Math.round(accuracy);

  if (roundedAccuracy <= 150) {
    return "Lokasi otomatis tersimpan.";
  }

  return `Lokasi otomatis tersimpan dengan perkiraan akurasi ${roundedAccuracy} m.`;
}
