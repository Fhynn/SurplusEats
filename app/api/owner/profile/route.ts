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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      applications: { orderBy: { submittedAt: "desc" }, take: 1 },
      ownedRestaurants: {
        include: {
          menuItems: true,
          orders: true,
          reviews: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Owner tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    owner: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    restaurant: user.ownedRestaurants[0] ?? null,
    latestApplication: user.applications[0] ?? null,
  });
}
