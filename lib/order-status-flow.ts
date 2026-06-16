import { OrderStatus } from "@prisma/client";

export type PickupVerificationMethod =
  | "SCANNER"
  | "MANUAL"
  | "SCANNER_OR_MANUAL";

export function normalizePickupCode(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function getOrderStatusLabel(status: OrderStatus) {
  switch (status) {
    case OrderStatus.PENDING:
      return "menunggu pembayaran";
    case OrderStatus.PAYMENT_FAILED:
      return "pembayaran gagal";
    case OrderStatus.PAID:
      return "sudah dibayar";
    case OrderStatus.CONFIRMED:
      return "pesanan baru";
    case OrderStatus.PREPARING:
      return "sedang disiapkan";
    case OrderStatus.READY:
      return "siap diambil";
    case OrderStatus.COMPLETED:
      return "selesai";
    case OrderStatus.NO_SHOW:
      return "tidak diambil";
    case OrderStatus.CANCELLED:
      return "dibatalkan";
    case OrderStatus.REFUNDED:
      return "direfund";
  }
}

export function isTerminalOrderStatus(status: OrderStatus) {
  const terminalStatuses: OrderStatus[] = [
    OrderStatus.COMPLETED,
    OrderStatus.NO_SHOW,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
    OrderStatus.PAYMENT_FAILED,
  ];

  return terminalStatuses.includes(status);
}

export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedNextStatuses: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [],
    [OrderStatus.PAID]: [
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.NO_SHOW]: [],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
    [OrderStatus.PAYMENT_FAILED]: [],
  };

  return allowedNextStatuses[currentStatus]?.includes(nextStatus) ?? false;
}
