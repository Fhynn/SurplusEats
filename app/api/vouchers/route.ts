import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const vouchers = await prisma.voucher.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: {
      redemptions: {
        where: { userId: session.userId },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    vouchers: vouchers.map((voucher, index) => ({
      id: voucher.id,
      code: voucher.code,
      tone: ["emerald", "blue", "amber", "gray"][index % 4],
      label: formatRp(voucher.discount),
      discount: voucher.discount,
      title: voucher.title,
      description: voucher.description || "Voucher aktif SurplusEats.",
      meta: voucher.endsAt
        ? `Berlaku sampai ${new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(voucher.endsAt)}`
        : "Sedang aktif",
      minSpend:
        voucher.minSpend > 0
          ? `Minimum transaksi ${formatRp(voucher.minSpend)}`
          : "Tanpa minimum transaksi",
      minSpendAmount: voucher.minSpend,
      terms: [
        "Berlaku untuk akun customer yang sedang login.",
        "Tidak bisa digabung dengan voucher lain pada order yang sama.",
        "Kuota dan masa berlaku mengikuti data voucher di database.",
      ],
      status: voucher.redemptions.length > 0 ? "used" : "available",
    })),
  });
}
