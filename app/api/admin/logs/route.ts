import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const logs = await prisma.adminActionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { admin: true },
  });

  return NextResponse.json({ ok: true, logs });
}
