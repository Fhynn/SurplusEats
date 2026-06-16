import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import {
  getTripayPaymentChannels,
  TripayApiError,
} from "@/lib/tripay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  try {
    const channels = await getTripayPaymentChannels();

    if (channels.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Belum ada channel pembayaran aktif di merchant Tripay. Aktifkan QRIS, e-wallet, atau Virtual Account dari dashboard Tripay.",
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        channels: channels.map((channel) => ({
          group: channel.group,
          code: channel.code,
          name: channel.name,
          type: channel.type,
          iconUrl: channel.icon_url,
          minimumAmount: channel.minimum_amount,
          maximumAmount: channel.maximum_amount,
          feeMerchant: channel.fee_merchant,
          feeCustomer: channel.fee_customer,
          totalFee: channel.total_fee,
        })),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    const status = error instanceof TripayApiError ? error.status : 502;
    const message =
      error instanceof Error
        ? error.message
        : "Channel pembayaran Tripay gagal dimuat.";

    return NextResponse.json(
      { ok: false, message },
      {
        status,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
}
