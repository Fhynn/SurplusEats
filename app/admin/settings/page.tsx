"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  BellRing,
  Clock3,
  Mail,
  MessageCircle,
  Save,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { InlineNotice, StateCard } from "@/components/ui-state";

type AdminUser = {
  name: string;
  email: string;
  role: string;
};

type AdminLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  admin?: {
    name: string;
    email: string;
  } | null;
};

type PlatformFeeSettings = {
  active: boolean;
  serviceFeeFlat: number;
  serviceFeePercent: number;
  taxFeeFlat: number;
  taxFeePercent: number;
  commissionFlat: number;
  commissionPercent: number;
  minCommission: number;
  updatedAt?: string;
};

type NotificationDeliveryChannelStatus = {
  channel: "email" | "whatsapp";
  label: string;
  provider: string;
  enabled: boolean;
  configured: boolean;
  recipientReady: boolean;
  missing: string[];
};

type NotificationDeliveryStatus = {
  channels: NotificationDeliveryChannelStatus[];
  ready: boolean;
  appBaseUrl: string | null;
  appBaseUrlConfigured: boolean;
  promoExternalEnabled: boolean;
  timeoutMs: number;
};

type NotificationDeliveryResult = {
  channel: "email" | "whatsapp";
  attempted: boolean;
  ok: boolean;
  status?: number;
  skippedReason?: string;
  error?: string;
};

type PlatformFeeForm = {
  active: boolean;
  serviceFeeFlat: string;
  serviceFeePercent: string;
  taxFeeFlat: string;
  taxFeePercent: string;
  commissionFlat: string;
  commissionPercent: string;
  minCommission: string;
};

const defaultFeeForm: PlatformFeeForm = {
  active: true,
  serviceFeeFlat: "2000",
  serviceFeePercent: "0",
  taxFeeFlat: "0",
  taxFeePercent: "0",
  commissionFlat: "0",
  commissionPercent: "0",
  minCommission: "0",
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

function toFeeForm(settings: PlatformFeeSettings): PlatformFeeForm {
  return {
    active: settings.active,
    serviceFeeFlat: String(settings.serviceFeeFlat),
    serviceFeePercent: String(settings.serviceFeePercent),
    taxFeeFlat: String(settings.taxFeeFlat),
    taxFeePercent: String(settings.taxFeePercent),
    commissionFlat: String(settings.commissionFlat),
    commissionPercent: String(settings.commissionPercent),
    minCommission: String(settings.minCommission),
  };
}

function parseFormNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminSettingsPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [feeForm, setFeeForm] = useState<PlatformFeeForm>(defaultFeeForm);
  const [feeNotice, setFeeNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSavingFees, setIsSavingFees] = useState(false);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationDeliveryStatus | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      setIsLoading(true);

      try {
        const [
          meResponse,
          logsResponse,
          feesResponse,
          notificationResponse,
        ] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/admin/logs", { cache: "no-store" }),
          fetch("/api/admin/settings/platform-fees", { cache: "no-store" }),
          fetch("/api/admin/settings/notification-delivery", {
            cache: "no-store",
          }),
        ]);
        const meData = (await meResponse.json()) as {
          ok: boolean;
          user?: AdminUser;
          message?: string;
        };
        const logsData = (await logsResponse.json()) as {
          ok: boolean;
          logs?: AdminLog[];
          message?: string;
        };
        const feesData = (await feesResponse.json()) as {
          ok: boolean;
          settings?: PlatformFeeSettings;
          message?: string;
        };
        const notificationData = (await notificationResponse.json()) as {
          ok: boolean;
          status?: NotificationDeliveryStatus;
          message?: string;
        };

        if (!meResponse.ok || !meData.ok || !meData.user) {
          throw new Error(meData.message || "Admin gagal dimuat.");
        }

        if (!logsResponse.ok || !logsData.ok) {
          throw new Error(logsData.message || "Log admin gagal dimuat.");
        }

        if (!feesResponse.ok || !feesData.ok || !feesData.settings) {
          throw new Error(
            feesData.message || "Pengaturan fee platform gagal dimuat.",
          );
        }

        if (
          !notificationResponse.ok ||
          !notificationData.ok ||
          !notificationData.status
        ) {
          throw new Error(
            notificationData.message ||
              "Pengaturan notifikasi eksternal gagal dimuat.",
          );
        }

        if (!ignore) {
          setAdmin(meData.user);
          setLogs(logsData.logs ?? []);
          setFeeForm(toFeeForm(feesData.settings));
          setNotificationStatus(notificationData.status);
          setNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setNotice(
            error instanceof Error ? error.message : "Pengaturan gagal dimuat.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, []);

  const handleFeeFieldChange = (
    field: keyof PlatformFeeForm,
    value: string | boolean,
  ) => {
    setFeeForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveFees = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingFees(true);
    setFeeNotice(null);

    try {
      const response = await fetch("/api/admin/settings/platform-fees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: feeForm.active,
          serviceFeeFlat: parseFormNumber(feeForm.serviceFeeFlat),
          serviceFeePercent: parseFormNumber(feeForm.serviceFeePercent),
          taxFeeFlat: parseFormNumber(feeForm.taxFeeFlat),
          taxFeePercent: parseFormNumber(feeForm.taxFeePercent),
          commissionFlat: parseFormNumber(feeForm.commissionFlat),
          commissionPercent: parseFormNumber(feeForm.commissionPercent),
          minCommission: parseFormNumber(feeForm.minCommission),
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        settings?: PlatformFeeSettings;
        message?: string;
      };

      if (!response.ok || !data.ok || !data.settings) {
        throw new Error(data.message || "Pengaturan fee gagal disimpan.");
      }

      setFeeForm(toFeeForm(data.settings));
      setFeeNotice({
        type: "success",
        message: data.message || "Pengaturan fee berhasil disimpan.",
      });
    } catch (error) {
      setFeeNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Pengaturan fee gagal disimpan.",
      });
    } finally {
      setIsSavingFees(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    setNotificationNotice(null);

    try {
      const response = await fetch("/api/admin/settings/notification-delivery", {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok: boolean;
        status?: NotificationDeliveryStatus;
        results?: NotificationDeliveryResult[];
        message?: string;
      };

      if (data.status) {
        setNotificationStatus(data.status);
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Test notifikasi gagal dikirim.");
      }

      const deliveredChannels = (data.results ?? [])
        .filter((result) => result.attempted && result.ok)
        .map((result) => (result.channel === "email" ? "Email" : "WhatsApp"));

      setNotificationNotice({
        type: "success",
        message:
          data.message ||
          `Test berhasil dikirim lewat ${deliveredChannels.join(", ")}.`,
      });
    } catch (error) {
      setNotificationNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Test notifikasi gagal dikirim.",
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-5 md:p-8">
      <header className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
          Admin Settings
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
          Pengaturan Admin
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Profil dan audit log mengikuti aktivitas admin terbaru.
        </p>
      </header>

      {notice ? (
        <InlineNotice variant="error" description={notice} />
      ) : null}

      {isLoading ? (
        <StateCard
          title="Memuat pengaturan"
          description="Mengambil profil admin dan audit log."
          variant="loading"
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <UserRound size={24} className="mb-4 text-emerald-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Nama Admin
              </p>
              <p className="mt-2 text-xl font-extrabold text-gray-950">
                {admin?.name || "-"}
              </p>
            </div>
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <Mail size={24} className="mb-4 text-blue-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Email
              </p>
              <p className="mt-2 text-sm font-extrabold text-gray-950">
                {admin?.email || "-"}
              </p>
            </div>
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <ShieldCheck size={24} className="mb-4 text-amber-600" />
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Role
              </p>
              <p className="mt-2 text-xl font-extrabold text-gray-950">
                {admin?.role || "-"}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                  Platform Fee
                </p>
                <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-gray-950">
                  <SlidersHorizontal size={20} className="text-emerald-600" />
                  Fee Checkout & Komisi Mitra
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500">
                  Service fee dan pajak ditambahkan ke customer. Komisi platform
                  dipotong dari saldo mitra saat pembayaran Tripay valid.
                </p>
              </div>
              <label className="flex w-fit items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-700">
                <input
                  type="checkbox"
                  checked={feeForm.active}
                  onChange={(event) =>
                    handleFeeFieldChange("active", event.target.checked)
                  }
                  className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Aktif
              </label>
            </div>

            {feeNotice ? (
              <InlineNotice
                className="mt-5"
                variant={feeNotice.type}
                description={feeNotice.message}
              />
            ) : null}

            <form onSubmit={handleSaveFees} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">
                  Service Fee Tetap
                  <input
                    type="number"
                    min="0"
                    value={feeForm.serviceFeeFlat}
                    onChange={(event) =>
                      handleFeeFieldChange("serviceFeeFlat", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">
                  Service Fee Persen
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="0.1"
                    value={feeForm.serviceFeePercent}
                    onChange={(event) =>
                      handleFeeFieldChange(
                        "serviceFeePercent",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">
                  Pajak Tetap
                  <input
                    type="number"
                    min="0"
                    value={feeForm.taxFeeFlat}
                    onChange={(event) =>
                      handleFeeFieldChange("taxFeeFlat", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">
                  Pajak Persen
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="0.1"
                    value={feeForm.taxFeePercent}
                    onChange={(event) =>
                      handleFeeFieldChange("taxFeePercent", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">
                  Komisi Tetap
                  <input
                    type="number"
                    min="0"
                    value={feeForm.commissionFlat}
                    onChange={(event) =>
                      handleFeeFieldChange("commissionFlat", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">
                  Komisi Persen
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={feeForm.commissionPercent}
                    onChange={(event) =>
                      handleFeeFieldChange(
                        "commissionPercent",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </label>
                <label className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">
                  Minimum Komisi
                  <input
                    type="number"
                    min="0"
                    value={feeForm.minCommission}
                    onChange={(event) =>
                      handleFeeFieldChange("minCommission", event.target.value)
                    }
                    className={inputClassName}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSavingFees}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                <Save size={18} />
                {isSavingFees ? "Menyimpan..." : "Simpan Pengaturan Fee"}
              </button>
            </form>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                  Notifikasi Eksternal
                </p>
                <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-gray-950">
                  <BellRing size={20} className="text-emerald-600" />
                  Email & WhatsApp
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500">
                  Dipakai untuk event penting seperti order, refund, payout,
                  dan verifikasi mitra. Data secret tidak ditampilkan di panel.
                </p>
              </div>
              <button
                type="button"
                disabled={!notificationStatus?.ready || isTestingNotification}
                onClick={handleTestNotification}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                <Send size={18} />
                {isTestingNotification ? "Mengirim..." : "Kirim Tes"}
              </button>
            </div>

            {notificationNotice ? (
              <InlineNotice
                className="mt-5"
                variant={notificationNotice.type}
                description={notificationNotice.message}
              />
            ) : null}

            {notificationStatus ? (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {notificationStatus.channels.map((channel) => {
                    const ChannelIcon =
                      channel.channel === "email" ? Mail : MessageCircle;
                    const isReady =
                      channel.enabled &&
                      channel.configured &&
                      channel.recipientReady;

                    return (
                      <article
                        key={channel.channel}
                        className="rounded-3xl border border-gray-100 bg-gray-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                              <ChannelIcon size={20} />
                            </span>
                            <div>
                              <p className="text-sm font-extrabold text-gray-950">
                                {channel.label}
                              </p>
                              <p className="text-xs font-bold text-gray-400">
                                Provider: {channel.provider}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                              isReady
                                ? "bg-emerald-100 text-emerald-700"
                                : channel.enabled
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {!channel.enabled
                              ? "Nonaktif"
                              : isReady
                                ? "Siap"
                                : "Belum siap"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs font-bold text-gray-500">
                          <p>
                            Konfigurasi:{" "}
                            <span
                              className={
                                channel.configured
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }
                            >
                              {channel.configured ? "Lengkap" : "Belum lengkap"}
                            </span>
                          </p>
                          <p>
                            Kontak admin:{" "}
                            <span
                              className={
                                channel.recipientReady
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }
                            >
                              {channel.recipientReady ? "Siap" : "Belum siap"}
                            </span>
                          </p>
                          {channel.missing.length > 0 ? (
                            <p className="break-words text-amber-700">
                              Kurang: {channel.missing.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      App URL
                    </p>
                    <p className="mt-1 break-words text-sm font-extrabold text-gray-950">
                      {notificationStatus.appBaseUrl || "Belum diatur"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Promo Eksternal
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-gray-950">
                      {notificationStatus.promoExternalEnabled
                        ? "Aktif"
                        : "Nonaktif"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                      Timeout
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-gray-950">
                      {notificationStatus.timeoutMs} ms
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-gray-950">
              <Clock3 size={20} className="text-emerald-600" />
              Audit Log
            </h2>
            {logs.length === 0 ? (
              <StateCard
                title="Belum ada audit log"
                description="Belum ada aksi admin yang tercatat."
                variant="empty"
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <article key={log.id} className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-extrabold text-gray-950">
                          {log.action}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-400">
                          {log.targetType} {log.targetId || ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-gray-400">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
