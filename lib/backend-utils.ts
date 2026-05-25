import { randomInt } from "node:crypto";

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const digitAlphabet = "0123456789";

function createRandomCode(alphabet: string, length: number) {
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export const createOrderCode = () => {
  const suffix = createRandomCode(codeAlphabet, 8);

  return `RQF-${suffix}`;
};

export const createPickupCode = () => createRandomCode(digitAlphabet, 6);

export const createPayoutReference = () =>
  `PAYOUT-${Date.now().toString(36).toUpperCase()}-${createRandomCode(
    codeAlphabet,
    6,
  )}`;
