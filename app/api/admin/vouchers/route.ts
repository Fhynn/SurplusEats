import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const voucherSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Kode voucher minimal 3 karakter.")
    .max(40, "Kode voucher maksimal 40 karakter.")
    .regex(
      /^[A-Z0-9_-]+$/i,
      "Kode hanya boleh berisi huruf, angka, underscore, atau strip.",
    ),
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(240).nullable().optional(),
  discount: z.coerce.number().int().min(1000).max(10_000_000),
  minSpend: z.coerce.number().int().min(0).max(50_000_000),
  quota: z.coerce.number().int().min(1).max(100_000).nullable().optional(),
  active: z.boolean().optional(),
  startsAt: z.string().trim().nullable().optional(),
  endsAt: z.string().trim().nullable().optional(),
});

type VoucherWithRedemptions = Awaited<
  ReturnType<typeof prisma.voucher.findMany>
>[number] & {
  redemptions: Array<{
    orderId: string | null;
  }>;
};

function parseDateInput(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal voucher tidak valid.");
  }

  return date;
}

function getVoucherStatus(voucher: VoucherWithRedemptions, usedCount: number) {
  const now = Date.now();

  if (!voucher.active) {
    return "paused";
  }

  if (voucher.startsAt && voucher.startsAt.getTime() > now) {
    return "scheduled";
  }

  if (voucher.endsAt && voucher.endsAt.getTime() < now) {
    return "expired";
  }

  if (voucher.quota !== null && usedCount >= voucher.quota) {
    return "quota_habis";
  }

  return "active";
}

function serializeVoucher(voucher: VoucherWithRedemptions) {
  const usedCount = voucher.redemptions.filter(
    (redemption) => redemption.orderId,
  ).length;

  return {
    id: voucher.id,
    code: voucher.code,
    title: voucher.title,
    description: voucher.description,
    discount: voucher.discount,
    minSpend: voucher.minSpend,
    quota: voucher.quota,
    active: voucher.active,
    startsAt: voucher.startsAt?.toISOString() ?? null,
    endsAt: voucher.endsAt?.toISOString() ?? null,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
    usedCount,
    remainingQuota:
      voucher.quota === null ? null : Math.max(0, voucher.quota - usedCount),
    status: getVoucherStatus(voucher, usedCount),
  };
}

async function requireAdmin() {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return {
      session,
      response: NextResponse.json(
        { ok: false, message: "Akses admin diperlukan." },
        { status: session ? 403 : 401 },
      ),
    };
  }

  return { session, response: null };
}

export async function GET() {
  const { response } = await requireAdmin();

  if (response) {
    return response;
  }

  const vouchers = await prisma.voucher.findMany({
    include: {
      redemptions: {
        select: {
          orderId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    vouchers: vouchers.map(serializeVoucher),
  });
}

export async function POST(request: Request) {
  const { session, response } = await requireAdmin();

  if (response) {
    return response;
  }

  const parsed = voucherSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data voucher tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const startsAt = parseDateInput(parsed.data.startsAt);
    const endsAt = parseDateInput(parsed.data.endsAt);

    if (startsAt && endsAt && startsAt >= endsAt) {
      return NextResponse.json(
        { ok: false, message: "Tanggal mulai harus sebelum tanggal selesai." },
        { status: 400 },
      );
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: parsed.data.code.toUpperCase(),
        title: parsed.data.title,
        description: parsed.data.description || null,
        discount: parsed.data.discount,
        minSpend: parsed.data.minSpend,
        quota: parsed.data.quota ?? null,
        active: parsed.data.active ?? true,
        startsAt,
        endsAt,
      },
      include: {
        redemptions: {
          select: {
            orderId: true,
          },
        },
      },
    });

    await prisma.adminActionLog.create({
      data: {
        adminId: session.userId,
        action: "VOUCHER_CREATED",
        targetType: "voucher",
        targetId: voucher.id,
        metadata: {
          code: voucher.code,
          discount: voucher.discount,
          minSpend: voucher.minSpend,
        },
      },
    });

    return NextResponse.json(
      { ok: true, voucher: serializeVoucher(voucher) },
      { status: 201 },
    );
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";

    return NextResponse.json(
      {
        ok: false,
        message:
          errorCode === "P2002"
            ? "Kode voucher sudah digunakan."
            : error instanceof Error
              ? error.message
              : "Voucher gagal dibuat.",
      },
      { status: errorCode === "P2002" ? 409 : 400 },
    );
  }
}
