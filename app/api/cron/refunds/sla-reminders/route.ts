import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { sendRefundSlaReminders } from "@/lib/refund-sla-reminders";

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

async function handleRefundSlaReminders(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { ok: false, message: "Akses cron/admin diperlukan." },
      { status: 401 },
    );
  }

  const result = await sendRefundSlaReminders();

  return NextResponse.json({
    ok: true,
    ...result,
    processedAt: result.processedAt.toISOString(),
  });
}

export function GET(request: Request) {
  return handleRefundSlaReminders(request);
}

export function POST(request: Request) {
  return handleRefundSlaReminders(request);
}
