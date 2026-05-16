import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.OWNER) {
    return NextResponse.json(
      { ok: false, message: "Akses owner diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const reviews = await prisma.review.findMany({
    where: {
      restaurant: { ownerId: session.userId },
    },
    include: {
      order: true,
      restaurant: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, reviews });
}
