"use client";

import { useEffect, useState } from "react";
import { Building2, Mail, MapPin, Phone, Store, UserRound } from "lucide-react";

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
  } | null;
  latestApplication: {
    businessName: string;
    status: string;
    submittedAt: string;
    adminNote: string | null;
  } | null;
};

export default function OwnerSettingsPage() {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

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
          Data owner dan restoran diambil dari database.
        </p>
      </header>

      {notice ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
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
              <p className="flex items-center gap-2">
                <Mail size={17} className="text-gray-400" />
                {profile.owner.email}
              </p>
              <p className="flex items-center gap-2">
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
