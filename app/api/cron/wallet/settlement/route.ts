import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { settleCompletedWalletTransactions } from "@/lib/wallet-settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret) {
    const authorizationHeader = request.headers.get("authorization") ?? "";
    const cronSecretHeader = request.headers.get("x-cron-secret") ?? "";

    return (
      authorizationHeader === `Bearer ${cronSecret}` ||
      cronSecretHeader === cronSecret
    );
  }

  const session = await getCurrentSession();

  return session?.role === UserRole.ADMIN;
}

async function handleWalletSettlement(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { ok: false, message: "Akses cron/admin diperlukan." },
      { status: 401 },
    );
  }

  const result = await settleCompletedWalletTransactions();

  return NextResponse.json({
    ok: true,
    ...result,
    cutoff: result.cutoff.toISOString(),
  });
}

export function GET(request: Request) {
  return handleWalletSettlement(request);
}

export function POST(request: Request) {
  return handleWalletSettlement(request);
}

