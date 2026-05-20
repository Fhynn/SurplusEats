"use client";

import {
  CalendarClock,
  CheckCircle2,
  PauseCircle,
  Plus,
  RefreshCcw,
  Save,
  TicketPercent,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type VoucherStatus = "active" | "scheduled" | "expired" | "paused" | "quota_habis";

type AdminVoucher = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount: number;
  minSpend: number;
  quota: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  usedCount: number;
  remainingQuota: number | null;
  status: VoucherStatus;
};

type VoucherFormState = {
  code: string;
  title: string;
  description: string;
  discount: string;
  minSpend: string;
  quota: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

const initialFormState: VoucherFormState = {
  code: "",
  title: "",
  description: "",
  discount: "",
  minSpend: "0",
  quota: "",
  active: true,
  startsAt: "",
  endsAt: "",
};

const statusMeta: Record<
  VoucherStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  active: {
    label: "Aktif",
    className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  scheduled: {
    label: "Terjadwal",
    className: "border-blue-100 bg-blue-50 text-blue-700",
    icon: CalendarClock,
  },
  expired: {
    label: "Expired",
    className: "border-gray-200 bg-gray-100 text-gray-600",
    icon: PauseCircle,
  },
  paused: {
    label: "Nonaktif",
    className: "border-amber-100 bg-amber-50 text-amber-700",
    icon: PauseCircle,
  },
  quota_habis: {
    label: "Kuota Habis",
    className: "border-red-100 bg-red-50 text-red-700",
    icon: PauseCircle,
  },
};

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function formatDate(value: string | null) {
  if (!value) {
    return "Tidak dibatasi";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function dateInputToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function statusBadge(status: VoucherStatus) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ${meta.className}`}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [formState, setFormState] = useState<VoucherFormState>(initialFormState);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const metrics = useMemo(() => {
    const activeCount = vouchers.filter((voucher) => voucher.status === "active").length;
    const usedCount = vouchers.reduce((total, voucher) => total + voucher.usedCount, 0);
    const remainingQuota = vouchers.reduce((total, voucher) => {
      if (voucher.remainingQuota === null) {
        return total;
      }

      return total + voucher.remainingQuota;
    }, 0);

    return {
      activeCount,
      usedCount,
      remainingQuota,
      totalCount: vouchers.length,
    };
  }, [vouchers]);

  const loadVouchers = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/vouchers", { cache: "no-store" });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        vouchers?: AdminVoucher[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Voucher gagal dimuat.");
      }

      setVouchers(data.vouchers ?? []);
      setNotice(null);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Voucher gagal dimuat.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

  const resetForm = () => {
    setFormState(initialFormState);
    setEditingVoucherId(null);
  };

  const fillFormForEdit = (voucher: AdminVoucher) => {
    setEditingVoucherId(voucher.id);
    setFormState({
      code: voucher.code,
      title: voucher.title,
      description: voucher.description ?? "",
      discount: String(voucher.discount),
      minSpend: String(voucher.minSpend),
      quota: voucher.quota === null ? "" : String(voucher.quota),
      active: voucher.active,
      startsAt: toLocalDateTimeInput(voucher.startsAt),
      endsAt: toLocalDateTimeInput(voucher.endsAt),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const payload = {
        code: formState.code.trim().toUpperCase(),
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        discount: Number(formState.discount),
        minSpend: Number(formState.minSpend || 0),
        quota: formState.quota.trim() ? Number(formState.quota) : null,
        active: formState.active,
        startsAt: dateInputToIso(formState.startsAt),
        endsAt: dateInputToIso(formState.endsAt),
      };
      const response = await fetch(
        editingVoucherId
          ? `/api/admin/vouchers/${editingVoucherId}`
          : "/api/admin/vouchers",
        {
          method: editingVoucherId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        voucher?: AdminVoucher;
      };

      if (!response.ok || !data.ok || !data.voucher) {
        throw new Error(data.message || "Voucher gagal disimpan.");
      }

      setNotice({
        type: "success",
        message: editingVoucherId
          ? "Voucher berhasil diperbarui."
          : "Voucher berhasil dibuat.",
      });
      resetForm();
      await loadVouchers();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Voucher gagal disimpan.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (voucher: AdminVoucher) => {
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/vouchers/${voucher.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !voucher.active }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        voucher?: AdminVoucher;
      };

      if (!response.ok || !data.ok || !data.voucher) {
        throw new Error(data.message || "Status voucher gagal diubah.");
      }

      setVouchers((currentVouchers) =>
        currentVouchers.map((item) =>
          item.id === data.voucher?.id ? data.voucher : item,
        ),
      );
      setNotice({
        type: "success",
        message: voucher.active
          ? "Voucher berhasil dinonaktifkan."
          : "Voucher berhasil diaktifkan.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "Status voucher gagal diubah.",
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
              Voucher Control
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
              Kelola Voucher
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500">
              Semua kode voucher di halaman ini tersimpan langsung ke database
              dan dipakai saat checkout customer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadVouchers()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>
      </header>

      {notice ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            notice.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm">
          <TicketPercent size={22} className="mb-4 text-emerald-600" />
          <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
            Total Voucher
          </p>
          <p className="mt-2 text-2xl font-extrabold text-gray-950">
            {metrics.totalCount}
          </p>
        </div>
        <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-5">
          <CheckCircle2 size={22} className="mb-4 text-emerald-700" />
          <p className="text-xs font-extrabold tracking-wider text-emerald-700 uppercase">
            Aktif
          </p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">
            {metrics.activeCount}
          </p>
        </div>
        <div className="rounded-[26px] border border-blue-100 bg-blue-50 p-5">
          <Save size={22} className="mb-4 text-blue-700" />
          <p className="text-xs font-extrabold tracking-wider text-blue-700 uppercase">
            Terpakai
          </p>
          <p className="mt-2 text-2xl font-extrabold text-blue-950">
            {metrics.usedCount}
          </p>
        </div>
        <div className="rounded-[26px] border border-amber-100 bg-amber-50 p-5">
          <CalendarClock size={22} className="mb-4 text-amber-700" />
          <p className="text-xs font-extrabold tracking-wider text-amber-700 uppercase">
            Sisa Kuota
          </p>
          <p className="mt-2 text-2xl font-extrabold text-amber-950">
            {metrics.remainingQuota}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-950">
                {editingVoucherId ? "Edit Voucher" : "Voucher Baru"}
              </h2>
              <p className="mt-1 text-xs font-bold text-gray-400">
                Kode akan dipakai customer di keranjang.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Plus size={20} />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold text-gray-500">
                Kode Voucher
              </span>
              <input
                value={formState.code}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                required
                placeholder="HEMAT20"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-extrabold uppercase outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-extrabold text-gray-500">
                Judul
              </span>
              <input
                value={formState.title}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
                placeholder="Diskon makanan surplus"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-extrabold text-gray-500">
                Deskripsi
              </span>
              <textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Promo untuk customer ResQFood."
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Diskon
                </span>
                <input
                  type="number"
                  min={1000}
                  value={formState.discount}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      discount: event.target.value,
                    }))
                  }
                  required
                  placeholder="10000"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-extrabold outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Minimum Belanja
                </span>
                <input
                  type="number"
                  min={0}
                  value={formState.minSpend}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      minSpend: event.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-extrabold outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Kuota
                </span>
                <input
                  type="number"
                  min={1}
                  value={formState.quota}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      quota: event.target.value,
                    }))
                  }
                  placeholder="Kosong = tanpa batas"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-extrabold outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <span>
                  <span className="block text-xs font-extrabold text-gray-500">
                    Status
                  </span>
                  <span className="text-sm font-extrabold text-gray-950">
                    {formState.active ? "Aktif" : "Nonaktif"}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={formState.active}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 accent-emerald-500"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Mulai
                </span>
                <input
                  type="datetime-local"
                  value={formState.startsAt}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold text-gray-500">
                  Selesai
                </span>
                <input
                  type="datetime-local"
                  value={formState.endsAt}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      endsAt: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Save size={17} />
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </form>

        <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-950">
                Daftar Voucher
              </h2>
              <p className="mt-1 text-xs font-bold text-gray-400">
                Status dan pemakaian dihitung dari data checkout.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Memuat voucher...
            </div>
          ) : vouchers.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Belum ada voucher di database.
            </div>
          ) : (
            <div className="space-y-4">
              {vouchers.map((voucher) => (
                <article
                  key={voucher.id}
                  className="rounded-[24px] border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-950 px-3 py-1 text-xs font-extrabold text-white">
                          {voucher.code}
                        </span>
                        {statusBadge(voucher.status)}
                      </div>
                      <h3 className="text-base font-extrabold text-gray-950">
                        {voucher.title}
                      </h3>
                      <p className="mt-1 max-w-2xl text-xs leading-5 font-medium text-gray-500">
                        {voucher.description || "Tidak ada deskripsi."}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => fillFormForEdit(voucher)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(voucher)}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                          voucher.active
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {voucher.active ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                        {voucher.active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs font-bold md:grid-cols-4">
                    <div className="rounded-2xl bg-white px-4 py-3 text-gray-500">
                      Diskon
                      <span className="mt-1 block text-sm font-extrabold text-gray-950">
                        {formatRp(voucher.discount)}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-gray-500">
                      Minimum
                      <span className="mt-1 block text-sm font-extrabold text-gray-950">
                        {formatRp(voucher.minSpend)}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-gray-500">
                      Pemakaian
                      <span className="mt-1 block text-sm font-extrabold text-gray-950">
                        {voucher.usedCount}
                        {voucher.quota === null ? "" : ` / ${voucher.quota}`}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-gray-500">
                      Berlaku
                      <span className="mt-1 block text-xs font-extrabold text-gray-950">
                        {formatDate(voucher.startsAt)} - {formatDate(voucher.endsAt)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
