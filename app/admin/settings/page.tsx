"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  Database,
  KeyRound,
  LockKeyhole,
  Mail,
  ReceiptText,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

type ToggleKey =
  | "twoFactor"
  | "refundAlerts"
  | "verificationAlerts"
  | "riskAlerts"
  | "payoutAlerts"
  | "maintenanceMode";

const adminRoles = [
  {
    role: "Super Admin",
    members: 2,
    scope: "Full access",
    permissions: ["Users", "Refund", "Verification", "Payout", "Settings"],
  },
  {
    role: "Operations",
    members: 5,
    scope: "Daily operations",
    permissions: ["Orders", "Verification", "Support"],
  },
  {
    role: "Support",
    members: 8,
    scope: "Customer cases",
    permissions: ["Users", "Refund", "Tickets"],
  },
  {
    role: "Finance",
    members: 3,
    scope: "Wallet and payout",
    permissions: ["Payout", "Transactions", "Reports"],
  },
] as const;

const auditEvents = [
  {
    title: "Refund policy diperbarui",
    actor: "Fhynn Admin",
    time: "16 Mei 2026, 10:22",
  },
  {
    title: "Role Operations ditambah",
    actor: "System Owner",
    time: "15 Mei 2026, 17:40",
  },
  {
    title: "IP allowlist diganti",
    actor: "Security Admin",
    time: "14 Mei 2026, 09:18",
  },
] as const;

function Toggle({
  enabled,
  onClick,
  label,
}: {
  enabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
        enabled ? "bg-emerald-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-gray-100 bg-gray-50 p-5">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-gray-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 font-medium text-gray-500">
            {description}
          </p>
        </div>
      </div>
      <Toggle enabled={enabled} onClick={onToggle} label={title} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    twoFactor: true,
    refundAlerts: true,
    verificationAlerts: true,
    riskAlerts: true,
    payoutAlerts: false,
    maintenanceMode: false,
  });
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [saved, setSaved] = useState(false);

  const handleToggle = (key: ToggleKey) => {
    setToggles((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900 selection:bg-emerald-200">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-gray-900 text-white shadow-[12px_0_36px_rgba(0,0,0,0.08)] lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <ShieldCheck size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight">
                  Surplus<span className="text-emerald-400">Admin</span>
                </p>
                <p className="text-xs font-semibold text-gray-400">
                  Settings Center
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <p className="px-3 text-xs font-extrabold tracking-wider text-gray-500 uppercase">
              Navigasi
            </p>
            <Link
              href="/admin/dashboard"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-400 transition-all hover:bg-emerald-500/10 hover:text-white"
            >
              <ReceiptText size={20} className="text-gray-500" />
              Dashboard Admin
            </Link>
            <Link
              href="/admin/settings"
              className="flex w-full items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/10"
            >
              <Settings size={20} className="text-emerald-400" />
              Pengaturan Admin
            </Link>
          </nav>
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72">
          <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  aria-label="Kembali ke dashboard admin"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-600 uppercase">
                    Admin Settings
                  </p>
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-gray-950 md:text-2xl">
                    Pengaturan Admin
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-500"
              >
                {saved ? <CheckCircle2 size={17} /> : <Save size={17} />}
                {saved ? "Tersimpan" : "Simpan"}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-5 md:p-8">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] bg-gray-950 text-white shadow-[0_14px_34px_rgba(17,24,39,0.18)]">
                        <UserRound size={28} />
                      </div>
                      <div className="min-w-0">
                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                          Super Admin
                        </span>
                        <h2 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-gray-950">
                          Fhynn Admin
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-gray-500">
                          Profil ini mewakili akun admin utama untuk mengatur
                          akses, notifikasi, keamanan, dan preferensi operasional
                          SurplusEats.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-extrabold text-gray-700">
                      Last login 16 Mei 2026, 10:45
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                      <Mail size={21} className="mb-4 text-emerald-600" />
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Email Admin
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-gray-950">
                        admin@surpluseats.example.com
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                      <ShieldCheck size={21} className="mb-4 text-emerald-600" />
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Role
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-gray-950">
                        Platform Owner
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                      <Clock3 size={21} className="mb-4 text-emerald-600" />
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Session Timeout
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-gray-950">
                        {sessionTimeout} menit
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6">
                    <h2 className="text-xl font-extrabold text-gray-950">
                      Keamanan Akun
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      Kontrol keamanan dasar untuk akses dashboard admin.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <SettingRow
                      icon={LockKeyhole}
                      title="Two-factor authentication"
                      description="Minta kode tambahan saat admin masuk ke control center."
                      enabled={toggles.twoFactor}
                      onToggle={() => handleToggle("twoFactor")}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                        <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-gray-950">
                          <Clock3 size={18} className="text-emerald-600" />
                          Session Timeout
                        </span>
                        <select
                          value={sessionTimeout}
                          onChange={(event) => {
                            setSessionTimeout(event.target.value);
                            setSaved(false);
                          }}
                          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10"
                        >
                          <option value="15">15 menit</option>
                          <option value="30">30 menit</option>
                          <option value="60">60 menit</option>
                        </select>
                      </label>
                      <label className="block rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                        <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-gray-950">
                          <KeyRound size={18} className="text-emerald-600" />
                          IP Allowlist
                        </span>
                        <input
                          type="text"
                          defaultValue="103.88.12.0/24, 36.71.44.18"
                          className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6">
                    <h2 className="text-xl font-extrabold text-gray-950">
                      Notifikasi Operasional
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      Pilih sinyal admin yang harus muncul sebagai prioritas.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <SettingRow
                      icon={ReceiptText}
                      title="Refund urgent"
                      description="Kirim alert saat dispute refund melewati SLA review."
                      enabled={toggles.refundAlerts}
                      onToggle={() => handleToggle("refundAlerts")}
                    />
                    <SettingRow
                      icon={Store}
                      title="Verifikasi restoran"
                      description="Kirim alert saat ada pendaftar partner baru."
                      enabled={toggles.verificationAlerts}
                      onToggle={() => handleToggle("verificationAlerts")}
                    />
                    <SettingRow
                      icon={Users}
                      title="Akun berisiko"
                      description="Tandai pola refund, voucher, atau login yang mencurigakan."
                      enabled={toggles.riskAlerts}
                      onToggle={() => handleToggle("riskAlerts")}
                    />
                    <SettingRow
                      icon={WalletCards}
                      title="Payout gagal"
                      description="Kirim notifikasi saat pencairan saldo owner gagal."
                      enabled={toggles.payoutAlerts}
                      onToggle={() => handleToggle("payoutAlerts")}
                    />
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-950">
                        Role & Akses Tim
                      </h2>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        Simulasi pengaturan izin untuk tim operasional admin.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-gray-50 px-4 py-2 text-sm font-extrabold text-gray-600">
                      {adminRoles.length} role
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Member</th>
                          <th className="px-4 py-3">Scope</th>
                          <th className="px-4 py-3">Permission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {adminRoles.map((role) => (
                          <tr key={role.role}>
                            <td className="px-4 py-4 text-sm font-extrabold text-gray-950">
                              {role.role}
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-gray-600">
                              {role.members}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-gray-500">
                              {role.scope}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {role.permissions.map((permission) => (
                                  <span
                                    key={permission}
                                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <aside className="space-y-6">
                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Preferensi Sistem
                  </h2>
                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Timezone
                      </span>
                      <select
                        value={timezone}
                        onChange={(event) => {
                          setTimezone(event.target.value);
                          setSaved(false);
                        }}
                        className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      >
                        <option value="Asia/Jakarta">Asia/Jakarta</option>
                        <option value="Asia/Makassar">Asia/Makassar</option>
                        <option value="Asia/Jayapura">Asia/Jayapura</option>
                      </select>
                    </label>
                    <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-5">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                        <Database size={20} />
                      </div>
                      <p className="text-xs font-extrabold tracking-wider text-gray-400 uppercase">
                        Data Retention
                      </p>
                      <p className="mt-1 text-sm leading-6 font-bold text-gray-900">
                        Audit log disimpan 180 hari pada prototype UI.
                      </p>
                    </div>
                    <SettingRow
                      icon={SlidersHorizontal}
                      title="Maintenance mode"
                      description="Simulasi mode perawatan untuk halaman publik."
                      enabled={toggles.maintenanceMode}
                      onToggle={() => handleToggle("maintenanceMode")}
                    />
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Channel Alert
                  </h2>
                  <div className="mt-5 space-y-3">
                    {[
                      "Email admin utama",
                      "Dashboard notification center",
                      "Webhook operasional internal",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4"
                      >
                        <Bell size={18} className="text-emerald-600" />
                        <span className="text-sm font-bold text-gray-700">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                  <h2 className="text-lg font-extrabold text-gray-950">
                    Audit Terbaru
                  </h2>
                  <div className="mt-5 space-y-4">
                    {auditEvents.map((event) => (
                      <div key={event.title} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                        <p className="text-sm font-extrabold text-gray-950">
                          {event.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {event.actor}
                        </p>
                        <p className="mt-2 text-xs font-bold text-gray-400">
                          {event.time}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
