import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const [users, restaurants, menuItems, orders] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.menuItem.count(),
      prisma.order.count(),
    ]);

    return NextResponse.json({
      ok: true,
      database: "connected",
      blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      neonAuth: Boolean(
        process.env.NEON_AUTH_BASE_URL &&
          process.env.NEON_AUTH_COOKIE_SECRET,
      ),
      counts: {
        users,
        restaurants,
        menuItems,
        orders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        message:
          error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 500 },
    );
  }
}
