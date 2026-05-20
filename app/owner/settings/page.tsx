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
    return "Titik lokasi toko wajib diisi.";
  }

  if (!latitude || !longitude) {
    return "Latitude dan longitude lokasi toko harus diisi bersama.";
  }

  const latitudeNumber = Number(latitude);
  const longitudeNumber = Number(longitude);

  if (!Number.isFinite(latitudeNumber) || latitudeNumber < -90 || latitudeNumber > 90) {
    return "Latitude lokasi toko harus berada di antara -90 dan 90.";
  }

  if (
    !Number.isFinite(longitudeNumber) ||
    longitudeNumber < -180 ||
    longitudeNumber > 180
  ) {
    return "Longitude lokasi toko harus berada di antara -180 dan 180.";
  }

  return "";
}

export default function OwnerSettingsPage() {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [locationDraft, setLocationDraft] =
    useState<LocationDraft>(emptyLocationDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isLocatingStore, setIsLocatingStore] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const coordinateError = getCoordinateError(locationDraft);
  const isSuccessNotice = notice?.toLowerCase().includes("berhasil") ?? false;

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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotice("Browser belum mendukung akses lokasi.");
      return;
    }

    setIsLocatingStore(true);
    setNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationDraft({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setIsLocatingStore(false);
      },
      () => {
        setNotice("Lokasi toko gagal diambil. Izinkan akses lokasi atau isi manual.");
        setIsLocatingStore(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 12_000,
      },
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
        <div
          className={`rounded-2xl border p-4 text-sm font-bold ${
            isSuccessNotice
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[28px] border border-gray-100 bg-white p-10 text-center text-sm font-bold text-gray-500 shadow-sm">
          Memuat pengaturan...
        </div>
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

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-extrabold text-gray-700">
                        Latitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={locationDraft.latitude}
                        onChange={(event) =>
                          setLocationDraft((current) => ({
                            ...current,
                            latitude: event.target.value,
                          }))
                        }
                        placeholder="-6.200000"
                        className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300 focus:border-emerald-500"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-extrabold text-gray-700">
                        Longitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={locationDraft.longitude}
                        onChange={(event) =>
                          setLocationDraft((current) => ({
                            ...current,
                            longitude: event.target.value,
                          }))
                        }
                        placeholder="106.816666"
                        className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300 focus:border-emerald-500"
                      />
                    </label>
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
              <p className="rounded-2xl bg-gray-50 p-5 text-sm font-bold text-gray-500">
                Restoran akan dibuat otomatis setelah admin menyetujui
                pendaftaran mitra.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
