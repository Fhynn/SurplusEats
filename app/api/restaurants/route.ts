import { RestaurantStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const restaurants = await prisma.restaurant.findMany({
    where: {
      status: RestaurantStatus.APPROVED,
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    include: {
      menuItems: {
        where: { status: "ACTIVE", stock: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    restaurants,
  });
}
