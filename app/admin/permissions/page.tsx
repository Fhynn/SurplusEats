"use client";

import {
  CheckCircle2,
  RefreshCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InlineNotice, StateCard } from "@/components/ui-state";

type PermissionItem = {
  value: string;
  label: string;
  description: string;
};

type PermissionGroup = {
  id: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
};

type AdminAccount = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  fullAccess: boolean;
  permissions: string[];
  permissionCount: number;
};

type PermissionsResponse = {
  ok: boolean;
  message?: string;
  currentAdminId?: string;
  permissionGroups?: PermissionGroup[];
  admins?: AdminAccount[];
};

type NoticeState = {
  type: "success" | "error";
  message: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminPermissionsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>(
    [],
  );
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const allPermissions = useMemo(
    () => permissionGroups.flatMap((group) => group.permissions),
    [permissionGroups],
  );
  const selectedAdmin = admins.find((admin) => admin.id === selectedAdminId);
  const isSelfSelected = selectedAdminId === currentAdminId;
  const selectedPermissionSet = useMemo(
    () => new Set(draftPermissions),
    [draftPermissions],
  );

  const loadPermissions = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/permissions", {
        cache: "no-store",
      });
      const data = (await response.json()) as PermissionsResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Permission admin gagal dimuat.");
      }

      const nextAdmins = data.admins ?? [];

      setAdmins(nextAdmins);
      setPermissionGroups(data.permissionGroups ?? []);
      setCurrentAdminId(data.currentAdminId ?? "");
      setSelectedAdminId((current) => current || nextAdmins[0]?.id || "");
      setNotice(null);
    } catch (error) {
      setAdmins([]);
      setPermissionGroups([]);
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Permission admin gagal dimuat.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  useEffect(() => {
    if (selectedAdmin) {
      setDraftPermissions(selectedAdmin.permissions);
    }
  }, [selectedAdmin]);

  const togglePermission = (permission: string) => {
    setDraftPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const selectAllPermissions = () => {
    setDraftPermissions(allPermissions.map((permission) => permission.value));
  };

  const selectReadOnlyPreset = () => {
    setDraftPermissions([
      "DASHBOARD_VIEW",
      "TRANSACTIONS_VIEW",
      "USERS_VIEW",
      "AUDIT_VIEW",
    ]);
  };

  const savePermissions = async () => {
    if (!selectedAdmin || isSelfSelected || draftPermissions.length === 0) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedAdmin.id,
          permissions: draftPermissions,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        admin?: AdminAccount;
      };

      if (!response.ok || !data.ok || !data.admin) {
        throw new Error(data.message || "Permission admin gagal disimpan.");
      }

      setAdmins((current) =>
        current.map((admin) =>
          admin.id === data.admin!.id ? data.admin! : admin,
        ),
      );
      setNotice({
        type: "success",
        message: "Permission admin berhasil diperbarui.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Permission admin gagal disimpan.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-emerald-600 uppercase">
              <ShieldCheck size={16} />
              Granular Access
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950">
              Izin Admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
              Batasi akses admin berdasarkan area kerja. Admin lama tetap full
              access sampai kamu mengatur permission eksplisit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadPermissions()}
            disabled={isLoading}
            className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {notice ? (
        <InlineNotice variant={notice.type} description={notice.message} />
      ) : null}

      {isLoading ? (
        <StateCard
          title="Memuat izin admin"
          description="Mengambil daftar admin dan permission matrix."
          variant="loading"
        />
      ) : admins.length === 0 ? (
        <StateCard
          title="Belum ada admin"
          description="Tidak ada akun admin yang bisa diatur."
          variant="empty"
        />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 px-1">
              <UserCog size={20} className="text-emerald-600" />
              <h2 className="text-lg font-extrabold text-gray-950">
                Admin Account
              </h2>
            </div>
            <div className="space-y-3">
              {admins.map((admin) => (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => setSelectedAdminId(admin.id)}
                  className={`motion-press w-full rounded-3xl border p-4 text-left transition ${
                    selectedAdminId === admin.id
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-gray-100 bg-gray-50 hover:border-emerald-100 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-gray-950">
                        {admin.name}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-gray-500">
                        {admin.email}
                      </p>
                    </div>
                    {admin.id === currentAdminId ? (
                      <span className="rounded-full bg-gray-950 px-2.5 py-1 text-[10px] font-black text-white">
                        Kamu
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-gray-500">
                      {admin.status}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700">
                      {admin.fullAccess
                        ? "Full access"
                        : `${admin.permissionCount} izin`}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-gray-400">
                      {formatDate(admin.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            {selectedAdmin ? (
              <>
                <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Mengatur izin
                    </p>
                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      {selectedAdmin.name}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-gray-500">
                      {selectedAdmin.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      disabled={isSelfSelected}
                      className="motion-press inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Full access
                    </button>
                    <button
                      type="button"
                      onClick={selectReadOnlyPreset}
                      disabled={isSelfSelected}
                      className="motion-press inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SlidersHorizontal size={14} />
                      Read only
                    </button>
                  </div>
                </div>

                {isSelfSelected ? (
                  <div className="mt-5">
                    <InlineNotice
                      variant="info"
                      description="Izin akun admin yang sedang login tidak bisa diubah dari halaman ini untuk mencegah lockout."
                    />
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {permissionGroups.map((group) => (
                    <article
                      key={group.id}
                      className="rounded-3xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="mb-4">
                        <h3 className="text-sm font-black text-gray-950">
                          {group.label}
                        </h3>
                        <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                          {group.description}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {group.permissions.map((permission) => {
                          const checked = selectedPermissionSet.has(
                            permission.value,
                          );

                          return (
                            <label
                              key={permission.value}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                                checked
                                  ? "border-emerald-100 bg-white"
                                  : "border-transparent bg-white/60 hover:bg-white"
                              } ${isSelfSelected ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isSelfSelected}
                                onChange={() =>
                                  togglePermission(permission.value)
                                }
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-black text-gray-900">
                                  {permission.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 font-semibold text-gray-500">
                                  {permission.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold text-gray-500">
                    {draftPermissions.length} dari {allPermissions.length} izin
                    dipilih.
                  </p>
                  <button
                    type="button"
                    onClick={() => void savePermissions()}
                    disabled={
                      isSelfSelected ||
                      isSaving ||
                      draftPermissions.length === 0
                    }
                    className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                  >
                    <Save size={16} />
                    {isSaving ? "Menyimpan..." : "Simpan Izin"}
                  </button>
                </div>
              </>
            ) : (
              <StateCard
                title="Pilih admin"
                description="Pilih salah satu akun admin untuk melihat permission."
                variant="empty"
              />
            )}
          </div>
        </section>
      )}
    </main>
  );
}
