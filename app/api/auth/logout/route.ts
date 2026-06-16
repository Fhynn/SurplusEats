import { NextResponse } from "next/server";

import { clearSessionCookie, getCurrentSession } from "@/lib/auth-session";
import { revokePersistedSession } from "@/lib/auth-session-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getCurrentSession();
  const response = NextResponse.json({ ok: true, redirectTo: "/" });

  await revokePersistedSession(session?.sessionId, {
    revokedById: session?.impersonatedById ?? session?.userId ?? null,
    revokeReason: "LOGOUT",
  });
  clearSessionCookie(response);

  return response;
}
