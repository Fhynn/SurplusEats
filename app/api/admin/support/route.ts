import { NotificationType, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateTicketSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"]),
  adminNote: z.string().trim().max(1200).optional(),
});

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const tickets = await prisma.supportTicket.findMany({
    include: {
      order: {
        select: {
          orderCode: true,
          status: true,
          total: true,
          restaurant: {
            select: {
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          email: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const metrics = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "OPEN").length,
    inReview: tickets.filter((ticket) => ticket.status === "IN_REVIEW").length,
    resolved: tickets.filter((ticket) => ticket.status === "RESOLVED").length,
  };

  return NextResponse.json({ ok: true, tickets, metrics });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json(
      { ok: false, message: "Akses admin diperlukan." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = updateTicketSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data tiket tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      subject: true,
      userId: true,
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { ok: false, message: "Tiket support tidak ditemukan." },
      { status: 404 },
    );
  }

  const updatedTicket = await prisma.$transaction(
    async (tx: PrismaTransactionClient) => {
      const updated = await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: parsed.data.status,
          adminNote: parsed.data.adminNote || null,
          resolvedAt:
            parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED"
              ? new Date()
              : null,
        },
        include: {
          order: {
            select: {
              orderCode: true,
              status: true,
              total: true,
              restaurant: {
                select: {
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              email: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: ticket.userId,
          type: NotificationType.SYSTEM,
          title:
            parsed.data.status === "RESOLVED"
              ? "Tiket support selesai"
              : "Status tiket support diperbarui",
          body:
            parsed.data.adminNote ||
            `${ticket.subject} sekarang berstatus ${parsed.data.status}.`,
          href: "/support",
        },
      });

      await tx.adminActionLog.create({
        data: {
          adminId: session.userId,
          action: `SUPPORT_${parsed.data.status}`,
          targetType: "support_ticket",
          targetId: ticket.id,
          metadata: { adminNote: parsed.data.adminNote },
        },
      });

      return updated;
    },
  );

  return NextResponse.json({ ok: true, ticket: updatedTicket });
}
