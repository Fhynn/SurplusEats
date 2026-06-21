import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxLimit = 100;

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeCsvValue(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(
  logs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    createdAt: Date;
    admin: { name: string; email: string } | null;
    metadata: unknown;
  }>,
) {
  const header = [
    "id",
    "createdAt",
    "action",
    "targetType",
    "targetId",
    "actorName",
    "actorEmail",
    "metadata",
  ];
  const rows = logs.map((log) => [
    log.id,
    log.createdAt.toISOString(),
    log.action,
    log.targetType,
    log.targetId,
    log.admin?.name ?? "System",
    log.admin?.email ?? "system",
    log.metadata,
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

export async function GET(request: Request) {
  const auth = await requireAdminPermission("AUDIT_VIEW");

  if (auth.response) {
    return auth.response;
  }

  const url = new URL(request.url);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1);
  const limit = Math.min(
    maxLimit,
    parsePositiveInteger(url.searchParams.get("limit"), 50),
  );
  const query = url.searchParams.get("q")?.trim();
  const action = url.searchParams.get("action")?.trim();
  const targetType = url.searchParams.get("targetType")?.trim();
  const actor = url.searchParams.get("actor")?.trim();
  const dateFrom = parseDate(url.searchParams.get("dateFrom"));
  const dateTo = parseDate(url.searchParams.get("dateTo"));
  const exportFormat = url.searchParams.get("export");
  const where = {
    action: action && action !== "all" ? action : undefined,
    targetType: targetType && targetType !== "all" ? targetType : undefined,
    createdAt:
      dateFrom || dateTo
        ? {
            gte: dateFrom ?? undefined,
            lte: dateTo ?? undefined,
          }
        : undefined,
    admin:
      actor && actor !== "all"
        ? {
            OR: [
              { name: { contains: actor, mode: "insensitive" as const } },
              { email: { contains: actor, mode: "insensitive" as const } },
            ],
          }
        : undefined,
    OR: query
      ? [
          { action: { contains: query, mode: "insensitive" as const } },
          { targetType: { contains: query, mode: "insensitive" as const } },
          { targetId: { contains: query, mode: "insensitive" as const } },
          {
            admin: {
              is: {
                OR: [
                  { name: { contains: query, mode: "insensitive" as const } },
                  { email: { contains: query, mode: "insensitive" as const } },
                ],
              },
            },
          },
        ]
      : undefined,
  };
  const orderBy = { createdAt: "desc" as const };

  if (exportFormat === "csv") {
    const logs = await prisma.adminActionLog.findMany({
      where,
      orderBy,
      take: 1000,
      include: {
        admin: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return new NextResponse(buildCsv(logs), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="resqfood-audit-logs-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  const [logs, total, actionGroups, targetTypeGroups] = await Promise.all([
    prisma.adminActionLog.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.adminActionLog.count({ where }),
    prisma.adminActionLog.groupBy({
      by: ["action"],
      _count: { _all: true },
      orderBy: { _count: { action: "desc" } },
      take: 40,
    }),
    prisma.adminActionLog.groupBy({
      by: ["targetType"],
      _count: { _all: true },
      orderBy: { _count: { targetType: "desc" } },
      take: 40,
    }),
  ]);
  const latestSecurityLog = await prisma.adminActionLog.findFirst({
    where: {
      OR: [
        { action: { startsWith: "RATE_LIMIT" } },
        { action: { contains: "SECURITY" } },
        { targetType: "security" },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filters: {
      actions: actionGroups.map((item) => ({
        value: item.action,
        count: item._count._all,
      })),
      targetTypes: targetTypeGroups.map((item) => ({
        value: item.targetType,
        count: item._count._all,
      })),
    },
    metrics: {
      total,
      latestSecurityLogAt: latestSecurityLog?.createdAt.toISOString() ?? null,
    },
  });
}
