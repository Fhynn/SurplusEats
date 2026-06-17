import {
  NotificationType,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createPayoutReference } from "@/lib/backend-utils";
import { getCurrentSession } from "@/lib/auth-session";
import { createNotificationAndDeliver } from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";
import { settleCompletedWalletTransactions } from "@/lib/wallet-settlement";
import {
  buildPayoutDescription,
  getOwnerPayoutFee,
  validateBankAccount,
} from "@/lib/wallet-payout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payoutRequestSchema = z.object({
  amount: z.coerce.number().int().min(10_000).max(50_000_000),
  bankName: z.string().trim().min(2).max(40),
  accountNumber: z.string().trim().min(8).max(30),
  accountHolder: z.string().trim().min(3).max(80),
});

function getWalletSummary(
  transactions: Array<{
    amount: number;
    status: WalletTransactionStatus;
    type: WalletTransactionType;
  }>,
) {
  const completedTotal = transactions
    .filter((item) => item.status === WalletTransactionStatus.COMPLETED)
    .reduce((total, item) => total + item.amount, 0);
  const pendingIncome = transactions
    .filter(
      (item) =>
        item.status === WalletTransactionStatus.PENDING &&
        item.type === WalletTransactionType.ORDER_INCOME,
    )
    .reduce((total, item) => total + item.amount, 0);
  const pendingPayout = Math.abs(
    transactions
      .filter(
        (item) =>
          item.status === WalletTransactionStatus.PENDING &&
          item.type === WalletTransactionType.PAYOUT,
      )
      .reduce((total, item) => total + item.amount, 0),
  );

  return {
    balance: Math.max(0, completedTotal - pendingPayout),
    pending: pendingIncome,
    pendingIncome,
    pendingPayout,
  };
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  await settleCompletedWalletTransactions();

  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: session.userId },
    include: {
      walletTransactions: { orderBy: { createdAt: "desc" } },
      orders: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!restaurant) {
    return NextResponse.json({
      ok: true,
      restaurant: null,
      balance: 0,
      pending: 0,
      pendingIncome: 0,
      pendingPayout: 0,
      payoutFee: getOwnerPayoutFee(),
      transactions: [],
    });
  }

  const walletSummary = getWalletSummary(restaurant.walletTransactions);

  return NextResponse.json({
    ok: true,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      bankName: restaurant.bankName,
      bankAccountNumber: restaurant.bankAccountNumber,
      bankAccountHolder: restaurant.bankAccountHolder,
      bankVerifiedAt: restaurant.bankVerifiedAt,
    },
    ...walletSummary,
    payoutFee: getOwnerPayoutFee(),
    transactions: restaurant.walletTransactions,
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.ownerPayoutRequest,
    session,
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const parsed = payoutRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data pencairan tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const bankValidation = validateBankAccount({
    bankName: parsed.data.bankName,
    accountNumber: parsed.data.accountNumber,
    accountHolder: parsed.data.accountHolder,
  });

  if (!bankValidation.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: bankValidation.errors.join(" "),
      },
      { status: 400 },
    );
  }

  await settleCompletedWalletTransactions();

  const restaurant = await prisma.restaurant.findFirst({
    where: { ownerId: session.userId },
    include: {
      walletTransactions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!restaurant) {
    return NextResponse.json(
      { ok: false, message: "Restoran aktif tidak ditemukan." },
      { status: 404 },
    );
  }

  const walletSummary = getWalletSummary(restaurant.walletTransactions);
  const payoutFee = getOwnerPayoutFee();
  const payoutNetAmount = parsed.data.amount - payoutFee;

  if (parsed.data.amount > walletSummary.balance) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nominal pencairan melebihi saldo tersedia.",
      },
      { status: 400 },
    );
  }

  if (payoutNetAmount <= 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nominal pencairan harus lebih besar dari fee payout.",
      },
      { status: 400 },
    );
  }

  const transaction = await prisma.$transaction(async (tx) => {
    await tx.restaurant.update({
      where: { id: restaurant.id },
      data: {
        bankName: bankValidation.account.bankName,
        bankAccountNumber: bankValidation.account.accountNumber,
        bankAccountHolder: bankValidation.account.accountHolder,
        bankVerifiedAt: new Date(),
      },
    });

    return tx.walletTransaction.create({
      data: {
        restaurantId: restaurant.id,
        type: WalletTransactionType.PAYOUT,
        status: WalletTransactionStatus.PENDING,
        amount: -parsed.data.amount,
        grossAmount: parsed.data.amount,
        platformFee: 0,
        netAmount: -parsed.data.amount,
        payoutFee,
        payoutNetAmount,
        reference: createPayoutReference(),
        bankName: bankValidation.account.bankName,
        bankAccountNumber: bankValidation.account.accountNumber,
        bankAccountHolder: bankValidation.account.accountHolder,
        bankValidationStatus: bankValidation.account.validationStatus,
        description: buildPayoutDescription({
          amount: parsed.data.amount,
          payoutFee,
          payoutNetAmount,
          bankName: bankValidation.account.bankName,
          maskedAccountNumber: bankValidation.account.maskedAccountNumber,
          accountHolder: bankValidation.account.accountHolder,
        }),
      },
    });
  });

  await createNotificationAndDeliver({
    userId: session.userId,
    type: NotificationType.SYSTEM,
    title: "Pencairan saldo diajukan",
    body: `${restaurant.name} mengajukan pencairan saldo. Admin akan meninjau permintaan ini.`,
    href: "/owner/wallet",
  });

  return NextResponse.json({ ok: true, transaction }, { status: 201 });
}
