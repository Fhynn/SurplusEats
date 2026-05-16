import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionToken, setSessionCookie } from "@/lib/auth-session";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
  preferences: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data pendaftaran belum lengkap.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { ok: false, message: "Email sudah terdaftar. Silakan login." },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      phone: data.phone,
      passwordHash: hashPassword(data.password),
      role: UserRole.CUSTOMER,
    },
  });
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    ownerStatus: "NONE",
  });
  const response = NextResponse.json(
    {
      ok: true,
      redirectTo: "/home",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
    { status: 201 },
  );

  setSessionCookie(response, token);

  return response;
}
