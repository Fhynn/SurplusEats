import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import {
  deliverNotifications,
  getNotificationDeliveryStatus,
  type NotificationDeliveryPayload,
} from "@/lib/notification-delivery";
import { prisma } from "@/lib/prisma";
import {
  enforceSensitiveActionRateLimit,
  securityRateLimitRules,
} from "@/lib/security-rate-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getCurrentSession();

  if (session?.role !== UserRole.ADMIN) {
    return {
      session,
      response: NextResponse.json(
        { ok: false, message: "Akses admin diperlukan." },
        { status: session ? 403 : 401 },
      ),
    };
  }

  return { session, response: null };
}

async function getAdminRecipient(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });
}

export async function GET() {
  const { session, response } = await requireAdmin();

  if (response) {
    return response;
  }

  const admin = await getAdminRecipient(session.userId);
  const status = getNotificationDeliveryStatus(admin ?? undefined);

  return NextResponse.json({ ok: true, status });
}

export async function POST(request: Request) {
  const { session, response } = await requireAdmin();

  if (response) {
    return response;
  }

  const rateLimit = await enforceSensitiveActionRateLimit(
    request,
    securityRateLimitRules.adminSettingsMutation,
    session,
    ["notification-delivery-test"],
  );

  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const admin = await getAdminRecipient(session.userId);

  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "Admin tidak ditemukan." },
      { status: 404 },
    );
  }

  const status = getNotificationDeliveryStatus(admin);

  if (!status.ready) {
    return NextResponse.json(
      {
        ok: false,
        status,
        message:
          "Email/WhatsApp belum siap. Lengkapi env provider dan data kontak admin dulu.",
      },
      { status: 400 },
    );
  }

  const payload: NotificationDeliveryPayload = {
    userId: admin.id,
    type: "SYSTEM",
    title: "Tes notifikasi ResQFood",
    body: "Jika pesan ini diterima, konfigurasi email/WhatsApp eksternal sudah aktif.",
    href: "/admin/settings",
  };

  await prisma.notification.create({ data: payload });

  const results = await deliverNotifications([payload]);
  const delivered = results.some((result) => result.attempted && result.ok);

  await prisma.adminActionLog.create({
    data: {
      adminId: session.userId,
      action: "TEST_NOTIFICATION_DELIVERY",
      targetType: "notification_delivery",
      targetId: admin.id,
      metadata: {
        delivered,
        results,
      },
    },
  });

  if (!delivered) {
    return NextResponse.json(
      {
        ok: false,
        status: getNotificationDeliveryStatus(admin),
        results,
        message:
          "Provider sudah dikonfigurasi, tapi test kirim belum berhasil. Cek kredensial provider dan nomor/email penerima.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: getNotificationDeliveryStatus(admin),
    results,
    message: "Test notifikasi berhasil dikirim.",
  });
}
