import { put } from "@vercel/blob";
import { AssetVisibility } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth-session";
import { slugify } from "@/lib/backend-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxUploadSize = 6 * 1024 * 1024;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Login diperlukan untuk upload file." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "File upload wajib dikirim." },
        { status: 400 },
      );
    }

    if (file.size > maxUploadSize) {
      return NextResponse.json(
        { ok: false, message: "Ukuran file maksimal 6MB." },
        { status: 400 },
      );
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { ok: false, message: "Format file belum didukung." },
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
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
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

    const extension = file.name.split(".").pop() || "bin";
    const filename = `${slugify(file.name.replace(/\.[^.]+$/, "")) || "file"}-${crypto.randomUUID()}.${extension}`;
    const pathname = `${slugify(folder) || "uploads"}/${filename}`;

    const blob = await put(pathname, file, {
      access: visibility === AssetVisibility.PUBLIC ? "public" : "private",
      addRandomSuffix: false,
    });

    const asset = await prisma.asset.create({
      data: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: file.type,
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
