"use client";

import { Clock3 } from "lucide-react";

import {
  getPickupAvailability,
  type PickupAvailabilityStatus,
} from "@/lib/customer-data";

const statusClassName: Record<PickupAvailabilityStatus, string> = {
  open: "border-emerald-100 bg-emerald-50 text-emerald-700",
  upcoming: "border-blue-100 bg-blue-50 text-blue-700",
  closed: "border-gray-200 bg-gray-100 text-gray-600",
  unknown: "border-amber-100 bg-amber-50 text-amber-700",
};

export function PickupAvailabilityBadge({
  pickupWindow,
  compact = false,
}: Readonly<{
  pickupWindow: string;
  compact?: boolean;
}>) {
  const availability = getPickupAvailability(pickupWindow);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-extrabold ${statusClassName[availability.status]} ${
        compact ? "text-[10px]" : "text-xs"
      }`}
      title={availability.description}
    >
      <Clock3 size={compact ? 10 : 13} />
      {availability.label}
    </span>
  );
}
