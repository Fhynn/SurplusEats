export type SupportPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type SupportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

const priorityDurations: Record<
  SupportPriority,
  { firstResponseMinutes: number; resolutionMinutes: number }
> = {
  HIGH: { firstResponseMinutes: 60, resolutionMinutes: 8 * 60 },
  LOW: { firstResponseMinutes: 8 * 60, resolutionMinutes: 48 * 60 },
  NORMAL: { firstResponseMinutes: 4 * 60, resolutionMinutes: 24 * 60 },
  URGENT: { firstResponseMinutes: 30, resolutionMinutes: 4 * 60 },
};

export const supportPriorityLabel: Record<SupportPriority, string> = {
  HIGH: "Tinggi",
  LOW: "Rendah",
  NORMAL: "Normal",
  URGENT: "Urgent",
};

export function normalizeSupportPriority(value?: string | null): SupportPriority {
  if (
    value === "LOW" ||
    value === "NORMAL" ||
    value === "HIGH" ||
    value === "URGENT"
  ) {
    return value;
  }

  return "NORMAL";
}

export function getSupportPriorityForCategory(category: string): SupportPriority {
  if (category === "PAYMENT" || category === "REFUND") {
    return "HIGH";
  }

  if (category === "ORDER") {
    return "NORMAL";
  }

  return "LOW";
}

export function getSupportSlaDates(priority: SupportPriority, from = new Date()) {
  const duration = priorityDurations[priority];

  return {
    firstResponseDueAt: new Date(
      from.getTime() + duration.firstResponseMinutes * 60 * 1000,
    ),
    resolutionDueAt: new Date(
      from.getTime() + duration.resolutionMinutes * 60 * 1000,
    ),
  };
}

export function getSupportSlaState(input: {
  status: string;
  firstResponseDueAt?: Date | null;
  resolutionDueAt?: Date | null;
  firstRespondedAt?: Date | null;
  resolvedAt?: Date | null;
}) {
  const now = Date.now();
  const isClosed = input.status === "RESOLVED" || input.status === "CLOSED";

  if (!input.firstRespondedAt && input.firstResponseDueAt) {
    if (input.firstResponseDueAt.getTime() < now) {
      return "FIRST_RESPONSE_OVERDUE";
    }

    return "WAITING_FIRST_RESPONSE";
  }

  if (!isClosed && input.resolutionDueAt) {
    if (input.resolutionDueAt.getTime() < now) {
      return "RESOLUTION_OVERDUE";
    }

    return "IN_SLA";
  }

  return "DONE";
}
