"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Fingerprint,
  RefreshCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InlineNotice, StateCard } from "@/components/ui-state";

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  admin: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type FilterOption = {
  value: string;
  count: number;
};

type AuditResponse = {
  ok: boolean;
  message?: string;
  logs?: AuditLog[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters?: {
    actions: FilterOption[];
    targetTypes: FilterOption[];
  };
  metrics?: {
    total: number;
    latestSecurityLogAt: string | null;
  };
};

type AuditFilters = {
  q: string;
  action: string;
  targetType: string;
  actor: string;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: AuditFilters = {
  q: "",
  action: "all",
  targetType: "all",
  actor: "",
  dateFrom: "",
  dateTo: "",
};

const inputClassName =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getActionTone(action: string) {
  if (
    action.includes("RATE_LIMIT") ||
    action.includes("SECURITY") ||
    action.includes("IMPERSONATION") ||
    action.includes("PASSWORD")
  ) {
    return "border-red-100 bg-red-50 text-red-700";
  }

  if (action.includes("DATA_INTEGRITY") || action.includes("REFUND")) {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  if (action.includes("APPROVED") || action.includes("COMPLETED")) {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function getMetadataPreview(metadata: unknown) {
  if (!metadata) {
    return "Tidak ada metadata";
  }

  const text = JSON.stringify(metadata);

  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function buildQuery(filters: AuditFilters, page: number, limit = 25) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") {
      params.set(key, value);
    }
  });

  return params;
}

export default function AdminAuditPage() {
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<AuditFilters>(defaultFilters);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionOptions, setActionOptions] = useState<FilterOption[]>([]);
  const [targetTypeOptions, setTargetTypeOptions] = useState<FilterOption[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [latestSecurityLogAt, setLatestSecurityLogAt] = useState<string | null>(
    null,
  );
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLogs = useCallback(
    async (page = 1, nextFilters = appliedFilters) => {
      setIsLoading(true);
      setNotice(null);

      try {
        const response = await fetch(
          `/api/admin/logs?${buildQuery(nextFilters, page).toString()}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as AuditResponse;

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Audit log gagal dimuat.");
        }

        setLogs(data.logs ?? []);
        setPagination(
          data.pagination ?? {
            page,
            limit: 25,
            total: 0,
            totalPages: 1,
          },
        );
        setActionOptions(data.filters?.actions ?? []);
        setTargetTypeOptions(data.filters?.targetTypes ?? []);
        setLatestSecurityLogAt(data.metrics?.latestSecurityLogAt ?? null);
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "Audit log gagal dimuat.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [appliedFilters],
  );

  useEffect(() => {
    void loadLogs(1, appliedFilters);
  }, [loadLogs, appliedFilters]);

  const highRiskCount = useMemo(
    () =>
      logs.filter(
        (log) =>
          log.action.includes("RATE_LIMIT") ||
          log.action.includes("SECURITY") ||
          log.action.includes("DATA_INTEGRITY") ||
          log.action.includes("IMPERSONATION"),
      ).length,
    [logs],
  );

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const exportCsv = async () => {
    setIsExporting(true);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/admin/logs?${buildQuery(appliedFilters, 1, 1000).toString()}&export=csv`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Export audit log gagal.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `resqfood-audit-logs-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Export audit log gagal.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-emerald-600 uppercase">
              <Fingerprint size={16} />
              Audit Trail
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950">
              Log Aktivitas Admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
              Pantau aksi admin, security event, rekonsiliasi data, dan perubahan
              operasional penting.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Total
              </p>
              <p className="mt-1 text-xl font-black text-gray-950">
                {pagination.total}
              </p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-xs font-extrabold tracking-wider text-red-400 uppercase">
                Risk View
              </p>
              <p className="mt-1 text-xl font-black text-red-700">
                {highRiskCount}
              </p>
            </div>
            <div className="col-span-2 rounded-2xl bg-emerald-50 p-4 sm:col-span-1">
              <p className="text-xs font-extrabold tracking-wider text-emerald-500 uppercase">
                Security
              </p>
              <p className="mt-1 text-xs font-black text-emerald-800">
                {latestSecurityLogAt
                  ? formatDateTime(latestSecurityLogAt)
                  : "Belum ada event"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              <Search size={14} />
              Cari
            </span>
            <input
              value={filters.q}
              onChange={(event) =>
                setFilters((current) => ({ ...current, q: event.target.value }))
              }
              className={inputClassName}
              placeholder="Action, target, actor..."
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              <Filter size={14} />
              Action
            </span>
            <select
              value={filters.action}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  action: event.target.value,
                }))
              }
              className={inputClassName}
            >
              <option value="all">Semua action</option>
              {actionOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value} ({item.count})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              <ShieldAlert size={14} />
              Target
            </span>
            <select
              value={filters.targetType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  targetType: event.target.value,
                }))
              }
              className={inputClassName}
            >
              <option value="all">Semua target</option>
              {targetTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value} ({item.count})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              Actor
            </span>
            <input
              value={filters.actor}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  actor: event.target.value,
                }))
              }
              className={inputClassName}
              placeholder="Nama atau email admin"
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              <CalendarDays size={14} />
              Dari
            </span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
              className={inputClassName}
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              <CalendarDays size={14} />
              Sampai
            </span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
              className={inputClassName}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700"
            >
              <Filter size={16} />
              Terapkan
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-extrabold text-gray-700 transition hover:bg-gray-50"
            >
              <RefreshCcw size={16} />
              Reset
            </button>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={isExporting}
            className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            {isExporting ? "Export..." : "Export CSV"}
          </button>
        </div>
      </section>

      {notice ? <InlineNotice variant="error" description={notice} /> : null}

      <section className="rounded-[28px] border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
        {isLoading ? (
          <StateCard
            title="Memuat audit log"
            description="Mengambil aktivitas admin terbaru."
            variant="loading"
            size="sm"
          />
        ) : logs.length === 0 ? (
          <StateCard
            title="Audit log kosong"
            description="Tidak ada log yang cocok dengan filter."
            variant="empty"
          />
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => setSelectedLog(log)}
                className="motion-press w-full rounded-3xl border border-gray-100 bg-white p-4 text-left transition hover:border-emerald-100 hover:bg-emerald-50/40"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-black ${getActionTone(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-black text-gray-500">
                        {log.targetType}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-sm font-extrabold text-gray-950">
                      {log.targetId || log.id}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 font-semibold text-gray-500">
                      {getMetadataPreview(log.metadata)}
                    </p>
                  </div>
                  <div className="shrink-0 text-left lg:text-right">
                    <p className="text-xs font-black text-gray-700">
                      {log.admin?.name || "System"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">
                      {log.admin?.email || "system"}
                    </p>
                    <p className="mt-2 text-xs font-bold text-gray-400">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-gray-500">
            Halaman {pagination.page} dari {pagination.totalPages} -{" "}
            {pagination.total} log
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadLogs(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1 || isLoading}
              className="motion-press inline-flex min-h-10 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                void loadLogs(
                  Math.min(pagination.totalPages, pagination.page + 1),
                )
              }
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="motion-press inline-flex min-h-10 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm sm:items-center">
          <section className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-wider text-emerald-600 uppercase">
                  Detail Audit
                </p>
                <h2 className="mt-2 text-xl font-black text-gray-950">
                  {selectedLog.action}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="motion-press rounded-2xl border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50"
                aria-label="Tutup detail audit"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Actor
                </p>
                <p className="mt-1 text-sm font-black text-gray-950">
                  {selectedLog.admin?.name || "System"}
                </p>
                <p className="mt-1 text-xs font-bold text-gray-500">
                  {selectedLog.admin?.email || "system"}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Waktu
                </p>
                <p className="mt-1 text-sm font-black text-gray-950">
                  {formatDateTime(selectedLog.createdAt)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Target
                </p>
                <p className="mt-1 text-sm font-black text-gray-950">
                  {selectedLog.targetType}
                </p>
                <p className="mt-1 break-all text-xs font-bold text-gray-500">
                  {selectedLog.targetId || "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                  Log ID
                </p>
                <p className="mt-1 break-all text-xs font-black text-gray-950">
                  {selectedLog.id}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-gray-950 p-4">
              <p className="mb-3 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                Metadata
              </p>
              <pre className="max-h-[360px] overflow-auto text-xs leading-5 font-semibold whitespace-pre-wrap text-emerald-100">
                {selectedLog.metadata
                  ? JSON.stringify(selectedLog.metadata, null, 2)
                  : "null"}
              </pre>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
