import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const searchSchema = z.object({
  q: z.string().trim().min(3).max(120),
});

type NominatimSearchResult = {
  place_id: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Ketik minimal 3 huruf nama toko, jalan, atau area.",
      },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "6",
      countrycodes: "id",
      addressdetails: "1",
      "accept-language": "id",
      q: parsed.data.q,
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "Accept-Language": "id",
          "User-Agent": "ResQFood/1.0 (https://resqfood.store)",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("Pencarian lokasi gagal. Coba kata kunci lain.");
    }

    const results = ((await response.json()) as NominatimSearchResult[])
      .filter(
        (result) =>
          result.display_name &&
          Number.isFinite(Number(result.lat)) &&
          Number.isFinite(Number(result.lon)),
      )
      .map((result) => ({
        place_id: result.place_id,
        display_name: result.display_name || "",
        lat: result.lat || "",
        lon: result.lon || "",
      }));

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Pencarian lokasi gagal. Coba lagi.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
