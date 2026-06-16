import type { PrismaTransactionClient } from "@/lib/prisma";

export async function lockVoucherRedemption(
  tx: PrismaTransactionClient,
  voucherId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`resqfood:voucher:${voucherId}`}))`;
}

export async function claimVoucherForUser(
  tx: PrismaTransactionClient,
  {
    voucherId,
    userId,
  }: {
    voucherId: string;
    userId: string;
  },
) {
  await lockVoucherRedemption(tx, voucherId);

  const existingClaim = await tx.voucherRedemption.findFirst({
    where: {
      voucherId,
      userId,
      orderId: null,
    },
    select: { id: true },
  });

  if (existingClaim) {
    return { claimId: existingClaim.id, created: false };
  }

  const claim = await tx.voucherRedemption.create({
    data: {
      voucherId,
      userId,
    },
    select: { id: true },
  });

  return { claimId: claim.id, created: true };
}

export async function redeemVoucherClaimForOrder(
  tx: PrismaTransactionClient,
  {
    claimId,
    voucherId,
    userId,
    orderId,
  }: {
    claimId: string;
    voucherId: string;
    userId: string;
    orderId: string;
  },
) {
  const redeemedClaim = await tx.voucherRedemption.updateMany({
    where: {
      id: claimId,
      voucherId,
      userId,
      orderId: null,
    },
    data: {
      orderId,
      redeemedAt: new Date(),
    },
  });

  if (redeemedClaim.count !== 1) {
    throw new Error("Voucher sudah dipakai atau klaim voucher tidak valid.");
  }
}
