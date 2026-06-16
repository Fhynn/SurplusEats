import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const attemptId = new URL(request.url).searchParams.get("attempt")?.trim();

  if (!attemptId) {
    return NextResponse.json(
      { ok: false, message: "Referensi checkout tidak tersedia." },
      { status: 400 },
    );
  }

  const attempt = await prisma.checkoutAttempt.findFirst({
    where: {
      id: attemptId,
      userId: session.userId,
    },
    select: {
      id: true,
      status: true,
      errorMessage: true,
      paymentMethodName: true,
      paymentReference: true,
      paymentStatus: true,
      paymentAmount: true,
      paymentFeeCustomer: true,
      paymentCheckoutUrl: true,
      paymentExpiresAt: true,
      orders: {
        orderBy: { createdAt: "asc" },
        select: {
          orderCode: true,
          paymentStatus: true,
          status: true,
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json(
      { ok: false, message: "Checkout tidak ditemukan." },
      { status: 404 },
    );
  }

  const paymentStatus =
    attempt.orders.length > 0 &&
    attempt.orders.every((order) => order.paymentStatus === "PAID")
      ? "PAID"
      : attempt.paymentStatus || "UNPAID";

  return NextResponse.json(
    {
      ok: true,
      payment: {
        attemptId: attempt.id,
        reference: attempt.paymentReference,
        methodName: attempt.paymentMethodName,
        status: paymentStatus,
        amount: attempt.paymentAmount,
        customerFee: attempt.paymentFeeCustomer,
        checkoutUrl: attempt.paymentCheckoutUrl,
        expiresAt: attempt.paymentExpiresAt?.toISOString() ?? null,
        errorMessage: attempt.errorMessage,
      },
      orders: attempt.orders.map((order) => ({
        orderCode: order.orderCode,
        paymentStatus: order.paymentStatus,
        status: order.status,
      })),
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
