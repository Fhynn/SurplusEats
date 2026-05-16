import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      transactions: [],
    });
  }

  const completedIncome = restaurant.walletTransactions
    .filter((item) => item.status === "COMPLETED")
    .reduce((total, item) => total + item.amount, 0);
  const pending = restaurant.walletTransactions
    .filter((item) => item.status === "PENDING")
    .reduce((total, item) => total + item.amount, 0);

  return NextResponse.json({
    ok: true,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
    },
    balance: completedIncome,
    pending,
    transactions: restaurant.walletTransactions,
  });
}
