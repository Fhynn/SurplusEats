import { UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession, type AuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const adminPermissionGroups = [
  {
    id: "overview",
    label: "Overview",
    description: "Akses baca dashboard, transaksi, dan audit operasional.",
    permissions: [
      {
        value: "DASHBOARD_VIEW",
        label: "Dashboard",
        description: "Melihat ringkasan admin, metrik, transaksi, dan analytics.",
      },
      {
        value: "TRANSACTIONS_VIEW",
        label: "Transaksi",
        description: "Melihat transaksi, order, dan detail pembayaran.",
      },
      {
        value: "AUDIT_VIEW",
        label: "Audit log",
        description: "Melihat audit trail, security event, dan export audit CSV.",
      },
    ],
  },
  {
    id: "users",
    label: "Pengguna",
    description: "Kontrol akun customer, mitra, session, dan impersonation.",
    permissions: [
      {
        value: "USERS_VIEW",
        label: "Lihat user",
        description: "Melihat detail akun, aktivitas, dan riwayat user.",
      },
      {
        value: "USERS_MANAGE_STATUS",
        label: "Status user",
        description: "Membekukan atau mengaktifkan akun user.",
      },
      {
        value: "USERS_SECURITY",
        label: "Keamanan user",
        description: "Reset password dan mencabut session perangkat user.",
      },
      {
        value: "ADMIN_IMPERSONATE",
        label: "Impersonation",
        description: "Masuk sementara sebagai customer/mitra untuk debugging.",
      },
      {
        value: "ADMIN_PERMISSIONS_MANAGE",
        label: "Izin admin",
        description: "Mengatur permission admin lain.",
      },
    ],
  },
  {
    id: "operations",
    label: "Operasional",
    description: "Aksi review yang memengaruhi toko, refund, support, dan saldo.",
    permissions: [
      {
        value: "VERIFICATIONS_REVIEW",
        label: "Verifikasi mitra",
        description: "Review dokumen, approve, reject, dan revisi pengajuan mitra.",
      },
      {
        value: "REFUNDS_REVIEW",
        label: "Refund",
        description: "Review dan update status refund customer.",
      },
      {
        value: "PAYOUTS_REVIEW",
        label: "Pencairan",
        description: "Approve/reject payout dan mengelola referensi transfer.",
      },
      {
        value: "SUPPORT_MANAGE",
        label: "Support",
        description: "Melihat, assign, dan membalas ticket support.",
      },
    ],
  },
  {
    id: "growth",
    label: "Promo & Pengaturan",
    description: "Konfigurasi kampanye, voucher, notifikasi, dan fee platform.",
    permissions: [
      {
        value: "VOUCHERS_MANAGE",
        label: "Voucher",
        description: "Membuat, mengubah, dan menonaktifkan voucher/campaign.",
      },
      {
        value: "NOTIFICATIONS_MANAGE",
        label: "Notifikasi",
        description: "Mengelola notifikasi admin dan konfigurasi pengiriman.",
      },
      {
        value: "SETTINGS_MANAGE",
        label: "Pengaturan",
        description: "Mengubah fee, notification delivery, cache diagnostics, dan setting admin.",
      },
    ],
  },
] as const;

export const allAdminPermissions = adminPermissionGroups.flatMap((group) =>
  group.permissions.map((permission) => permission.value),
);

export type AdminPermission = (typeof allAdminPermissions)[number];

const allAdminPermissionSet = new Set<string>(allAdminPermissions);

export function isAdminPermission(value: string): value is AdminPermission {
  return allAdminPermissionSet.has(value);
}

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) {
    return [...allAdminPermissions];
  }

  return Array.from(new Set(value.filter((item): item is AdminPermission => {
    return typeof item === "string" && isAdminPermission(item);
  })));
}

export function hasFullAdminAccess(value: unknown) {
  return !Array.isArray(value);
}

export function hasAdminPermissionValue(
  permissions: unknown,
  permission: AdminPermission,
) {
  return hasFullAdminAccess(permissions)
    ? true
    : normalizeAdminPermissions(permissions).includes(permission);
}

export type AdminAuthorization = {
  session: AuthSession;
  user: {
    id: string;
    email: string;
    name: string;
    status: UserStatus;
    adminPermissions: unknown;
  };
  permissions: AdminPermission[];
  response: null;
};

export async function requireAdminPermission(
  requiredPermissions: AdminPermission | AdminPermission[] = [],
): Promise<
  | AdminAuthorization
  | {
      session: AuthSession | null;
      user: null;
      permissions: AdminPermission[];
      response: NextResponse;
    }
> {
  const session = await getCurrentSession();
  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  if (session?.role !== UserRole.ADMIN) {
    return {
      session,
      user: null,
      permissions: [],
      response: NextResponse.json(
        { ok: false, message: "Akses admin diperlukan." },
        { status: session ? 403 : 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      adminPermissions: true,
    },
  });

  if (
    !user ||
    user.role !== UserRole.ADMIN ||
    user.status !== UserStatus.ACTIVE
  ) {
    return {
      session,
      user: null,
      permissions: [],
      response: NextResponse.json(
        { ok: false, message: "Akun admin tidak aktif." },
        { status: 403 },
      ),
    };
  }

  const permissions = normalizeAdminPermissions(user.adminPermissions);
  const missingPermissions = required.filter(
    (permission) => !permissions.includes(permission),
  );

  if (missingPermissions.length > 0) {
    return {
      session,
      user: null,
      permissions,
      response: NextResponse.json(
        {
          ok: false,
          message: "Izin admin tidak cukup untuk aksi ini.",
          missingPermissions,
        },
        { status: 403 },
      ),
    };
  }

  return {
    session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      adminPermissions: user.adminPermissions,
    },
    permissions,
    response: null,
  };
}
