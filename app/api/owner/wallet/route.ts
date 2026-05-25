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
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payoutRequestSchema = z.object({
  amount: z.coerce.number().int().min(10_000).max(50_000_000),
  destination: z.string().trim().min(8).max(160),
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
      transactions: [],
    });
  }

  const walletSummary = getWalletSummary(restaurant.walletTransactions);

  return NextResponse.json({
    ok: true,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
    },
    ...walletSummary,
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

  if (parsed.data.amount > walletSummary.balance) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nominal pencairan melebihi saldo tersedia.",
      },
      { status: 400 },
    );
  }

  const transaction = await prisma.walletTransaction.create({
    data: {
      restaurantId: restaurant.id,
      type: WalletTransactionType.PAYOUT,
      status: WalletTransactionStatus.PENDING,
      amount: -parsed.data.amount,
      reference: createPayoutReference(),
      description: `Request pencairan ke ${parsed.data.destination}`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: session.userId,
      type: NotificationType.SYSTEM,
      title: "Pencairan saldo diajukan",
      body: `${restaurant.name} mengajukan pencairan saldo. Admin akan meninjau permintaan ini.`,
      href: "/owner/wallet",
    },
  });

  return NextResponse.json({ ok: true, transaction }, { status: 201 });
}
