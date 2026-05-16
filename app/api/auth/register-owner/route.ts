import { ApplicationStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionToken, setSessionCookie } from "@/lib/auth-session";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ownerRegisterSchema = z.object({
  ownerName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
  storeName: z.string().min(3),
  businessType: z.string().min(2),
  address: z.string().min(8),
  city: z.string().min(2).default("Jakarta"),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = ownerRegisterSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Data pendaftaran mitra belum lengkap.",
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
      { ok: false, message: "Email owner sudah terdaftar. Silakan login." },
      { status: 409 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: data.ownerName,
        phone: data.phone,
        passwordHash: hashPassword(data.password),
        role: UserRole.OWNER,
      },
    });

    const application = await tx.restaurantApplication.create({
      data: {
        userId: user.id,
        applicantName: data.ownerName,
        email,
        phone: data.phone,
        businessName: data.storeName,
        businessType: data.businessType,
        address: data.address,
        city: data.city,
        description: data.description,
        status: ApplicationStatus.PENDING,
      },
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Pendaftaran mitra diterima",
        body: "Admin akan meninjau data usaha sebelum dashboard owner aktif.",
        href: "/owner/verify",
      },
    });

    return { user, application };
  });
  const token = await createSessionToken({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.user.role,
    status: result.user.status,
    ownerStatus: "PENDING",
  });
  const response = NextResponse.json(
    {
      ok: true,
      redirectTo: "/owner/verify",
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        ownerStatus: "PENDING",
      },
      application: result.application,
    },
    { status: 201 },
  );

  setSessionCookie(response, token);

  return response;
}
