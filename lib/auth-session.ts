import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { UserRole, UserStatus } from "@prisma/client";

export const sessionCookieName = "resqfood_session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;
export const transientSessionMaxAgeSeconds = 60 * 60 * 8;

export type OwnerAccessStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export type AuthSession = {
  sessionId?: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  ownerStatus: OwnerAccessStatus;
  impersonatedById?: string | null;
  impersonatedByEmail?: string | null;
  impersonatedByName?: string | null;
  exp: number;
};

const getSecret = () => {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("NEON_AUTH_COOKIE_SECRET must be at least 32 characters");
  }

  return secret;
};

const base64UrlEncode = (input: string | Uint8Array) => {
  const buffer =
    typeof input === "string" ? Buffer.from(input) : Buffer.from(input);

  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

const base64UrlDecode = (input: string) => {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64").toString("utf8");
};

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return base64UrlEncode(new Uint8Array(signature));
}

export async function createSessionToken(
  session: Omit<AuthSession, "exp">,
  rememberMe = true,
  maxAgeSeconds = getSessionMaxAgeSeconds(rememberMe),
) {
  const payload: AuthSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function getSessionMaxAgeSeconds(rememberMe = true) {
  return rememberMe ? sessionMaxAgeSeconds : transientSessionMaxAgeSeconds;
}

export function getSessionExpiresAt(rememberMe = true, maxAgeSeconds?: number) {
  return new Date(
    Date.now() + (maxAgeSeconds ?? getSessionMaxAgeSeconds(rememberMe)) * 1000,
  );
}

export async function verifySessionToken(token?: string) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = await signPayload(encodedPayload);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(encodedPayload)) as AuthSession;

    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds = sessionMaxAgeSeconds,
) {
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  return verifySessionToken(token);
}
