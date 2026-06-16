import { put } from "@vercel/blob";
import { AssetVisibility } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  documentUploadTypes,
  validateUploadFile,
} from "@/lib/upload-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxUploadSize = 6 * 1024 * 1024;
const allowedTypes = new Set([...documentUploadTypes, "image/gif"]);
const menuImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Login diperlukan untuk upload file." },
        { status: 401 },
      );
    }

    const rateLimit = await enforceRateLimit(
      request,
      {
        keyPrefix: "uploads",
        max: 40,
        windowMs: 10 * 60 * 1000,
        message: "Terlalu banyak upload file. Tunggu beberapa menit lalu coba lagi.",
        auditAction: "UPLOAD_RATE_LIMIT_BLOCKED",
      },
      [session.userId],
    );

    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "File upload wajib dikirim." },
        { status: 400 },
      );
    }

    const validation = await validateUploadFile(file, {
      allowedMimeTypes: allowedTypes,
      maxSizeBytes: maxUploadSize,
      maxSizeMessage: "Ukuran file maksimal 6MB.",
      unsupportedMessage: "Format file belum didukung.",
    });

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, message: validation.message },
        { status: 400 },
      );
    }

    const folder = String(formData.get("folder") || "uploads");
    const entityType = String(formData.get("entityType") || "");
    const entityId = String(formData.get("entityId") || "");
    const visibility =
      formData.get("visibility") === AssetVisibility.PRIVATE
        ? AssetVisibility.PRIVATE
        : AssetVisibility.PUBLIC;

    if (
      entityType === "menu_item" &&
      !menuImageTypes.has(validation.contentType)
    ) {
      return NextResponse.json(
        { ok: false, message: "Gambar menu harus JPG, PNG, atau WEBP." },
        { status: 400 },
      );
    }

    if (entityType === "menu_item" && file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, message: "Ukuran gambar menu maksimal 4MB." },
        { status: 400 },
      );
    }

    const filename = `${slugify(file.name.replace(/\.[^.]+$/, "")) || "file"}-${crypto.randomUUID()}.${validation.extension}`;
    const pathname = `${slugify(folder) || "uploads"}/${filename}`;

    const blob = await put(pathname, file, {
      access: visibility === AssetVisibility.PUBLIC ? "public" : "private",
      addRandomSuffix: false,
    });

    const asset = await prisma.asset.create({
      data: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: validation.contentType,
        size: file.size,
        visibility,
        entityType: entityType || null,
        entityId: entityId || null,
        uploadedById: session.userId,
      },
    });

    return NextResponse.json({
      ok: true,
      asset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Upload gagal.",
      },
      { status: 500 },
    );
  }
}
