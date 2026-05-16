import { RestaurantStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const restaurants = await prisma.restaurant.findMany({
    where: { status: RestaurantStatus.APPROVED },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    include: {
      menuItems: {
        where: { status: "ACTIVE" },
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
