const supportedBankCodes = new Set([
  "BCA",
  "BNI",
  "BRI",
  "BSI",
  "BTN",
  "CIMB",
  "DANAMON",
  "MANDIRI",
  "MAYBANK",
  "OCBC",
  "PERMATA",
  "SEABANK",
]);

export type BankAccountInput = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
};

export type ValidatedBankAccount = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  validationStatus: "VALIDATED";
  maskedAccountNumber: string;
};

function normalizeBankName(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeAccountHolder(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeAccountNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function maskBankAccount(accountNumber: string) {
  if (accountNumber.length <= 4) {
    return accountNumber;
  }

  return `${"*".repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`;
}

export function validateBankAccount(input: BankAccountInput) {
  const bankName = normalizeBankName(input.bankName);
  const accountNumber = normalizeAccountNumber(input.accountNumber);
  const accountHolder = normalizeAccountHolder(input.accountHolder);
  const errors: string[] = [];

  if (!bankName || bankName.length < 2 || bankName.length > 40) {
    errors.push("Nama bank wajib diisi 2-40 karakter.");
  }

  if (bankName && !/^[A-Z0-9 .-]+$/.test(bankName)) {
    errors.push("Nama bank hanya boleh berisi huruf, angka, spasi, titik, atau strip.");
  }

  if (bankName && !supportedBankCodes.has(bankName) && bankName.length < 4) {
    errors.push("Kode bank terlalu pendek. Tulis nama bank lengkap.");
  }

  if (accountNumber.length < 8 || accountNumber.length > 20) {
    errors.push("Nomor rekening harus 8-20 digit.");
  }

  if (accountHolder.length < 3 || accountHolder.length > 80) {
    errors.push("Nama pemilik rekening wajib diisi 3-80 karakter.");
  }

  if (accountHolder && !/^[A-Za-z0-9 .,'-]+$/.test(accountHolder)) {
    errors.push("Nama pemilik rekening berisi karakter yang tidak valid.");
  }

  if (errors.length > 0) {
    return {
      ok: false as const,
      errors,
    };
  }

  return {
    ok: true as const,
    account: {
      bankName,
      accountNumber,
      accountHolder,
      validationStatus: "VALIDATED",
      maskedAccountNumber: maskBankAccount(accountNumber),
    } satisfies ValidatedBankAccount,
  };
}

export function getOwnerPayoutFee() {
  const configuredFee = Number(process.env.OWNER_PAYOUT_FEE);

  if (!Number.isFinite(configuredFee) || configuredFee < 0) {
    return 2_500;
  }

  return Math.round(configuredFee);
}

export function getOwnerWalletSettlementHours() {
  const configuredHours = Number(process.env.OWNER_WALLET_SETTLEMENT_HOURS);

  if (!Number.isFinite(configuredHours) || configuredHours < 0) {
    return 0;
  }

  return configuredHours;
}

export function buildPayoutDescription({
  amount,
  payoutFee,
  payoutNetAmount,
  bankName,
  maskedAccountNumber,
  accountHolder,
}: {
  amount: number;
  payoutFee: number;
  payoutNetAmount: number;
  bankName: string;
  maskedAccountNumber: string;
  accountHolder: string;
}) {
  return `Request pencairan ${bankName} ${maskedAccountNumber} a.n. ${accountHolder}. Transfer bersih Rp${payoutNetAmount.toLocaleString("id-ID")} setelah fee Rp${payoutFee.toLocaleString("id-ID")} dari nominal Rp${amount.toLocaleString("id-ID")}.`;
}
