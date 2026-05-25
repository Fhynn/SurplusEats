import { put } from "@vercel/blob";
import {
  ApplicationStatus,
  AssetVisibility,
  UserRole,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionToken, setSessionCookie } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { hashPassword } from "@/lib/password";
import { prisma, type PrismaTransactionClient } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const coordinateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().finite().optional(),
);

const ownerRegisterSchema = z
  .object({
    ownerName: z.string().trim().min(3, "Nama pemilik minimal 3 karakter."),
    email: z.string().trim().email("Format email owner belum valid."),
    phone: z
      .string()
      .trim()
      .min(8, "Nomor WhatsApp minimal 8 digit."),
    password: z.string().min(6, "Password owner minimal 6 karakter."),
    storeName: z.string().trim().min(3, "Nama toko minimal 3 karakter."),
    businessType: z.string().trim().min(2, "Pilih kategori usaha."),
    address: z
      .string()
      .trim()
      .min(
        20,
        "Alamat pickup terlalu pendek. Tulis alamat lengkap, nomor bangunan, area, dan patokan.",
      ),
    city: z.string().trim().min(2, "Kota wajib diisi.").default("Jakarta"),
    latitude: coordinateSchema,
    longitude: coordinateSchema,
    description: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.latitude === undefined && data.longitude === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Titik lokasi toko wajib diisi.",
      });
    }

    if (
      (data.latitude === undefined && data.longitude !== undefined) ||
      (data.latitude !== undefined && data.longitude === undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Titik lokasi toko belum lengkap. Klik Ambil Lokasi lagi.",
      });
    }

    if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["latitude"],
        message: "Titik lokasi toko tidak valid. Klik Ambil Lokasi lagi.",
      });
    }

    if (
      data.longitude !== undefined &&
      (data.longitude < -180 || data.longitude > 180)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["longitude"],
        message: "Titik lokasi toko tidak valid. Klik Ambil Lokasi lagi.",
      });
    }
  });

const documentRequirements = [
  {
    field: "identity",
    type: "IDENTITY",
    label: "Foto KTP Pemilik",
  },
  {
    field: "permit",
    type: "BUSINESS_PERMIT",
    label: "Surat Izin / NIB",
  },
  {
    field: "storefront",
    type: "STOREFRONT_PHOTO",
    label: "Foto Toko",
  },
] as const;

const maxDocumentSize = 6 * 1024 * 1024;
const allowedDocumentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

type RegistrationDocumentFile = {
  type: string;
  label: string;
  file: File;
};

type UploadedRegistrationDocument = {
  type: string;
  label: string;
  url: string;
  pathname: string;
  contentType: string;
  size: number;
};

async function readRegisterPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return {
      payload: await request.json(),
      documents: [] as RegistrationDocumentFile[],
      missingDocuments: [] as string[],
    };
  }

  const formData = await request.formData();
  const getString = (key: string) => {
    const value = formData.get(key);

    return typeof value === "string" ? value : "";
  };
  const documents: RegistrationDocumentFile[] = [];
  const missingDocuments: string[] = [];

  for (const requirement of documentRequirements) {
    const value = formData.get(requirement.field);

    if (!(value instanceof File) || value.size === 0) {
      missingDocuments.push(requirement.label);
      continue;
    }

    documents.push({
      type: requirement.type,
      label: requirement.label,
      file: value,
    });
  }

  return {
    payload: {
      ownerName: getString("ownerName"),
      email: getString("email"),
      phone: getString("phone"),
      password: getString("password"),
      storeName: getString("storeName"),
      businessType: getString("businessType"),
      address: getString("address"),
      city: getString("city") || "Jakarta",
      latitude: getString("latitude") || undefined,
      longitude: getString("longitude") || undefined,
      description: getString("description") || undefined,
    },
    documents,
    missingDocuments,
  };
}

async function uploadRegistrationDocuments(
  email: string,
  documents: RegistrationDocumentFile[],
) {
  const uploadedDocuments: UploadedRegistrationDocument[] = [];

  for (const document of documents) {
    if (document.file.size > maxDocumentSize) {
      throw new Error(`${document.label} melebihi batas 6MB.`);
    }

    if (!allowedDocumentTypes.has(document.file.type)) {
      throw new Error(`${document.label} harus JPG, PNG, WEBP, atau PDF.`);
    }

    const extension = document.file.name.split(".").pop() || "bin";
    const filename = `${slugify(document.type)}-${crypto.randomUUID()}.${extension}`;
    const pathname = `restaurant-verifications/${slugify(email)}/${filename}`;
    const blob = await put(pathname, document.file, {
      access: "public",
      addRandomSuffix: false,
    });

    uploadedDocuments.push({
      type: document.type,
      label: document.label,
      url: blob.url,
      pathname: blob.pathname,
      contentType: document.file.type,
      size: document.file.size,
    });
  }

  return uploadedDocuments;
}

export async function POST(request: Request) {
  const { payload, documents, missingDocuments } =
    await readRegisterPayload(request);
  const parsed = ownerRegisterSchema.safeParse(payload);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstFieldError = Object.values(fieldErrors).flat().find(Boolean);

    return NextResponse.json(
      {
        ok: false,
        message: firstFieldError || "Data pendaftaran mitra belum lengkap.",
        issues: { fieldErrors },
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  if (missingDocuments.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `Dokumen verifikasi wajib diunggah: ${missingDocuments.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { ok: false, message: "Email owner sudah terdaftar. Silakan login." },
      { status: 409 },
    );
  }

  let uploadedDocuments: UploadedRegistrationDocument[] = [];

  try {
    uploadedDocuments = await uploadRegistrationDocuments(email, documents);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Upload dokumen gagal.",
      },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
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
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        status: ApplicationStatus.PENDING,
      },
    });

    for (const document of uploadedDocuments) {
      const asset = await tx.asset.create({
        data: {
          uploadedById: user.id,
          url: document.url,
          pathname: document.pathname,
          contentType: document.contentType,
          size: document.size,
          visibility: AssetVisibility.PUBLIC,
          entityType: "restaurant_application",
          entityId: application.id,
        },
      });

      await tx.verificationDocument.create({
        data: {
          applicationId: application.id,
          assetId: asset.id,
          type: document.type,
          label: document.label,
          status: "submitted",
        },
      });
    }

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
