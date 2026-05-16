import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RestaurantApplicationDetailRouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RestaurantApplicationDetailRouteProps,
) {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const { id } = await params;
  const application = await prisma.restaurantApplication.findUnique({
    where: { id },
    include: {
      documents: { include: { asset: true } },
      restaurant: true,
      user: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { ok: false, message: "Pengajuan mitra tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, application });
}
