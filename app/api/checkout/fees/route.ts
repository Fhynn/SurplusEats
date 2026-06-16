import { NextResponse } from "next/server";
import { z } from "zod";

import {
  calculateCheckoutFees,
  getPlatformFeeSettings,
} from "@/lib/platform-fees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const feePreviewSchema = z.object({
  amount: z.coerce.number().int().min(0).max(100_000_000),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = feePreviewSchema.safeParse({
    amount: url.searchParams.get("amount") ?? 0,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nominal preview fee tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const settings = await getPlatformFeeSettings();
  const fees = calculateCheckoutFees({
    amount: parsed.data.amount,
    settings,
  });

  return NextResponse.json({
    ok: true,
    fees: {
      serviceFee: fees.serviceFee,
      taxFee: fees.taxFee,
      customerFeeTotal: fees.customerFeeTotal,
    },
  });
}
