"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Save,
  Store,
  UserRound,
} from "lucide-react";

import { LocationMapPicker } from "@/components/location-map-picker";
import { InlineNotice, StateCard } from "@/components/ui-state";
import {
  getBestBrowserLocation,
  getLocationAccuracyNotice,
} from "@/lib/browser-location";
import {
  formatCoordinatesInput,
  parseCoordinatesFromText,
} from "@/lib/maps-coordinate";
import { getStorePickupCoordinateIssue } from "@/lib/location-quality";
import { saveRecentLocation } from "@/lib/recent-locations";
import {
  formatCoordinateLabel,
  reverseGeocodeCoordinates,
} from "@/lib/reverse-geocode";

type OwnerProfile = {
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    description: string | null;
    address: string;
    city: string;
    phone: string | null;
    status: string;
    pickupStart: string | null;
    pickupEnd: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  latestApplication: {
    businessName: string;
    status: string;
    submittedAt: string;
    adminNote: string | null;
  } | null;
};

type LocationDraft = {
  latitude: string;
  longitude: string;
};

const emptyLocationDraft: LocationDraft = {
  latitude: "",
  longitude: "",
};

function getCoordinateError(draft: LocationDraft) {
  const latitude = draft.latitude.trim();
  const longitude = draft.longitude.trim();

  if (!latitude && !longitude) {
    return "Titik lokasi toko wajib diisi. Klik Ambil Lokasi.";
  }

  if (!latitude || !longitude) {
    return "Titik lokasi toko belum lengkap. Klik Ambil Lokasi lagi.";
  }

  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);

  return (
    getStorePickupCoordinateIssue({
      latitude: latitudeNumber,
      longitude: longitudeNumber,
    }) ?? ""
  );
}

export default function OwnerSettingsPage() {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [locationDraft, setLocationDraft] =
    useState<LocationDraft>(emptyLocationDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isLocatingStore, setIsLocatingStore] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mapsInput, setMapsInput] = useState("");
  const [mapsInputError, setMapsInputError] = useState<string | null>(null);
  const coordinateError = getCoordinateError(locationDraft);
  const isSuccessNotice = notice?.toLowerCase().includes("berhasil") ?? false;
  const hasLocationDraftCoordinates = Boolean(
    locationDraft.latitude.trim() && locationDraft.longitude.trim(),
  );
  const locationDraftCoordinates = hasLocationDraftCoordinates
    ? {
        latitude: Number(locationDraft.latitude),
        longitude: Number(locationDraft.longitude),
      }
    : null;
  const locationMapsHref = hasLocationDraftCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        `${locationDraft.latitude.trim()},${locationDraft.longitude.trim()}`,
      )}`
    : "";

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/owner/profile", {
          cache: "no-store",
        });
        const data = (await response.json()) as
          | ({ ok: true } & OwnerProfile)
          | { ok: false; message?: string };

        if (!response.ok || !data.ok) {
          throw new Error(
            ("message" in data ? data.message : undefined) ||
              "Profil owner gagal dimuat.",
          );
        }

        if (!ignore) {
          setProfile(data);
          setLocationDraft({
            latitude: data.restaurant?.latitude?.toString() ?? "",
            longitude: data.restaurant?.longitude?.toString() ?? "",
          });
          setNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setNotice(
            error instanceof Error ? error.message : "Profil owner gagal dimuat.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setNotice("Browser belum mendukung akses lokasi.");
      return;
    }

    setIsLocatingStore(true);
    setNotice(null);

    try {
      const result = await getBestBrowserLocation();

      setLocationDraft(formatCoordinatesInput(result.coordinates));
      setMapsInputError(null);
      setNotice(getLocationAccuracyNotice(result.accuracy));
      void reverseGeocodeCoordinates(result.coordinates).then((geocodedLocation) => {
        const locationLabel =
          geocodedLocation?.label || formatCoordinateLabel(result.coordinates);

        saveRecentLocation({
          source: "store",
          label: locationLabel,
          addressLine: geocodedLocation?.addressLine,
          coordinates: result.coordinates,
        });
        setNotice(`${getLocationAccuracyNotice(result.accuracy)} ${locationLabel}`);
      });
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Lokasi toko gagal diambil. Izinkan akses lokasi browser lalu coba lagi.",
      );
    } finally {
      setIsLocatingStore(false);
    }
  };

  const handleMapsInputChange = (value: string) => {
    setMapsInput(value);

    const coordinates = parseCoordinatesFromText(value);

    if (!coordinates) {
      return;
    }

    setLocationDraft(formatCoordinatesInput(coordinates));
    setMapsInputError(null);
  };

  const handleMapsInputBlur = () => {
    if (!mapsInput.trim() || parseCoordinatesFromText(mapsInput)) {
      setMapsInputError(null);
      return;
    }

    setMapsInputError(
      "Tempel link Google Maps yang berisi pin atau format -6.200000,106.816666.",
    );
  };

  const handleSaveLocation = async () => {
    if (!profile?.restaurant || coordinateError || isSavingLocation) {
      return;
    }

    setIsSavingLocation(true);
    setNotice(null);

    try {
      const response = await fetch("/api/owner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: Number(locationDraft.latitude),
          longitude: Number(locationDraft.longitude),
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        restaurant?: NonNullable<OwnerProfile["restaurant"]>;
      };

      if (!response.ok || !data.ok || !data.restaurant) {
        throw new Error(data.message || "Titik lokasi toko gagal disimpan.");
      }

      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              restaurant: data.restaurant ?? currentProfile.restaurant,
            }
          : currentProfile,
      );
      setNotice("Titik lokasi toko berhasil disimpan.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Titik lokasi toko gagal disimpan.",
      );
    } finally {
      setIsSavingLocation(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
          Owner Settings
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
          Pengaturan Restoran
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Data owner dan restoran mengikuti profil terbaru.
        </p>
      </header>

      {notice ? (
        <InlineNotice
          variant={isSuccessNotice ? "success" : "error"}
          description={notice}
        />
      ) : null}

      {isLoading ? (
        <StateCard
          title="Memuat pengaturan"
          description="Mengambil profil owner, restoran, dan titik pickup."
          variant="loading"
        />
      ) : profile ? (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <UserRound size={24} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-950">
                  {profile.owner.name}
                </h2>
                <p className="text-sm font-bold text-gray-500">Owner</p>
              </div>
            </div>

            <div className="space-y-3 text-sm font-semibold text-gray-600">
              <p className="flex min-w-0 items-center gap-2 break-all">
                <Mail size={17} className="text-gray-400" />
                {profile.owner.email}
              </p>
              <p className="flex min-w-0 items-center gap-2 break-all">
                <Phone size={17} className="text-gray-400" />
                {profile.owner.phone || "-"}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Store size={24} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-950">
                  {profile.restaurant?.name ||
                    profile.latestApplication?.businessName ||
                    "Restoran belum tersedia"}
                </h2>
                <p className="text-sm font-bold text-gray-500">
                  {profile.restaurant?.status ||
                    profile.latestApplication?.status ||
                    "Belum diajukan"}
                </p>
              </div>
            </div>

            {profile.restaurant ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <Building2 size={18} className="mb-3 text-emerald-600" />
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Deskripsi
                    </p>
                    <p className="mt-1 text-sm leading-6 font-bold text-gray-700">
                      {profile.restaurant.description || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <MapPin size={18} className="mb-3 text-emerald-600" />
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Alamat
                    </p>
                    <p className="mt-1 text-sm leading-6 font-bold text-gray-700">
                      {profile.restaurant.address}, {profile.restaurant.city}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <Phone size={18} className="mb-3 text-emerald-600" />
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Telepon Toko
                    </p>
                    <p className="mt-1 text-sm leading-6 font-bold text-gray-700">
                      {profile.restaurant.phone || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <Store size={18} className="mb-3 text-emerald-600" />
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Jam Pickup
                    </p>
                    <p className="mt-1 text-sm leading-6 font-bold text-gray-700">
                      {profile.restaurant.pickupStart || "-"} -{" "}
                      {profile.restaurant.pickupEnd || "-"}
                    </p>
                  </div>
                </div>

                <section className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-950">
                        Titik Lokasi Toko
                      </h3>
                      <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                        Wajib agar customer bisa checkout dan membuka rute pickup.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocatingStore}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-300"
                    >
                      <Navigation size={15} />
                      {isLocatingStore ? "Mengambil..." : "Ambil Lokasi"}
                    </button>
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      hasLocationDraftCoordinates
                        ? "border-emerald-200 bg-white"
                        : coordinateError
                          ? "border-red-100 bg-red-50"
                          : "border-emerald-100 bg-white/80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                            hasLocationDraftCoordinates
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <MapPin size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-gray-950">
                            {hasLocationDraftCoordinates
                              ? "Titik lokasi sudah aktif"
                              : "Titik lokasi belum aktif"}
                          </p>
                          <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                            {hasLocationDraftCoordinates
                              ? "Koordinat toko tersimpan sebagai patokan maps untuk rute pickup."
                              : "Klik Ambil Lokasi di area toko, lalu simpan titik toko."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <LocationMapPicker
                          coordinates={locationDraftCoordinates}
                          onCoordinatesChange={(coordinates) => {
                            setLocationDraft(formatCoordinatesInput(coordinates));
                            setMapsInputError(null);
                            setNotice("Pin peta dipilih. Simpan titik toko untuk menerapkan perubahan.");
                          }}
                          title="Pin Lokasi Toko"
                          description="Klik peta atau geser pin tepat di lokasi pickup toko."
                          recentSource="store"
                        />
                        {locationMapsHref ? (
                          <a
                            href={locationMapsHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            <Navigation size={15} />
                            Buka Maps
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-xs font-extrabold text-gray-700">
                        Link Google Maps / Koordinat Pin
                      </span>
                      <input
                        type="text"
                        value={mapsInput}
                        onChange={(event) =>
                          handleMapsInputChange(event.target.value)
                        }
                        onBlur={handleMapsInputBlur}
                        placeholder="Tempel link Google Maps atau -6.200000,106.816666"
                        className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-xs font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500"
                      />
                    </label>
                    {mapsInputError ? (
                      <p className="mt-2 text-xs leading-5 font-bold text-red-600">
                        {mapsInputError}
                      </p>
                    ) : null}
                    <input type="hidden" value={locationDraft.latitude} readOnly />
                    <input type="hidden" value={locationDraft.longitude} readOnly />
                  </div>

                  {coordinateError ? (
                    <p className="mt-3 text-xs leading-5 font-bold text-red-600">
                      {coordinateError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSaveLocation}
                    disabled={Boolean(coordinateError) || isSavingLocation}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:bg-gray-300 sm:w-auto"
                  >
                    <Save size={16} />
                    {isSavingLocation ? "Menyimpan..." : "Simpan Titik Toko"}
                  </button>
                </section>
              </>
            ) : (
              <StateCard
                title="Restoran belum aktif"
                description="Restoran akan dibuat otomatis setelah admin menyetujui pendaftaran mitra."
                variant="empty"
                size="sm"
              />
            )}
          </div>
        </section>
      ) : (
        <StateCard
          title="Profil owner tidak ditemukan"
          description="Coba login ulang atau hubungi admin jika akun sudah approved."
          variant="empty"
        />
      )}
    </div>
  );
}
