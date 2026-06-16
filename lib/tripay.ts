import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const tripayModeSchema = z.enum(["sandbox", "production"]);

const tripayPaymentChannelSchema = z.object({
  group: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  fee_merchant: z.object({
    flat: z.coerce.number().nonnegative(),
    percent: z.coerce.number().nonnegative(),
  }),
  fee_customer: z.object({
    flat: z.coerce.number().nonnegative(),
    percent: z.coerce.number().nonnegative(),
  }),
  total_fee: z.object({
    flat: z.coerce.number().nonnegative(),
    percent: z.coerce.number().nonnegative(),
  }),
  minimum_amount: z.coerce.number().int().nonnegative(),
  maximum_amount: z.coerce.number().int().positive(),
  icon_url: z.string().url(),
  active: z.boolean(),
});

const tripayPaymentChannelsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional().default(""),
  data: z.array(tripayPaymentChannelSchema).optional().default([]),
});

const nullableStringSchema = z
  .union([z.string(), z.number().transform(String)])
  .nullable()
  .optional();

const tripayTransactionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional().default(""),
  data: z
    .object({
      reference: z.string(),
      merchant_ref: z.string(),
      payment_method: z.string(),
      payment_name: z.string(),
      amount: z.coerce.number().int().nonnegative(),
      fee_merchant: z.coerce.number().int().nonnegative(),
      fee_customer: z.coerce.number().int().nonnegative(),
      total_fee: z.coerce.number().int().nonnegative(),
      amount_received: z.coerce.number().int().nonnegative(),
      pay_code: nullableStringSchema,
      pay_url: z.string().url().nullable().optional(),
      checkout_url: z.string().url(),
      status: z.string(),
      expired_time: z.coerce.number().int().nonnegative(),
      qr_url: z.string().url().nullable().optional(),
    })
    .optional(),
});

export const tripayCallbackSchema = z.object({
  reference: z.string().trim().min(1).max(128),
  merchant_ref: z.string().trim().min(1).max(128).nullable(),
  payment_method: z.string().trim().min(1).max(120),
  payment_method_code: z.string().trim().min(1).max(40),
  total_amount: z.number().int().nonnegative(),
  fee_merchant: z.number().int().nonnegative(),
  fee_customer: z.number().int().nonnegative(),
  total_fee: z.number().int().nonnegative(),
  amount_received: z.number().int().nonnegative(),
  is_closed_payment: z.union([z.literal(0), z.literal(1)]),
  status: z.enum(["PAID", "FAILED", "EXPIRED", "REFUND"]),
  paid_at: z.number().int().nonnegative().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export type TripayCallbackPayload = z.infer<typeof tripayCallbackSchema>;
export type TripayPaymentChannel = z.infer<typeof tripayPaymentChannelSchema>;

export type TripayOrderItem = {
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  productUrl?: string;
  imageUrl?: string;
};

export type TripayTransaction = {
  reference: string;
  merchantReference: string;
  paymentMethod: string;
  paymentName: string;
  amount: number;
  feeMerchant: number;
  feeCustomer: number;
  totalFee: number;
  amountReceived: number;
  payCode: string | null;
  payUrl: string | null;
  checkoutUrl: string;
  status: string;
  expiredAt: Date;
  qrUrl: string | null;
};

export class TripayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TripayApiError";
  }
}

function getTripayMode() {
  return tripayModeSchema.catch("sandbox").parse(
    process.env.TRIPAY_MODE?.trim().toLowerCase(),
  );
}

function getTripayApiBaseUrl() {
  return getTripayMode() === "production"
    ? "https://tripay.co.id/api"
    : "https://tripay.co.id/api-sandbox";
}

function getRequiredTripayEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new TripayApiError(`Konfigurasi ${name} belum tersedia.`, 503);
  }

  return value;
}

function getTripayRequestTimeoutMs() {
  const timeout = Number(process.env.TRIPAY_REQUEST_TIMEOUT_MS);

  return Number.isFinite(timeout) && timeout >= 1000 ? timeout : 10_000;
}

async function tripayFetch(path: string, init: RequestInit = {}) {
  const apiKey = getRequiredTripayEnv("TRIPAY_API_KEY");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    getTripayRequestTimeoutMs(),
  );

  try {
    return await fetch(`${getTripayApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new TripayApiError(
        "Tripay tidak merespons tepat waktu. Silakan coba lagi.",
        504,
      );
    }

    throw new TripayApiError(
      "Tidak dapat terhubung ke Tripay. Silakan coba lagi.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function createTripayTransactionSignature({
  merchantReference,
  amount,
}: {
  merchantReference: string;
  amount: number;
}) {
  const merchantCode = getRequiredTripayEnv("TRIPAY_MERCHANT_CODE");
  const privateKey = getRequiredTripayEnv("TRIPAY_PRIVATE_KEY");

  return createHmac("sha256", privateKey)
    .update(`${merchantCode}${merchantReference}${amount}`)
    .digest("hex");
}

export async function getTripayPaymentChannels() {
  const response = await tripayFetch("/merchant/payment-channel");
  const rawResponse = await response.json().catch(() => null);
  const parsed = tripayPaymentChannelsResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    throw new TripayApiError("Respons channel pembayaran Tripay tidak valid.", 502);
  }

  if (!response.ok || !parsed.data.success) {
    throw new TripayApiError(
      parsed.data.message || "Channel pembayaran Tripay gagal dimuat.",
      response.status || 502,
    );
  }

  return parsed.data.data.filter((channel) => channel.active);
}

export async function createTripayTransaction({
  method,
  merchantReference,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  orderItems,
  callbackUrl,
  returnUrl,
  expiresAt,
}: {
  method: string;
  merchantReference: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  orderItems: TripayOrderItem[];
  callbackUrl: string;
  returnUrl: string;
  expiresAt: Date;
}): Promise<TripayTransaction> {
  const payload = {
    method,
    merchant_ref: merchantReference,
    amount,
    customer_name: customerName,
    customer_email: customerEmail,
    ...(customerPhone ? { customer_phone: customerPhone } : {}),
    order_items: orderItems.map((item) => ({
      ...(item.sku ? { sku: item.sku } : {}),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      ...(item.productUrl ? { product_url: item.productUrl } : {}),
      ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
    })),
    callback_url: callbackUrl,
    return_url: returnUrl,
    expired_time: Math.floor(expiresAt.getTime() / 1000),
    signature: createTripayTransactionSignature({
      merchantReference,
      amount,
    }),
  };

  const response = await tripayFetch("/transaction/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const rawResponse = await response.json().catch(() => null);
  const parsed = tripayTransactionResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    throw new TripayApiError("Respons transaksi Tripay tidak valid.", 502);
  }

  if (!response.ok || !parsed.data.success || !parsed.data.data) {
    throw new TripayApiError(
      parsed.data.message || "Transaksi Tripay gagal dibuat.",
      response.status || 502,
    );
  }

  const transaction = parsed.data.data;

  return {
    reference: transaction.reference,
    merchantReference: transaction.merchant_ref,
    paymentMethod: transaction.payment_method,
    paymentName: transaction.payment_name,
    amount: transaction.amount,
    feeMerchant: transaction.fee_merchant,
    feeCustomer: transaction.fee_customer,
    totalFee: transaction.total_fee,
    amountReceived: transaction.amount_received,
    payCode: transaction.pay_code ?? null,
    payUrl: transaction.pay_url ?? null,
    checkoutUrl: transaction.checkout_url,
    status: transaction.status,
    expiredAt: new Date(transaction.expired_time * 1000),
    qrUrl: transaction.qr_url ?? null,
  };
}

export function getTripayCallbackUrl(requestUrl: string) {
  const configuredUrl = process.env.TRIPAY_CALLBACK_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  return new URL("/api/payments/tripay/callback", requestUrl).toString();
}

export function createTripayCallbackSignature(
  rawBody: string,
  privateKey: string,
) {
  return createHmac("sha256", privateKey).update(rawBody).digest("hex");
}

export function verifyTripayCallbackSignature({
  rawBody,
  privateKey,
  signature,
}: {
  rawBody: string;
  privateKey: string;
  signature: string;
}) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expectedSignature = createTripayCallbackSignature(rawBody, privateKey);
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function tripayAmountMatchesOrderTotal(
  payload: Pick<TripayCallbackPayload, "total_amount" | "fee_customer">,
  orderTotal: number,
) {
  const amountBeforeCustomerFee = payload.total_amount - payload.fee_customer;

  return (
    orderTotal === payload.total_amount ||
    orderTotal === amountBeforeCustomerFee
  );
}

export function getTripayPaidAt(paidAt: number | null | undefined) {
  if (!paidAt) {
    return new Date();
  }

  const date = new Date(paidAt * 1000);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}
