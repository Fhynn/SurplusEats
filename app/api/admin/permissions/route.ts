import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  adminPermissionGroups,
  allAdminPermissions,
  hasFullAdminAccess,
  isAdminPermission,
  normalizeAdminPermissions,
  requireAdminPermission,
} from "@/lib/admin-permissions";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updatePermissionsSchema = z.object({
  userId: z.string().trim().min(1),
  permissions: z
    .array(
      z.string().refine(isAdminPermission, {
        message: "Permission admin tidak dikenal.",
      }),
    )
    .min(1)
    .max(allAdminPermissions.length),
});

function serializeAdminUser(admin: {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
  adminPermissions: unknown;
}) {
  const permissions = normalizeAdminPermissions(admin.adminPermissions);

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    status: admin.status,
    createdAt: admin.createdAt.toISOString(),
    fullAccess:
      hasFullAdminAccess(admin.adminPermissions) ||
      permissions.length === allAdminPermissions.length,
    permissions,
    permissionCount: permissions.length,
  };
}

export async function GET() {
  const auth = await requireAdminPermission("ADMIN_PERMISSIONS_MANAGE");

  if (auth.response) {
    return auth.response;
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    orderBy: [{ createdAt: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      adminPermissions: true,
    },
  });

  return NextResponse.json({
    ok: true,
    currentAdminId: auth.session.userId,
    permissionGroups: adminPermissionGroups,
    admins: admins.map(serializeAdminUser),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminPermission("ADMIN_PERMISSIONS_MANAGE");

  if (auth.response) {
    return auth.response;
  }

  const parsed = updatePermissionsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data permission admin tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminUserMutation,
    auth.session,
    ["admin-permissions", parsed.data.userId],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  if (parsed.data.userId === auth.session.userId) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Admin tidak bisa mengubah izin dirinya sendiri untuk mencegah lockout.",
      },
      { status: 400 },
    );
  }

  const targetAdmin = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      adminPermissions: true,
    },
  });

  if (!targetAdmin || targetAdmin.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Admin target tidak ditemukan." },
      { status: 404 },
    );
  }

  const nextPermissions = Array.from(new Set(parsed.data.permissions)).filter(
    isAdminPermission,
  );
  const previousPermissions = normalizeAdminPermissions(
    targetAdmin.adminPermissions,
  );
  const updatedAdmin = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const user = await tx.user.update({
      where: { id: targetAdmin.id },
      data: { adminPermissions: nextPermissions },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        adminPermissions: true,
      },
    });

    await tx.adminActionLog.create({
      data: {
        adminId: auth.session.userId,
        action: "ADMIN_PERMISSIONS_UPDATED",
        targetType: "admin_user",
        targetId: targetAdmin.id,
        metadata: {
          targetEmail: targetAdmin.email,
          previousPermissions,
          nextPermissions,
        },
      },
    });

    return user;
  });

  return NextResponse.json({
    ok: true,
    admin: serializeAdminUser(updatedAdmin),
  });
}
