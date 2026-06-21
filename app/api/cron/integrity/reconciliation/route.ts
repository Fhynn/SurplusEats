import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { runDataIntegrityReconciliation } from "@/lib/data-integrity-reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthorizedActor(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret) {
    const authorizationHeader = request.headers.get("authorization") ?? "";
    const cronSecretHeader = request.headers.get("x-cron-secret") ?? "";

    if (
      authorizationHeader === `Bearer ${cronSecret}` ||
      cronSecretHeader === cronSecret
    ) {
      return { authorized: true as const, actorId: null, source: "cron" as const };
    }
  }

  const session = await getCurrentSession();

  if (session?.role === UserRole.ADMIN) {
    return {
      authorized: true as const,
      actorId: session.userId,
      source: "admin" as const,
    };
  }

  return { authorized: false as const };
}

async function handleReconciliation(request: Request) {
  const actor = await getAuthorizedActor(request);

  if (!actor.authorized) {
    return NextResponse.json(
      { ok: false, message: "Akses cron/admin diperlukan." },
      { status: 401 },
    );
  }

  const result = await runDataIntegrityReconciliation({
    actorId: actor.actorId,
    source: actor.source,
  });

  return NextResponse.json(result);
}

export function GET(request: Request) {
  return handleReconciliation(request);
}

export function POST(request: Request) {
  return handleReconciliation(request);
}
