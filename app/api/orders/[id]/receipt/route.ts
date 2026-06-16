import { PaymentStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { buildOrderReceiptPdf } from "@/lib/order-receipt-pdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrderReceiptRouteProps {
  params: Promise<{ id: string }>;
}

const downloadablePaymentStatuses = new Set<PaymentStatus>([
  PaymentStatus.PAID,
  PaymentStatus.REFUNDED,
]);

function sanitizeFilename(value: string) {
  return value.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: OrderReceiptRouteProps,
) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Login diperlukan untuk mengunduh receipt." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: {
      orderCode: id,
      customerId: session.role === UserRole.CUSTOMER ? session.userId : undefined,
      restaurant:
        session.role === UserRole.OWNER ? { ownerId: session.userId } : undefined,
    },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      restaurant: {
        select: {
          name: true,
          address: true,
          city: true,
        },
      },
      items: {
        select: {
          menuNameSnapshot: true,
          quantity: true,
          priceSnapshot: true,
          originalPriceSnapshot: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  if (!downloadablePaymentStatuses.has(order.paymentStatus)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Receipt PDF tersedia setelah pembayaran valid.",
      },
      { status: 409 },
    );
  }

  const pdf = buildOrderReceiptPdf(order);
  const filename = `resqfood-receipt-${sanitizeFilename(order.orderCode)}.pdf`;

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
