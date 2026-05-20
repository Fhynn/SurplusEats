import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

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

const claimVoucherSchema = z.object({
  code: z.string().trim().min(3).max(40),
});

function isVoucherUsableNow(voucher: {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  const now = Date.now();

  return (
    voucher.active &&
    (!voucher.startsAt || voucher.startsAt.getTime() <= now) &&
    (!voucher.endsAt || voucher.endsAt.getTime() >= now)
  );
}

function getVoucherStatus(
  voucher: {
    active: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    quota: number | null;
  },
  hasUsedVoucher: boolean,
  usedCount: number,
) {
  if (hasUsedVoucher) {
    return "used";
  }

  if (
    !isVoucherUsableNow(voucher) ||
    (voucher.quota !== null && usedCount >= voucher.quota)
  ) {
    return "expired";
  }

  return "available";
}

function serializeVoucher(
  voucher: Awaited<ReturnType<typeof prisma.voucher.findMany>>[number] & {
    redemptions: Array<{ orderId: string | null }>;
  },
  index: number,
  usedCount: number,
) {
  const hasUsedVoucher = voucher.redemptions.some(
    (redemption) => redemption.orderId,
  );

  return {
    id: voucher.id,
    code: voucher.code,
    tone: ["emerald", "blue", "amber", "gray"][index % 4],
    label: formatRp(voucher.discount),
    discount: voucher.discount,
    title: voucher.title,
    description: voucher.description || "Voucher aktif ResQFood.",
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
      "Kuota dan masa berlaku mengikuti data voucher terbaru.",
    ],
    status: getVoucherStatus(voucher, hasUsedVoucher, usedCount),
  };
}

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const vouchers = await prisma.voucher.findMany({
    where: {
      redemptions: {
        some: { userId: session.userId },
      },
    },
    include: {
      redemptions: {
        where: { userId: session.userId },
        select: {
          orderId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const usedCounts =
    vouchers.length > 0
      ? await prisma.voucherRedemption.groupBy({
          by: ["voucherId"],
          where: {
            voucherId: { in: vouchers.map((voucher) => voucher.id) },
            orderId: { not: null },
          },
          _count: {
            _all: true,
          },
        })
      : [];
  const usedCountByVoucherId = new Map(
    usedCounts.map((item) => [item.voucherId, item._count._all]),
  );

  return NextResponse.json({
    ok: true,
    vouchers: vouchers.map((voucher, index) =>
      serializeVoucher(voucher, index, usedCountByVoucherId.get(voucher.id) ?? 0),
    ),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = claimVoucherSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Kode voucher tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const voucher = await prisma.voucher.findUnique({
    where: { code: parsed.data.code.toUpperCase() },
    include: {
      redemptions: {
        where: { userId: session.userId },
        select: {
          id: true,
          orderId: true,
        },
      },
    },
  });

  if (!voucher) {
    return NextResponse.json(
      { ok: false, message: "Kode voucher tidak ditemukan." },
      { status: 404 },
    );
  }

  if (!isVoucherUsableNow(voucher)) {
    return NextResponse.json(
      { ok: false, message: "Voucher belum aktif atau sudah berakhir." },
      { status: 400 },
    );
  }

  const usedCount = await prisma.voucherRedemption.count({
    where: {
      voucherId: voucher.id,
      orderId: { not: null },
    },
  });

  if (voucher.quota !== null && usedCount >= voucher.quota) {
    return NextResponse.json(
      { ok: false, message: "Kuota voucher sudah habis." },
      { status: 400 },
    );
  }

  const hasUsedVoucher = voucher.redemptions.some(
    (redemption) => redemption.orderId,
  );

  if (hasUsedVoucher) {
    return NextResponse.json(
      { ok: false, message: "Voucher sudah pernah dipakai oleh akun ini." },
      { status: 409 },
    );
  }

  const existingClaim = voucher.redemptions.find(
    (redemption) => !redemption.orderId,
  );

  if (!existingClaim) {
    await prisma.voucherRedemption.create({
      data: {
        voucherId: voucher.id,
        userId: session.userId,
      },
    });
  }

  const claimedVoucher = await prisma.voucher.findUniqueOrThrow({
    where: { id: voucher.id },
    include: {
      redemptions: {
        where: { userId: session.userId },
        select: {
          orderId: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    message: existingClaim
      ? "Voucher sudah ada di akun."
      : "Voucher berhasil diklaim.",
    voucher: serializeVoucher(claimedVoucher, 0, usedCount),
  });
}
