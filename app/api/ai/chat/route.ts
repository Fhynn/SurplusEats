import { MenuItemStatus, RestaurantStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatSchema = z.object({
  message: z.string().trim().min(2).max(1200),
  cart: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        restaurant: z.string(),
        qty: z.coerce.number().int().min(1).max(20),
        price: z.coerce.number().int().nonnegative(),
        stock: z.coerce.number().int().nonnegative().optional(),
        category: z.string().optional(),
      }),
    )
    .max(20)
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1200),
      }),
    )
    .max(8)
    .optional(),
});

const aiResponseSchema = z.object({
  reply: z.string().min(1),
  intent: z
    .enum(["recommendation", "checkout", "cart", "order", "support", "general"])
    .optional(),
  recommendedMenuItemIds: z.array(z.coerce.string()).optional(),
  checkoutReady: z.boolean().optional(),
  quickReplies: z.array(z.coerce.string().trim().min(1).max(80)).optional(),
});

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type AiResult = {
  reply: string;
  intent?: "recommendation" | "checkout" | "cart" | "order" | "support" | "general";
  recommendedMenuItemIds?: string[];
  checkoutReady?: boolean;
  quickReplies?: string[];
};

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type MenuContextItem = Awaited<ReturnType<typeof loadMenuContext>>["menuItems"][number];
type TastePreference = "pedas" | "manis" | "gurih";

const tasteKeywordMap: Record<TastePreference, string[]> = {
  pedas: ["pedas", "sambal", "geprek", "balado", "rica", "mercon", "spicy"],
  manis: [
    "manis",
    "dessert",
    "roti",
    "kue",
    "cake",
    "brownies",
    "puding",
    "cokelat",
    "minuman",
    "teh",
    "kopi",
  ],
  gurih: [
    "gurih",
    "ayam",
    "nasi",
    "mie",
    "bakso",
    "soto",
    "goreng",
    "telur",
    "keju",
    "rendang",
  ],
};

function formatRp(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPreviousAssistantMessage(history: ChatHistoryItem[]) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].role === "assistant") {
      return history[index].content;
    }
  }

  return "";
}

function getTastePreference(message: string): TastePreference | null {
  const normalized = normalizeText(message);
  const words = normalized.split(" ").filter(Boolean);

  if (words.length > 5) {
    return null;
  }

  if (words.includes("pedas")) {
    return "pedas";
  }

  if (words.includes("manis")) {
    return "manis";
  }

  if (words.includes("gurih")) {
    return "gurih";
  }

  return null;
}

function askedTastePreference(message: string) {
  const normalized = normalizeText(message);

  return (
    normalized.includes("pedas") &&
    normalized.includes("manis") &&
    normalized.includes("gurih") &&
    ["suka", "pilih", "mau", "selera"].some((word) => normalized.includes(word))
  );
}

function calculateDiscountRate(menuItem: MenuContextItem) {
  if (menuItem.originalPrice <= 0) {
    return 0;
  }

  return (menuItem.originalPrice - menuItem.discountedPrice) / menuItem.originalPrice;
}

function scoreMenuItemForTaste(menuItem: MenuContextItem, preference: TastePreference) {
  const searchableText = normalizeText(
    [
      menuItem.name,
      menuItem.description,
      menuItem.category,
      menuItem.restaurant.name,
    ].join(" "),
  );

  return tasteKeywordMap[preference].reduce(
    (score, keyword) => score + (searchableText.includes(keyword) ? 1 : 0),
    0,
  );
}

function pickMenuRecommendations(
  menuItems: MenuContextItem[],
  preference?: TastePreference,
) {
  const scoredItems = menuItems
    .map((menuItem) => ({
      menuItem,
      tasteScore: preference ? scoreMenuItemForTaste(menuItem, preference) : 0,
      discountRate: calculateDiscountRate(menuItem),
    }))
    .sort((first, second) => {
      if (second.tasteScore !== first.tasteScore) {
        return second.tasteScore - first.tasteScore;
      }

      if (second.discountRate !== first.discountRate) {
        return second.discountRate - first.discountRate;
      }

      const secondRating = second.menuItem.restaurant.rating || 0;
      const firstRating = first.menuItem.restaurant.rating || 0;

      if (secondRating !== firstRating) {
        return secondRating - firstRating;
      }

      return second.menuItem.stock - first.menuItem.stock;
    });

  const tasteMatches = preference
    ? scoredItems.filter((item) => item.tasteScore > 0).slice(0, 4)
    : [];

  return (tasteMatches.length ? tasteMatches : scoredItems.slice(0, 4)).map(
    (item) => item.menuItem,
  );
}

function buildTastePreferenceReply(
  message: string,
  history: ChatHistoryItem[],
  menuItems: MenuContextItem[],
  cartCount: number,
): AiResult | null {
  const preference = getTastePreference(message);

  if (!preference || !askedTastePreference(getPreviousAssistantMessage(history))) {
    return null;
  }

  const selectedMenuItems = pickMenuRecommendations(menuItems, preference);

  if (!selectedMenuItems.length) {
    return {
      reply: `Siap, aku lanjut pilih yang ${preference}, tapi stok aktif belum ada yang cocok. Coba cek lagi nanti atau pilih preferensi lain.`,
      intent: "recommendation",
      checkoutReady: false,
      quickReplies: ["Cari yang hemat", "Cek keranjang"],
    };
  }

  const itemSummary = selectedMenuItems
    .slice(0, 3)
    .map((item) => `${item.name} dari ${item.restaurant.name}`)
    .join(", ");

  return {
    reply: `Siap, aku lanjut pilih yang ${preference}. Yang paling cocok sekarang: ${itemSummary}. Aku sudah urutkan dari stok aktif, diskon, dan rating.`,
    intent: "recommendation",
    recommendedMenuItemIds: selectedMenuItems.map((item) => item.id),
    checkoutReady: false,
    quickReplies: cartCount > 0
      ? ["Cek keranjang", "Cari yang lebih hemat", "Bandingkan rating"]
      : ["Cari yang lebih hemat", "Bandingkan rating", "Tampilkan opsi lain"],
  };
}

function buildRepeatedReplyFallback(menuItems: MenuContextItem[]): AiResult | null {
  const selectedMenuItems = pickMenuRecommendations(menuItems);

  if (!selectedMenuItems.length) {
    return null;
  }

  return {
    reply:
      "Aku lanjutkan dari jawaban sebelumnya. Ini beberapa menu aktif dengan diskon dan rating paling menarik buat dipilih sekarang.",
    intent: "recommendation",
    recommendedMenuItemIds: selectedMenuItems.map((item) => item.id),
    checkoutReady: false,
    quickReplies: ["Cari yang lebih hemat", "Bandingkan rating", "Cek keranjang"],
  };
}

function buildNoActiveMenuReply(message: string, cartCount: number): AiResult | null {
  if (!isRecommendationRequest(message)) {
    return null;
  }

  return {
    reply:
      "Belum ada menu aktif yang stoknya tersedia, jadi aku belum bisa rekomendasikan makanan sekarang. Coba cek lagi nanti setelah toko menambah stok.",
    intent: "recommendation",
    checkoutReady: false,
    quickReplies: cartCount > 0
      ? ["Cek keranjang", "Bantu checkout"]
      : ["Cek keranjang", "Coba lagi nanti"],
  };
}

function isRecommendationRequest(message: string) {
  const normalized = normalizeText(message);

  return ["rekomendasi", "menu", "makanan", "hemat", "diskon", "rating"].some(
    (keyword) => normalized.includes(keyword),
  );
}

function ensureRecommendationCards(
  aiResult: AiResult,
  menuItems: MenuContextItem[],
  message: string,
): AiResult {
  const allowedIds = new Set(menuItems.map((item) => item.id));
  const hasValidRecommendationIds = Boolean(
    aiResult.recommendedMenuItemIds?.some((id) => allowedIds.has(id)),
  );

  if (
    hasValidRecommendationIds ||
    !menuItems.length ||
    (aiResult.intent !== "recommendation" && !isRecommendationRequest(message))
  ) {
    return aiResult;
  }

  const selectedMenuItems = pickMenuRecommendations(
    menuItems,
    getTastePreference(message) || undefined,
  );

  return {
    ...aiResult,
    intent: "recommendation",
    recommendedMenuItemIds: selectedMenuItems.map((item) => item.id),
    quickReplies: aiResult.quickReplies?.length
      ? aiResult.quickReplies
      : ["Cari yang lebih hemat", "Bandingkan rating", "Cek keranjang"],
  };
}

function isRepeatedAssistantReply(reply: string, previousAssistantMessage: string) {
  const normalizedReply = normalizeText(reply);
  const normalizedPrevious = normalizeText(previousAssistantMessage);

  return (
    normalizedReply.length > 20 &&
    normalizedReply === normalizedPrevious
  );
}

function sanitizeQuickReplies(quickReplies: string[]) {
  const seenReplies = new Set<string>();
  const actionLikePrefixes = [
    "tambah",
    "masukkan",
    "beli",
    "pesan",
    "bayar",
    "checkout",
    "lanjut checkout",
    "lihat detail",
  ];

  return quickReplies
    .map((reply) => reply.trim())
    .filter((reply) => {
      const normalized = normalizeText(reply);

      if (
        !normalized ||
        seenReplies.has(normalized) ||
        actionLikePrefixes.some((prefix) => normalized.startsWith(prefix))
      ) {
        return false;
      }

      seenReplies.add(normalized);
      return true;
    })
    .slice(0, 4);
}

function mapRecommendation(
  menuItem: MenuContextItem,
) {
  const pickupStart = menuItem.pickupStart || menuItem.restaurant.pickupStart || "18:00";
  const pickupEnd = menuItem.pickupEnd || menuItem.restaurant.pickupEnd || "21:00";

  return {
    id: menuItem.id,
    name: menuItem.name,
    description: menuItem.description,
    category: menuItem.category,
    restaurant: menuItem.restaurant.name,
    originalPrice: menuItem.originalPrice,
    discountedPrice: menuItem.discountedPrice,
    stock: menuItem.stock,
    imageUrl: menuItem.imageUrl,
    pickupWindow: `${pickupStart} - ${pickupEnd}`,
    rating: menuItem.restaurant.rating || 4.8,
    reviews: menuItem.restaurant.reviewCount,
  };
}

function buildChatResponse(aiResult: AiResult, menuItems: MenuContextItem[]) {
  const allowedIds = new Set(menuItems.map((item) => item.id));
  const recommendedIds = (aiResult.recommendedMenuItemIds || [])
    .filter((id) => allowedIds.has(id))
    .slice(0, 4);
  const recommendations = recommendedIds
    .map((id) => menuItems.find((item) => item.id === id))
    .filter((item): item is MenuContextItem => Boolean(item))
    .map(mapRecommendation);

  return {
    ok: true,
    reply: aiResult.reply,
    intent: aiResult.intent || "general",
    checkoutReady: Boolean(aiResult.checkoutReady),
    quickReplies: sanitizeQuickReplies(aiResult.quickReplies || []),
    recommendations,
  };
}

async function loadMenuContext() {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      status: MenuItemStatus.ACTIVE,
      stock: { gt: 0 },
      restaurant: {
        status: RestaurantStatus.APPROVED,
      },
    },
    include: {
      restaurant: true,
    },
    orderBy: [{ soldCount: "desc" }, { stock: "asc" }, { createdAt: "desc" }],
    take: 40,
  });

  return { menuItems };
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || session.role !== UserRole.CUSTOMER) {
    return NextResponse.json(
      { ok: false, message: "Login customer diperlukan untuk memakai AI." },
      { status: session ? 403 : 401 },
    );
  }

  const parsed = chatSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pertanyaan AI belum valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const { message, cart = [], history = [] } = parsed.data;
  const now = new Date();
  const [{ menuItems }, user, orders, vouchers] = await Promise.all([
    loadMenuContext(),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    }),
    prisma.order.findMany({
      where: { customerId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        orderCode: true,
        status: true,
        total: true,
        createdAt: true,
        restaurant: { select: { name: true } },
        items: {
          take: 3,
          select: {
            menuNameSnapshot: true,
            quantity: true,
          },
        },
      },
    }),
    prisma.voucher.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ discount: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        code: true,
        title: true,
        description: true,
        discount: true,
        minSpend: true,
      },
    }),
  ]);
  const cartItemCount = cart.reduce((total, item) => total + item.qty, 0);
  const previousAssistantMessage = getPreviousAssistantMessage(history);
  const noActiveMenuResult = menuItems.length
    ? null
    : buildNoActiveMenuReply(message, cartItemCount);

  if (noActiveMenuResult) {
    return NextResponse.json(buildChatResponse(noActiveMenuResult, menuItems));
  }

  const localTasteResult = buildTastePreferenceReply(
    message,
    history,
    menuItems,
    cartItemCount,
  );

  if (localTasteResult) {
    return NextResponse.json(buildChatResponse(localTasteResult, menuItems));
  }

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "GEMINI_API_KEY belum diatur di env." },
      { status: 503 },
    );
  }

  const menuContext = menuItems.map((item) => ({
    id: item.id,
    name: item.name,
    restaurant: item.restaurant.name,
    category: item.category,
    description: item.description,
    price: item.discountedPrice,
    originalPrice: item.originalPrice,
    discountText: `${Math.max(
      0,
      Math.round(((item.originalPrice - item.discountedPrice) / item.originalPrice) * 100),
    )}%`,
    stock: item.stock,
    pickupWindow: `${item.pickupStart || item.restaurant.pickupStart || "18:00"} - ${
      item.pickupEnd || item.restaurant.pickupEnd || "21:00"
    }`,
    rating: item.restaurant.rating || 4.8,
    reviews: item.restaurant.reviewCount,
  }));
  const cartTotal = cart.reduce((total, item) => total + item.price * item.qty, 0);
  const promptPayload = {
    user: {
      name: user?.name || session.name,
      email: user?.email || session.email,
    },
    cart: {
      items: cart,
      total: cartTotal,
      totalText: formatRp(cartTotal),
      count: cart.reduce((total, item) => total + item.qty, 0),
    },
    menuItems: menuContext,
    recentOrders: orders.map((order) => ({
      code: order.orderCode,
      status: order.status,
      restaurant: order.restaurant.name,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => `${item.quantity}x ${item.menuNameSnapshot}`),
    })),
    vouchers,
    latestUserMessage: message,
    lastAssistantMessage: previousAssistantMessage,
    contextHint: getTastePreference(message)
      ? "latestUserMessage kemungkinan jawaban quick reply dari assistant sebelumnya. Lanjutkan konteks sebelumnya dan jangan ulangi pertanyaan yang sama."
      : null,
    history: history.slice(-6),
  };

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                "Kamu adalah SurplusEats AI, asisten customer di aplikasi surplus food.",
                "Bantu user memilih makanan enak, hemat, stok aman, pickup jelas, voucher, status pesanan, refund, dan persiapan checkout.",
                "Gunakan hanya data menu, cart, voucher, dan order yang diberikan. Jangan mengarang toko, stok, harga, atau status.",
                "Jika user minta rekomendasi menu atau makanan, pilih 2-4 recommendedMenuItemIds langsung dari menuItems.",
                "Kalau user minta checkout: jika cart kosong, rekomendasikan menu dan minta user tambah ke keranjang; jika cart terisi, jelaskan ringkas dan set checkoutReady true.",
                "Jika user membalas pilihan pendek dari pertanyaanmu sebelumnya, lanjutkan alur sebelumnya. Jangan ulangi pertanyaan assistant terakhir.",
                "Field reply tidak boleh sama persis dengan pesan assistant sebelumnya, dan quickReplies jangan ditulis di dalam reply.",
                "quickReplies hanya untuk pertanyaan lanjutan singkat. Jangan buat quickReplies untuk aksi tambah ke keranjang, lihat detail, bayar, atau checkout.",
                "Jawab bahasa Indonesia santai, jelas, dan pendek. Jangan mengaku sudah membuat pembayaran/order.",
                "Balas JSON valid saja dengan shape: {\"reply\":\"teks jawaban untuk user, bukan JSON string\",\"intent\":\"recommendation|checkout|cart|order|support|general\",\"recommendedMenuItemIds\":[\"id\"],\"checkoutReady\":false,\"quickReplies\":[\"...\"]}.",
                "recommendedMenuItemIds hanya boleh berisi id dari menuItems.",
                "quickReplies maksimal 4 item.",
              ].join(" "),
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: JSON.stringify(promptPayload),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const geminiData = (await geminiResponse.json()) as GeminiResponse;

  if (!geminiResponse.ok) {
    const quotaMessage =
      geminiResponse.status === 429
        ? "Kuota Gemini API habis atau billing belum aktif. Cek quota/billing di Google AI Studio."
        : null;

    return NextResponse.json(
      {
        ok: false,
        message:
          quotaMessage ||
          geminiData.error?.message ||
          "AI belum bisa merespons. Coba lagi sebentar.",
      },
      { status: 502 },
    );
  }

  const generatedText =
    geminiData.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";
  const aiPayload = aiResponseSchema.safeParse(extractJson(generatedText));
  const rawAiResult: AiResult = aiPayload.success
    ? aiPayload.data
    : {
        reply:
          generatedText ||
          "Aku belum bisa membaca jawaban AI. Coba tanya ulang dengan lebih singkat.",
        intent: "general",
        recommendedMenuItemIds: [],
        checkoutReady: false,
        quickReplies: ["Rekomendasikan menu hemat", "Bantu cek keranjang"],
      };
  const repeatedReplyFallback = isRepeatedAssistantReply(
    rawAiResult.reply,
    previousAssistantMessage,
  )
    ? buildRepeatedReplyFallback(menuItems)
    : null;
  const aiResult = repeatedReplyFallback || rawAiResult;

  return NextResponse.json(
    buildChatResponse(ensureRecommendationCards(aiResult, menuItems, message), menuItems),
  );
}
