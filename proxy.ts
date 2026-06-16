import { NextRequest, NextResponse } from "next/server";

const sessionCookieName = "resqfood_session";

type AuthSession = {
  sessionId?: string;
  userId: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "OWNER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  ownerStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  impersonatedById?: string | null;
  impersonatedByEmail?: string | null;
  impersonatedByName?: string | null;
  exp: number;
};

const publicPaths = new Set([
  "/",
  "/register",
  "/register-mitra",
  "/forgot-password",
  "/tentang-kami",
  "/kebijakan-privasi",
  "/syarat-ketentuan",
  "/kontak",
]);

const publicInformationPaths = new Set([
  "/tentang-kami",
  "/kebijakan-privasi",
  "/syarat-ketentuan",
  "/kontak",
]);

function getSecret() {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!secret || secret.length < 32) {
    return null;
  }

  return secret;
}

function base64UrlDecode(input: string) {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return atob(padded);
}

function base64UrlEncode(input: ArrayBuffer) {
  const bytes = new Uint8Array(input);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return base64UrlEncode(signature);
}

async function readSession(request: NextRequest) {
  const secret = getSecret();
  const token = request.cookies.get(sessionCookieName)?.value;

  if (!secret || !token || !token.includes(".")) {
    return null;
  }

  const [payload, signature] = token.split(".");
  const expectedSignature = await signPayload(payload, secret);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AuthSession;

    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (session.status !== "ACTIVE") {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

async function validateSessionInDatabase(
  request: NextRequest,
  session: AuthSession,
) {
  try {
    const validateUrl = new URL("/api/auth/validate-session", request.url);
    const response = await fetch(validateUrl, {
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      ok?: boolean;
      session?: Omit<AuthSession, "exp">;
    };

    if (!data.ok || !data.session) {
      return null;
    }

    return {
      ...session,
      ...data.session,
      exp: session.exp,
    };
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/";
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(loginUrl);
}

function redirectToLoginAndClearSession(request: NextRequest) {
  const response = redirectToLogin(request);

  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function redirectByRole(request: NextRequest, session: AuthSession) {
  const url = request.nextUrl.clone();

  if (session.role === "ADMIN") {
    url.pathname = "/admin/dashboard";
  } else if (session.role === "OWNER") {
    url.pathname =
      session.ownerStatus === "APPROVED" ? "/owner/dashboard" : "/owner/verify";
  } else {
    url.pathname = "/home";
  }

  url.search = "";

  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const tokenSession = await readSession(request);
  const isPublicPath = publicPaths.has(pathname);
  const isRegistrationPath =
    pathname === "/register" || pathname === "/register-mitra";
  const session = tokenSession
    ? await validateSessionInDatabase(request, tokenSession)
    : null;

  if (isPublicPath) {
    if (tokenSession && !session) {
      return redirectToLoginAndClearSession(request);
    }

    if (
      session &&
      !isRegistrationPath &&
      !publicInformationPaths.has(pathname)
    ) {
      return redirectByRole(request, session);
    }

    return NextResponse.next();
  }

  if (!session) {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return redirectToLoginAndClearSession(request);
  }

  if (pathname.startsWith("/owner")) {
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      return redirectByRole(request, session);
    }

    if (
      session.role === "OWNER" &&
      session.ownerStatus !== "APPROVED" &&
      pathname !== "/owner/verify" &&
      pathname !== "/owner/banned"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/owner/verify";
      url.search = "";

      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
