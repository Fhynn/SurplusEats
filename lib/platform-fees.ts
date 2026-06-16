import { prisma } from "@/lib/prisma";

export const platformFeeSettingId = "default";

export type PlatformFeeSettings = {
  id: string;
  active: boolean;
  serviceFeeFlat: number;
  serviceFeePercent: number;
  taxFeeFlat: number;
  taxFeePercent: number;
  commissionFlat: number;
  commissionPercent: number;
  minCommission: number;
  updatedById: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type CheckoutFeeBreakdown = {
  serviceFee: number;
  taxFee: number;
  customerFeeTotal: number;
  merchantCommission: number;
  platformFeeTotal: number;
};

type PlatformFeeClient = Pick<typeof prisma, "platformFeeSetting">;

export const defaultPlatformFeeSettings: PlatformFeeSettings = {
  id: platformFeeSettingId,
  active: true,
  serviceFeeFlat: 2000,
  serviceFeePercent: 0,
  taxFeeFlat: 0,
  taxFeePercent: 0,
  commissionFlat: 0,
  commissionPercent: 0,
  minCommission: 0,
  updatedById: null,
};

function nonNegativeInt(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function nonNegativePercent(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function percentageFee(amount: number, percent: number) {
  if (amount <= 0 || percent <= 0) {
    return 0;
  }

  return Math.ceil((amount * percent) / 100);
}

export function normalizePlatformFeeSettings(
  settings: Partial<PlatformFeeSettings> | null | undefined,
): PlatformFeeSettings {
  return {
    ...defaultPlatformFeeSettings,
    ...settings,
    active: settings?.active ?? defaultPlatformFeeSettings.active,
    serviceFeeFlat: nonNegativeInt(
      settings?.serviceFeeFlat ?? defaultPlatformFeeSettings.serviceFeeFlat,
    ),
    serviceFeePercent: nonNegativePercent(
      settings?.serviceFeePercent ??
        defaultPlatformFeeSettings.serviceFeePercent,
    ),
    taxFeeFlat: nonNegativeInt(
      settings?.taxFeeFlat ?? defaultPlatformFeeSettings.taxFeeFlat,
    ),
    taxFeePercent: nonNegativePercent(
      settings?.taxFeePercent ?? defaultPlatformFeeSettings.taxFeePercent,
    ),
    commissionFlat: nonNegativeInt(
      settings?.commissionFlat ?? defaultPlatformFeeSettings.commissionFlat,
    ),
    commissionPercent: nonNegativePercent(
      settings?.commissionPercent ??
        defaultPlatformFeeSettings.commissionPercent,
    ),
    minCommission: nonNegativeInt(
      settings?.minCommission ?? defaultPlatformFeeSettings.minCommission,
    ),
    updatedById: settings?.updatedById ?? null,
  };
}

export async function getPlatformFeeSettings(
  client: PlatformFeeClient = prisma,
) {
  const settings = await client.platformFeeSetting.findUnique({
    where: { id: platformFeeSettingId },
  });

  return normalizePlatformFeeSettings(settings);
}

export function calculateCheckoutFees({
  amount,
  settings,
}: {
  amount: number;
  settings: PlatformFeeSettings;
}): CheckoutFeeBreakdown {
  const baseAmount = nonNegativeInt(amount);

  if (!settings.active) {
    return {
      serviceFee: 0,
      taxFee: 0,
      customerFeeTotal: 0,
      merchantCommission: 0,
      platformFeeTotal: 0,
    };
  }

  const serviceFee =
    settings.serviceFeeFlat +
    percentageFee(baseAmount, settings.serviceFeePercent);
  const taxFee =
    settings.taxFeeFlat + percentageFee(baseAmount, settings.taxFeePercent);
  const rawCommission =
    settings.commissionFlat +
    percentageFee(baseAmount, settings.commissionPercent);
  const merchantCommission =
    rawCommission > 0
      ? Math.min(baseAmount, Math.max(rawCommission, settings.minCommission))
      : 0;

  return {
    serviceFee,
    taxFee,
    customerFeeTotal: serviceFee + taxFee,
    merchantCommission,
    platformFeeTotal: serviceFee + taxFee + merchantCommission,
  };
}
