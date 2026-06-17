import { enforceRateLimit, type RateLimitRule } from "@/lib/rate-limit";

type SessionLike = {
  userId: string;
  role: string;
};

export const securityRateLimitRules = {
  supportCreate: {
    keyPrefix: "support:create",
    max: 8,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak tiket support dibuat. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_SUPPORT_CREATE",
  },
  supportReply: {
    keyPrefix: "support:reply",
    max: 30,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak balasan support. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_SUPPORT_REPLY",
  },
  refundCreate: {
    keyPrefix: "refund:create",
    max: 5,
    windowMs: 30 * 60 * 1000,
    message: "Terlalu banyak pengajuan refund. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_REFUND_CREATE",
  },
  voucherClaim: {
    keyPrefix: "voucher:claim",
    max: 20,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak percobaan klaim voucher. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_VOUCHER_CLAIM",
  },
  reviewCreate: {
    keyPrefix: "review:create",
    max: 12,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak aktivitas ulasan. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_REVIEW_CREATE",
  },
  reviewReport: {
    keyPrefix: "review:report",
    max: 12,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak laporan ulasan. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_REVIEW_REPORT",
  },
  ownerMenuMutation: {
    keyPrefix: "owner:menu-mutation",
    max: 80,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan menu. Tunggu sebentar lalu coba lagi.",
    auditAction: "RATE_LIMIT_OWNER_MENU_MUTATION",
  },
  ownerPayoutRequest: {
    keyPrefix: "owner:payout-request",
    max: 6,
    windowMs: 30 * 60 * 1000,
    message: "Terlalu banyak request pencairan saldo. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_OWNER_PAYOUT_REQUEST",
  },
  ownerOrderMutation: {
    keyPrefix: "owner:order-mutation",
    max: 90,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan status order. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_OWNER_ORDER_MUTATION",
  },
  customerOrderCancel: {
    keyPrefix: "customer:order-cancel",
    max: 8,
    windowMs: 15 * 60 * 1000,
    message: "Terlalu banyak pembatalan order. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_CUSTOMER_ORDER_CANCEL",
  },
  adminUserMutation: {
    keyPrefix: "admin:user-mutation",
    max: 30,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan user. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_USER_MUTATION",
  },
  adminResetPassword: {
    keyPrefix: "admin:reset-password",
    max: 8,
    windowMs: 15 * 60 * 1000,
    message: "Terlalu banyak reset password. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_RESET_PASSWORD",
  },
  adminImpersonation: {
    keyPrefix: "admin:impersonation",
    max: 8,
    windowMs: 15 * 60 * 1000,
    message: "Terlalu banyak percobaan impersonation. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_IMPERSONATION",
  },
  adminSessionRevoke: {
    keyPrefix: "admin:session-revoke",
    max: 30,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak cabut session. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_SESSION_REVOKE",
  },
  adminVoucherMutation: {
    keyPrefix: "admin:voucher-mutation",
    max: 40,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan voucher. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_VOUCHER_MUTATION",
  },
  adminSupportMutation: {
    keyPrefix: "admin:support-mutation",
    max: 50,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan support. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_SUPPORT_MUTATION",
  },
  adminApplicationReview: {
    keyPrefix: "admin:application-review",
    max: 40,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan verifikasi mitra. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_APPLICATION_REVIEW",
  },
  adminPayoutMutation: {
    keyPrefix: "admin:payout-mutation",
    max: 30,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan payout. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_PAYOUT_MUTATION",
  },
  adminRefundMutation: {
    keyPrefix: "admin:refund-mutation",
    max: 30,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan refund. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_REFUND_MUTATION",
  },
  adminSettingsMutation: {
    keyPrefix: "admin:settings-mutation",
    max: 20,
    windowMs: 10 * 60 * 1000,
    message: "Terlalu banyak perubahan pengaturan. Coba lagi nanti.",
    auditAction: "RATE_LIMIT_ADMIN_SETTINGS_MUTATION",
  },
} satisfies Record<string, RateLimitRule>;

export async function enforceSensitiveActionRateLimit(
  request: Request,
  rule: RateLimitRule,
  session?: SessionLike | null,
  identityParts: string[] = [],
) {
  return enforceRateLimit(request, rule, [
    ...(session ? [`user:${session.userId}`, `role:${session.role}`] : []),
    ...identityParts,
  ]);
}
