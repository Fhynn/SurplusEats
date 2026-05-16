"use client";

import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  Home,
  MapPin,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MobileDeviceFrame } from "@/components/mobile-device-frame";

type AddressKind = "home" | "office";

type SavedAddress = {
  id: string;
  label: string;
  detail: string;
  note: string;
  kind: AddressKind;
  isPrimary: boolean;
};

type AddressDraft = {
  label: string;
  detail: string;
  note: string;
  kind: AddressKind;
};

type ApiAddress = {
  id: string;
  label: string;
  addressLine: string;
  notes: string | null;
  isPrimary: boolean;
};

const emptyDraft: AddressDraft = {
  label: "",
  detail: "",
  note: "",
  kind: "home",
};

function mapApiAddress(address: ApiAddress): SavedAddress {
  return {
    id: address.id,
    label: address.label,
    detail: address.addressLine,
    note: address.notes ?? "",
    kind: address.label.toLowerCase().includes("kantor") ? "office" : "home",
    isPrimary: address.isPrimary,
  };
}

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<SavedAddress | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isDraftInvalid = !draft.label.trim() || !draft.detail.trim();

  const loadAddresses = useCallback(async () => {
    setIsLoadingAddresses(true);

    try {
      const response = await fetch("/api/addresses", { cache: "no-store" });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        addresses?: ApiAddress[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Alamat gagal dimuat.");
      }

      setAddresses((data.addresses || []).map(mapApiAddress));
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Alamat gagal dimuat.");
    } finally {
      setIsLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const handleOpenAdd = () => {
    setDraft(emptyDraft);
    setEditingAddressId(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (address: SavedAddress) => {
    setDraft({
      label: address.label,
      detail: address.detail,
      note: address.note,
      kind: address.kind,
    });
    setEditingAddressId(address.id);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingAddressId(null);
    setDraft(emptyDraft);
  };

  const handleSaveAddress = async () => {
    if (isDraftInvalid) {
      return;
    }

    const normalizedDraft = {
      label: draft.label.trim(),
      detail: draft.detail.trim(),
      note: draft.note.trim(),
      kind: draft.kind,
    };

    setIsSavingAddress(true);

    try {
      const response = await fetch(
        editingAddressId ? `/api/addresses/${editingAddressId}` : "/api/addresses",
        {
          method: editingAddressId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(normalizedDraft),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Alamat gagal disimpan.");
      }

      await loadAddresses();
      handleCloseEditor();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Alamat gagal disimpan.",
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetPrimary = async (addressId: string) => {
    try {
      const response = await fetch(`/api/addresses/${addressId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPrimary: true }),
      });

      if (!response.ok) {
        throw new Error("Alamat utama gagal diperbarui.");
      }

      await loadAddresses();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Alamat utama gagal diperbarui.",
      );
    }
  };

  const handleDeleteAddress = async () => {
    if (!deletingAddress) {
      return;
    }

    try {
      const response = await fetch(`/api/addresses/${deletingAddress.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Alamat gagal dihapus.");
      }

      await loadAddresses();
      setDeletingAddress(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Alamat gagal dihapus.");
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-[#f8fafc]">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 pt-10 pb-4 shadow-sm">
          <div className="flex min-w-0 items-center">
            <Link
              href="/profile/settings"
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label="Kembali ke pengaturan akun"
            >
              <ChevronLeft size={24} className="text-gray-800" />
            </Link>
            <div className="ml-2 min-w-0">
              <h1 className="text-lg font-extrabold text-gray-900">
                Alamat Tersimpan
              </h1>
              <p className="mt-0.5 text-xs font-medium text-gray-500">
                {addresses.length} alamat tersimpan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
            aria-label="Tambah alamat"
          >
            <Plus size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {notice ? (
            <section className="rounded-[24px] border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {notice}
            </section>
          ) : null}

          {isLoadingAddresses ? (
            <section className="rounded-[28px] border border-gray-100 bg-white p-7 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
              <h2 className="text-lg font-extrabold text-gray-950">
                Memuat alamat
              </h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Data diambil dari akun customer yang sedang login.
              </p>
            </section>
          ) : null}

          {!isLoadingAddresses && addresses.length === 0 ? (
            <section className="rounded-[28px] border border-dashed border-emerald-200 bg-white p-7 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-50 text-emerald-600">
                <MapPin size={30} />
              </div>
              <h2 className="text-lg font-extrabold text-gray-950">
                Belum ada alamat
              </h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Tambahkan alamat pickup favorit agar checkout lebih cepat.
              </p>
            </section>
          ) : null}

          {!isLoadingAddresses && addresses.map((address) => {
            const isHome = address.kind === "home";
            const Icon = isHome ? Home : Building2;

            return (
              <article
                key={address.id}
                className={`relative rounded-[24px] bg-white p-5 ${
                  address.isPrimary
                    ? "border-2 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]"
                    : "border border-gray-200 shadow-sm"
                }`}
              >
                {address.isPrimary ? (
                  <div className="absolute top-4 right-4 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-extrabold tracking-wider text-emerald-600 uppercase">
                    Utama
                  </div>
                ) : null}

                <div className="mb-3 flex items-start gap-3 pr-16">
                  <div
                    className={`rounded-full p-2 ${
                      address.isPrimary
                        ? "bg-emerald-100"
                        : isHome
                          ? "bg-emerald-50"
                          : "bg-blue-50"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={
                        address.isPrimary
                          ? "text-emerald-600"
                          : isHome
                            ? "text-emerald-600"
                            : "text-blue-600"
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold text-gray-900">
                      {address.label}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      {address.detail}
                    </p>
                    {address.note ? (
                      <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-5 font-semibold text-gray-500">
                        {address.note}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                  {!address.isPrimary ? (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(address.id)}
                      className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 py-2 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-100"
                    >
                      Jadikan Utama
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(address)}
                    className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingAddress(address)}
                    className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-100"
                    aria-label={`Hapus alamat ${address.label}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-emerald-300 bg-emerald-50/50 py-4 text-sm font-bold text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            <Plus size={18} />
            Tambah Alamat Baru
          </button>
        </div>

        {isEditorOpen ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm">
            <div className="w-full rounded-t-[40px] bg-white px-6 pt-5 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-200" />

              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                    Address
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-gray-950">
                    {editingAddressId ? "Edit Alamat" : "Tambah Alamat"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                  aria-label="Tutup editor alamat"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "home" as const, label: "Rumah", icon: Home },
                    { key: "office" as const, label: "Kantor", icon: Building2 },
                  ].map(({ key, label, icon: Icon }) => {
                    const isSelected = draft.kind === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            kind: key,
                            label:
                              currentDraft.label.trim() === ""
                                ? label
                                : currentDraft.label,
                          }))
                        }
                        className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-extrabold transition-colors ${
                          isSelected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={17} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Label
                  </span>
                  <input
                    type="text"
                    value={draft.label}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Contoh: Rumah, Kantor, Kos"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Alamat Lengkap
                  </span>
                  <textarea
                    value={draft.detail}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        detail: event.target.value,
                      }))
                    }
                    placeholder="Tulis alamat lengkap dan patokan utama."
                    className="min-h-28 w-full resize-none rounded-[24px] border border-gray-200 bg-gray-50 p-4 text-sm leading-6 font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-gray-800">
                    Catatan Kurir
                  </span>
                  <input
                    type="text"
                    value={draft.note}
                    onChange={(event) =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Contoh: pagar hitam, lantai 2, titip resepsionis"
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isDraftInvalid || isSavingAddress}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                >
                  <Save size={17} />
                  {isSavingAddress ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deletingAddress ? (
          <div className="absolute inset-0 z-50 flex items-end bg-gray-950/35 backdrop-blur-sm">
            <div className="w-full rounded-t-[36px] bg-white px-6 pt-6 pb-8 shadow-[0_-24px_70px_rgba(15,23,42,0.22)]">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2 size={30} />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-gray-950">
                  Hapus Alamat?
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 font-medium text-gray-500">
                  Alamat {deletingAddress.label} akan dihapus dari daftar alamat
                  tersimpan.
                </p>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingAddress(null)}
                  className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAddress}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-red-600"
                >
                  <CheckCircle2 size={17} />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
