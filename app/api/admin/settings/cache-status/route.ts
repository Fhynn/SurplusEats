import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/admin-permissions";
import { getCacheStatus } from "@/lib/server-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminPermission("SETTINGS_MANAGE");

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({
    ok: true,
    status: getCacheStatus(),
  });
}
