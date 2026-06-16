import { prisma } from "@/lib/prisma";

export type NotificationTypeValue = "ORDER" | "PROMO" | "REFUND" | "SYSTEM";

export type NotificationDeliveryPayload = {
  userId: string;
  type: NotificationTypeValue;
  title: string;
  body: string;
  href?: string | null;
};

type NotificationRecipient = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

const defaultFonnteApiUrl = "https://api.fonnte.com/send";

function envFlagIsFalse(value: string | undefined) {
  return value ? ["0", "false", "off", "no"].includes(value.toLowerCase()) : false;
}

function isPromoExternalEnabled() {
  return process.env.NOTIFICATION_PROMO_EXTERNAL_ENABLED === "true";
}

function getDeliveryTimeoutMs() {
  const parsed = Number(process.env.NOTIFICATION_DELIVERY_TIMEOUT_MS);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2500;
}

function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "";
}

function getAbsoluteHref(href: string | null | undefined) {
  if (!href) {
    return null;
  }

  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    return href;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildNotificationText(payload: NotificationDeliveryPayload) {
  const absoluteHref = getAbsoluteHref(payload.href);

  return [
    payload.title,
    "",
    payload.body,
    absoluteHref ? "" : null,
    absoluteHref,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildNotificationHtml(payload: NotificationDeliveryPayload) {
  const absoluteHref = getAbsoluteHref(payload.href);

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(payload.title)}</h2>
      <p style="margin:0 0 18px">${escapeHtml(payload.body)}</p>
      ${
        absoluteHref
          ? `<a href="${escapeHtml(absoluteHref)}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:700">Buka ResQFood</a>`
          : ""
      }
    </div>
  `;
}

function normalizeWhatsappTarget(phone: string | null) {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length < 8) {
    return null;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  return digits;
}

async function fetchWithTimeout(input: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getDeliveryTimeoutMs());

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendEmailNotification(
  payload: NotificationDeliveryPayload,
  recipient: NotificationRecipient,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;

  if (
    envFlagIsFalse(process.env.NOTIFICATION_EMAIL_ENABLED) ||
    !apiKey ||
    !from ||
    !recipient.email
  ) {
    return;
  }

  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipient.email,
      subject: payload.title,
      text: buildNotificationText(payload),
      html: buildNotificationHtml(payload),
    }),
  });

  if (!response.ok) {
    console.warn("Email notification delivery failed", await response.text());
  }
}

async function sendWhatsappNotification(
  payload: NotificationDeliveryPayload,
  recipient: NotificationRecipient,
) {
  const token = process.env.FONNTE_TOKEN;
  const target = normalizeWhatsappTarget(recipient.phone);

  if (
    envFlagIsFalse(process.env.NOTIFICATION_WHATSAPP_ENABLED) ||
    !token ||
    !target
  ) {
    return;
  }

  const formData = new FormData();
  formData.set("target", target);
  formData.set("message", buildNotificationText(payload));

  const response = await fetchWithTimeout(
    process.env.FONNTE_API_URL || defaultFonnteApiUrl,
    {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    console.warn("WhatsApp notification delivery failed", await response.text());
  }
}

async function deliverNotificationToRecipient(
  payload: NotificationDeliveryPayload,
  recipient: NotificationRecipient,
) {
  if (payload.type === "PROMO" && !isPromoExternalEnabled()) {
    return;
  }

  const results = await Promise.allSettled([
    sendEmailNotification(payload, recipient),
    sendWhatsappNotification(payload, recipient),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("Notification delivery failed", result.reason);
    }
  }
}

export async function deliverNotifications(
  payloads: NotificationDeliveryPayload[],
) {
  if (payloads.length === 0) {
    return;
  }

  try {
    const userIds = Array.from(new Set(payloads.map((payload) => payload.userId)));
    const recipients = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });
    const recipientById = new Map(
      recipients.map((recipient) => [recipient.id, recipient]),
    );

    const results = await Promise.allSettled(
      payloads.map((payload) => {
        const recipient = recipientById.get(payload.userId);

        return recipient
          ? deliverNotificationToRecipient(payload, recipient)
          : Promise.resolve();
      }),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.warn("Notification delivery task failed", result.reason);
      }
    }
  } catch (error) {
    console.warn("Notification recipient lookup failed", error);
  }
}

export async function createNotificationAndDeliver(
  data: NotificationDeliveryPayload,
) {
  const notification = await prisma.notification.create({ data });
  await deliverNotifications([data]);

  return notification;
}

export async function createManyNotificationsAndDeliver(
  data: NotificationDeliveryPayload[],
) {
  if (data.length === 0) {
    return;
  }

  await prisma.notification.createMany({ data });
  await deliverNotifications(data);
}
