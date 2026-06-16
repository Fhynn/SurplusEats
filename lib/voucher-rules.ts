export type VoucherRuleData = {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  quota: number | null;
  discount: number;
  minSpend: number;
  perUserLimit?: number | null;
  firstOrderOnly?: boolean | null;
  restaurantId?: string | null;
  category?: string | null;
  campaignName?: string | null;
  restaurant?: {
    name: string;
  } | null;
};

export type VoucherRuleCartItem = {
  restaurantId: string;
  category: string | null;
  discountedPrice: number;
  quantity: number;
};

export type AdminVoucherStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "paused"
  | "quota_habis";

export type VoucherEligibilityResult = {
  eligible: boolean;
  eligibleSubtotal: number;
  discount: number;
  reason: string | null;
};

export function normalizeVoucherCategory(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function isVoucherUsableNow(voucher: {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}) {
  const now = Date.now();

  return (
    voucher.active &&
    (!voucher.startsAt || voucher.startsAt.getTime() <= now) &&
    (!voucher.endsAt || voucher.endsAt.getTime() >= now)
  );
}

export function getAdminVoucherStatus(
  voucher: {
    active: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    quota: number | null;
  },
  usedCount: number,
): AdminVoucherStatus {
  const now = Date.now();

  if (!voucher.active) {
    return "paused";
  }

  if (voucher.startsAt && voucher.startsAt.getTime() > now) {
    return "scheduled";
  }

  if (voucher.endsAt && voucher.endsAt.getTime() < now) {
    return "expired";
  }

  if (voucher.quota !== null && usedCount >= voucher.quota) {
    return "quota_habis";
  }

  return "active";
}

export function getVoucherScopeLabel(voucher: VoucherRuleData) {
  const labels: string[] = [];

  if (voucher.restaurantId) {
    labels.push(`Toko: ${voucher.restaurant?.name || "toko terpilih"}`);
  }

  if (voucher.category) {
    labels.push(`Kategori: ${voucher.category}`);
  }

  return labels.length > 0 ? labels.join(" | ") : "Semua toko dan kategori";
}

export function getVoucherRuleLabels(voucher: VoucherRuleData) {
  const labels: string[] = [];

  if (voucher.campaignName) {
    labels.push(`Campaign: ${voucher.campaignName}`);
  }

  labels.push(getVoucherScopeLabel(voucher));

  if (voucher.firstOrderOnly) {
    labels.push("Khusus order pertama");
  }

  labels.push(`Limit ${Math.max(1, voucher.perUserLimit ?? 1)}x per akun`);

  if (voucher.minSpend > 0) {
    labels.push(`Minimum belanja berlaku pada item yang sesuai rules`);
  }

  return labels;
}

export function getVoucherEligibleSubtotal(
  voucher: VoucherRuleData,
  items: VoucherRuleCartItem[],
) {
  const category = normalizeVoucherCategory(voucher.category);

  return items.reduce((total, item) => {
    if (voucher.restaurantId && item.restaurantId !== voucher.restaurantId) {
      return total;
    }

    if (category && normalizeVoucherCategory(item.category) !== category) {
      return total;
    }

    return total + item.discountedPrice * item.quantity;
  }, 0);
}

export function calculateVoucherEligibility({
  voucher,
  items,
  totalUsedCount,
  userUsedCount,
  userOrderCount,
}: {
  voucher: VoucherRuleData;
  items: VoucherRuleCartItem[];
  totalUsedCount: number;
  userUsedCount: number;
  userOrderCount: number;
}): VoucherEligibilityResult {
  const eligibleSubtotal = getVoucherEligibleSubtotal(voucher, items);
  const perUserLimit = Math.max(1, voucher.perUserLimit ?? 1);

  if (!isVoucherUsableNow(voucher)) {
    return {
      eligible: false,
      eligibleSubtotal,
      discount: 0,
      reason: "Voucher belum aktif atau sudah berakhir.",
    };
  }

  if (voucher.quota !== null && totalUsedCount >= voucher.quota) {
    return {
      eligible: false,
      eligibleSubtotal,
      discount: 0,
      reason: "Kuota voucher sudah habis.",
    };
  }

  if (userUsedCount >= perUserLimit) {
    return {
      eligible: false,
      eligibleSubtotal,
      discount: 0,
      reason: "Voucher sudah mencapai limit pemakaian akun ini.",
    };
  }

  if (voucher.firstOrderOnly && userOrderCount > 0) {
    return {
      eligible: false,
      eligibleSubtotal,
      discount: 0,
      reason: "Voucher ini hanya berlaku untuk order pertama.",
    };
  }

  if ((voucher.restaurantId || voucher.category) && eligibleSubtotal <= 0) {
    return {
      eligible: false,
      eligibleSubtotal,
      discount: 0,
      reason: `Voucher hanya berlaku untuk ${getVoucherScopeLabel(voucher).toLowerCase()}.`,
    };
  }

  if (eligibleSubtotal < voucher.minSpend) {
    return {
      eligible: false,
      eligibleSubtotal,
      discount: 0,
      reason: null,
    };
  }

  return {
    eligible: true,
    eligibleSubtotal,
    discount: Math.min(voucher.discount, eligibleSubtotal),
    reason: null,
  };
}
