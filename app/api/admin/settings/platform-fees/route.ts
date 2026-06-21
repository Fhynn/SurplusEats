import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/lib/admin-permissions";
import {
  getPlatformFeeSettings,
  normalizePlatformFeeSettings,
  platformFeeSettingId,
} from "@/lib/platform-fees";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const platformFeeSettingsSchema = z.object({
  active: z.boolean().optional(),
  serviceFeeFlat: z.coerce.number().int().min(0).max(100_000),
  serviceFeePercent: z.coerce.number().min(0).max(25),
  taxFeeFlat: z.coerce.number().int().min(0).max(100_000),
  taxFeePercent: z.coerce.number().min(0).max(25),
  commissionFlat: z.coerce.number().int().min(0).max(100_000),
  commissionPercent: z.coerce.number().min(0).max(50),
  minCommission: z.coerce.number().int().min(0).max(100_000),
});

async function requireAdmin() {
  return requireAdminPermission("SETTINGS_MANAGE");
}

export async function GET() {
  const { response } = await requireAdmin();

  if (response) {
    return response;
  }

  const settings = await getPlatformFeeSettings();

  return NextResponse.json({ ok: true, settings });
}

export async function PUT(request: Request) {
  const { session, response } = await requireAdmin();

  if (response) {
    return response;
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminSettingsMutation,
    session,
    ["platform-fees"],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = platformFeeSettingsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pengaturan fee tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const nextSettings = normalizePlatformFeeSettings({
    ...parsed.data,
    id: platformFeeSettingId,
    active: parsed.data.active ?? true,
    updatedById: session.userId,
  });

  const settings = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const updatedSettings = await tx.platformFeeSetting.upsert({
      where: { id: platformFeeSettingId },
      update: {
        active: nextSettings.active,
        serviceFeeFlat: nextSettings.serviceFeeFlat,
        serviceFeePercent: nextSettings.serviceFeePercent,
        taxFeeFlat: nextSettings.taxFeeFlat,
        taxFeePercent: nextSettings.taxFeePercent,
        commissionFlat: nextSettings.commissionFlat,
        commissionPercent: nextSettings.commissionPercent,
        minCommission: nextSettings.minCommission,
        updatedById: session.userId,
      },
      create: {
        id: platformFeeSettingId,
        active: nextSettings.active,
        serviceFeeFlat: nextSettings.serviceFeeFlat,
        serviceFeePercent: nextSettings.serviceFeePercent,
        taxFeeFlat: nextSettings.taxFeeFlat,
        taxFeePercent: nextSettings.taxFeePercent,
        commissionFlat: nextSettings.commissionFlat,
        commissionPercent: nextSettings.commissionPercent,
        minCommission: nextSettings.minCommission,
        updatedById: session.userId,
      },
    });

    await tx.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: "UPDATE_PLATFORM_FEE_SETTINGS",
        targetType: "platform_fee_setting",
        targetId: platformFeeSettingId,
        metadata: {
          active: updatedSettings.active,
          serviceFeeFlat: updatedSettings.serviceFeeFlat,
          serviceFeePercent: updatedSettings.serviceFeePercent,
          taxFeeFlat: updatedSettings.taxFeeFlat,
          taxFeePercent: updatedSettings.taxFeePercent,
          commissionFlat: updatedSettings.commissionFlat,
          commissionPercent: updatedSettings.commissionPercent,
          minCommission: updatedSettings.minCommission,
        },
      },
    });

    return updatedSettings;
  });

  return NextResponse.json({
    ok: true,
    settings: normalizePlatformFeeSettings(settings),
    message: "Pengaturan fee berhasil disimpan.",
  });
}
