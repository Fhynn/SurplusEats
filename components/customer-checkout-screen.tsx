"use client";

import Image from "next/image";
import {
  Banknote,
  ChevronLeft,
  Clock3,
  CreditCard,
  Leaf,
  MapPin,
  MessageSquareText,
  Navigation,
  ReceiptText,
  Store,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCustomerApp } from "@/components/customer-app-provider";
import { CustomerLocationControl } from "@/components/customer-location-control";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";
import { formatRp, type CartItem } from "@/lib/customer-data";
import type { CustomerLocation } from "@/lib/customer-location";
import {
  calculateDistanceKm,
  formatDistance,
  getPickupRouteUrl,
  type Coordinates,
} from "@/lib/geo-distance";
import {
  showSweetError,
  showSweetSuccess,
  showSweetWarning,
} from "@/lib/sweet-alert";

const pickupOptions = [
  {
    id: "early",
    time: "19:00 - 20:00",
    label: "Paling aman",
    description: "Ambil lebih awal agar kualitas makanan tetap optimal.",
  },
  {
    id: "late",
    time: "20:00 - 21:00",
    label: "Setelah kerja",
    description: "Cocok untuk pickup setelah jam pulang.",
  },
] as const;

const preferredPaymentChannelCodes = [
  "QRIS",
  "QRIS2",
  "QRISC",
  "DANA",
  "OVO",
  "SHOPEEPAY",
  "BRIVA",
  "MANDIRIVA",
  "BNIVA",
  "BCAVA",
];

type CheckoutPaymentChannel = {
  group: string;
  code: string;
  name: string;
  type: string;
  minimumAmount: number;
  maximumAmount: number;
  feeMerchant: {
    flat: number;
    percent: number;
  };
  feeCustomer: {
    flat: number;
    percent: number;
  };
  totalFee: {
    flat: number;
    percent: number;
  };
};

type CheckoutFeePreview = {
  serviceFee: number;
  taxFee: number;
  customerFeeTotal: number;
};

const fallbackFeePreview: CheckoutFeePreview = {
  serviceFee: 2000,
  taxFee: 0,
  customerFeeTotal: 2000,
};

function sortPaymentChannels(channels: CheckoutPaymentChannel[]) {
  return [...channels].sort((first, second) => {
    const firstPriority = preferredPaymentChannelCodes.indexOf(first.code);
    const secondPriority = preferredPaymentChannelCodes.indexOf(second.code);

    return (
      (firstPriority === -1 ? Number.MAX_SAFE_INTEGER : firstPriority) -
        (secondPriority === -1 ? Number.MAX_SAFE_INTEGER : secondPriority) ||
      first.name.localeCompare(second.name)
    );
  });
}

function getPaymentChannelPresentation(channel: CheckoutPaymentChannel) {
  const normalizedGroup = channel.group.toLowerCase();
  const normalizedName = channel.name.toLowerCase();

  if (
    normalizedName.includes("qris") ||
    normalizedGroup.includes("qr")
  ) {
    return {
      Icon: CreditCard,
      iconClassName: "bg-blue-100/60 text-blue-600",
    };
  }

  if (
    normalizedGroup.includes("e-wallet") ||
    normalizedGroup.includes("wallet")
  ) {
    return {
      Icon: Wallet,
      iconClassName: "bg-emerald-100/60 text-emerald-600",
    };
  }

  return {
    Icon: Banknote,
    iconClassName: "bg-amber-100/60 text-amber-600",
  };
}

function createCheckoutIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type CheckoutVoucher = {
  code: string;
  discount: number;
  minSpendAmount: number;
  status: "available" | "used" | "expired";
  title: string;
  restaurantId?: string | null;
  restaurantName?: string | null;
  category?: string | null;
};

type CheckoutPickupStore = {
  key: string;
  name: string;
  address: string;
  city: string;
  coordinates: Coordinates | null;
  itemCount: number;
  quantity: number;
  pickupWindows: string[];
};

function getCheckoutPickupStores(cart: CartItem[]) {
  const stores = new Map<string, CheckoutPickupStore>();

  for (const item of cart) {
    const key =
      item.restaurantId ||
      `${item.restaurant}-${item.restaurantLatitude ?? "no-lat"}-${item.restaurantLongitude ?? "no-lng"}`;
    const coordinates =
      item.restaurantLatitude !== null &&
      item.restaurantLatitude !== undefined &&
      item.restaurantLongitude !== null &&
      item.restaurantLongitude !== undefined
        ? {
            latitude: item.restaurantLatitude,
            longitude: item.restaurantLongitude,
          }
        : null;
    const currentStore = stores.get(key);

    if (currentStore) {
      currentStore.itemCount += 1;
      currentStore.quantity += item.qty;

      if (!currentStore.pickupWindows.includes(item.time)) {
        currentStore.pickupWindows.push(item.time);
      }

      continue;
    }

    stores.set(key, {
      key,
      name: item.restaurant,
      address: item.restaurantAddress || "Alamat toko belum tersedia.",
      city: item.restaurantCity || "",
      coordinates,
      itemCount: 1,
      quantity: item.qty,
      pickupWindows: [item.time],
    });
  }

  return Array.from(stores.values());
}

function normalizeVoucherCategory(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getVoucherScopeText(voucher: CheckoutVoucher) {
  const labels: string[] = [];

  if (voucher.restaurantName) {
    labels.push(`toko ${voucher.restaurantName}`);
  }

  if (voucher.category) {
    labels.push(`kategori ${voucher.category}`);
  }

  return labels.length > 0 ? labels.join(" dan ") : "semua menu";
}

function getVoucherEligibleSubtotal(voucher: CheckoutVoucher, cart: CartItem[]) {
  const category = normalizeVoucherCategory(voucher.category);

  return cart.reduce((total, item) => {
    if (voucher.restaurantId && item.restaurantId !== voucher.restaurantId) {
      return total;
    }

    if (category && normalizeVoucherCategory(item.category) !== category) {
      return total;
    }

    return total + item.price * item.qty;
  }, 0);
}

export function CustomerCheckoutScreen() {
  const router = useRouter();
  const {
    cart,
    cartCount,
    cartTotal,
    originalTotal,
    totalSaved,
    customerLocation,
    isCustomerLocationLoading,
    setCustomerLocation,
  } = useCustomerApp();
  const [pickupTime, setPickupTime] =
    useState<(typeof pickupOptions)[number]["id"]>("early");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentChannels, setPaymentChannels] = useState<
    CheckoutPaymentChannel[]
  >([]);
  const [isPaymentChannelsLoading, setIsPaymentChannelsLoading] =
    useState(true);
  const [paymentChannelsError, setPaymentChannelsError] = useState<
    string | null
  >(null);
  const [notes, setNotes] = useState("");
  const [agreePickup, setAgreePickup] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [activeVoucher, setActiveVoucher] = useState<CheckoutVoucher | null>(
    null,
  );
  const [voucherNotice, setVoucherNotice] = useState<string | null>(null);
  const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);
  const [feePreview, setFeePreview] =
    useState<CheckoutFeePreview>(fallbackFeePreview);
  const checkoutIdempotencyKeyRef = useRef(createCheckoutIdempotencyKey());

  const voucherEligibleSubtotal = activeVoucher
    ? getVoucherEligibleSubtotal(activeVoucher, cart)
    : 0;
  const voucherDiscount = activeVoucher
    ? Math.min(activeVoucher.discount, voucherEligibleSubtotal)
    : 0;
  const checkoutNetSubtotal = Math.max(0, cartTotal - voucherDiscount);
  const grandTotal = checkoutNetSubtotal + feePreview.customerFeeTotal;
  const compatiblePaymentChannels = useMemo(
    () =>
      sortPaymentChannels(
        paymentChannels.filter(
          (channel) =>
            grandTotal >= channel.minimumAmount &&
            grandTotal <= channel.maximumAmount,
        ),
      ),
    [grandTotal, paymentChannels],
  );
  const selectedPaymentChannel =
    compatiblePaymentChannels.find((channel) => channel.code === paymentMethod) ??
    null;
  const selectedPaymentCustomerFee = selectedPaymentChannel
    ? selectedPaymentChannel.feeCustomer.flat +
      Math.ceil(
        (grandTotal * selectedPaymentChannel.feeCustomer.percent) / 100,
      )
    : 0;
  const totalPaymentAmount = grandTotal + selectedPaymentCustomerFee;
  const selectedPickup = pickupOptions.find((item) => item.id === pickupTime);
  const hasCustomerCoordinates = Boolean(customerLocation.coordinates);
  const pickupStores = useMemo(() => getCheckoutPickupStores(cart), [cart]);
  const hasRestaurantCoordinates = pickupStores.every(
    (store) => store.coordinates,
  );
  const locationIssue = !hasCustomerCoordinates
      ? "Aktifkan lokasi otomatis dulu sebelum checkout agar rute pickup memakai titik customer yang benar."
      : !hasRestaurantCoordinates
        ? "Restoran di keranjang belum punya titik lokasi. Minta mitra melengkapi lokasi toko dulu."
      : "";
  const canPay =
    agreePickup &&
    !isSubmittingOrder &&
    !isCustomerLocationLoading &&
    !isPaymentChannelsLoading &&
    Boolean(selectedPaymentChannel) &&
    !locationIssue;
  const paymentBlockNotice =
    checkoutNotice ||
    locationIssue ||
    paymentChannelsError ||
    (isPaymentChannelsLoading
      ? "Memuat metode pembayaran Tripay..."
      : compatiblePaymentChannels.length === 0
        ? "Tidak ada metode Tripay yang mendukung nominal pembayaran ini."
        : !selectedPaymentChannel
          ? "Pilih metode pembayaran sebelum melanjutkan."
          : null) ||
    (!agreePickup
      ? "Centang ketentuan pickup dulu sebelum melanjutkan pembayaran."
      : null);

  useEffect(() => {
    let ignore = false;

    async function loadFeePreview() {
      try {
        const response = await fetch(
          `/api/checkout/fees?amount=${checkoutNetSubtotal}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          ok: boolean;
          fees?: CheckoutFeePreview;
        };

        if (!ignore && response.ok && data.ok && data.fees) {
          setFeePreview(data.fees);
        }
      } catch {
        if (!ignore) {
          setFeePreview(fallbackFeePreview);
        }
      }
    }

    void loadFeePreview();

    return () => {
      ignore = true;
    };
  }, [checkoutNetSubtotal]);

  const handleLocationChange = (nextLocation: CustomerLocation) => {
    setCustomerLocation(nextLocation);
  };

  useEffect(() => {
    let ignore = false;

    async function loadPaymentChannels() {
      setIsPaymentChannelsLoading(true);
      setPaymentChannelsError(null);

      try {
        const response = await fetch("/api/payments/tripay/channels", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          channels?: CheckoutPaymentChannel[];
        };

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message || "Metode pembayaran Tripay gagal dimuat.",
          );
        }

        if (!ignore) {
          const channels = sortPaymentChannels(data.channels ?? []);

          setPaymentChannels(channels);
          setPaymentMethod((currentMethod) =>
            channels.some((channel) => channel.code === currentMethod)
              ? currentMethod
              : channels[0]?.code || "",
          );
        }
      } catch (error) {
        if (!ignore) {
          setPaymentChannels([]);
          setPaymentMethod("");
          setPaymentChannelsError(
            error instanceof Error
              ? error.message
              : "Metode pembayaran Tripay gagal dimuat.",
          );
        }
      } finally {
        if (!ignore) {
          setIsPaymentChannelsLoading(false);
        }
      }
    }

    void loadPaymentChannels();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (
      compatiblePaymentChannels.length > 0 &&
      !compatiblePaymentChannels.some(
        (channel) => channel.code === paymentMethod,
      )
    ) {
      setPaymentMethod(compatiblePaymentChannels[0].code);
    }
  }, [compatiblePaymentChannels, paymentMethod]);

  useEffect(() => {
    if (cart.length === 0) {
      setActiveVoucher(null);
      setVoucherNotice(null);
      setIsLoadingVoucher(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const selectedVoucherCode = (params.get("voucher") || "").trim().toUpperCase();

    if (!selectedVoucherCode) {
      setVoucherCode("");
      setActiveVoucher(null);
      setVoucherNotice(null);
      setIsLoadingVoucher(false);
      return;
    }

    let ignore = false;

    async function loadVoucher() {
      setIsLoadingVoucher(true);
      setVoucherCode(selectedVoucherCode);
      setVoucherNotice(null);

      try {
        const response = await fetch("/api/vouchers", { cache: "no-store" });
        const data = (await response.json()) as {
          ok: boolean;
          message?: string;
          vouchers?: CheckoutVoucher[];
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Voucher gagal dicek.");
        }

        const voucher = (data.vouchers ?? []).find(
          (item) => item.code.toUpperCase() === selectedVoucherCode,
        );

        if (!voucher || voucher.status !== "available") {
          if (!ignore) {
            setActiveVoucher(null);
            setVoucherNotice("Voucher tidak tersedia atau sudah pernah dipakai.");
          }

          return;
        }

        const eligibleSubtotal = getVoucherEligibleSubtotal(voucher, cart);

        if (eligibleSubtotal <= 0) {
          if (!ignore) {
            setActiveVoucher(null);
            setVoucherNotice(
              `Voucher hanya berlaku untuk ${getVoucherScopeText(voucher)}.`,
            );
          }

          return;
        }

        if (eligibleSubtotal < voucher.minSpendAmount) {
          if (!ignore) {
            setActiveVoucher(null);
            setVoucherNotice(
              `Minimum transaksi voucher ${formatRp(voucher.minSpendAmount)} untuk ${getVoucherScopeText(voucher)}.`,
            );
          }

          return;
        }

        if (!ignore) {
          setActiveVoucher(voucher);
          setVoucherNotice(null);
        }
      } catch (error) {
        if (!ignore) {
          setActiveVoucher(null);
          setVoucherNotice(
            error instanceof Error ? error.message : "Voucher gagal dicek.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoadingVoucher(false);
        }
      }
    }

    void loadVoucher();

    return () => {
      ignore = true;
    };
  }, [cart, cart.length]);

  const handlePaymentSuccess = async () => {
    if (cart.length === 0 || isSubmittingOrder) {
      return;
    }

    if (locationIssue) {
      setCheckoutNotice(locationIssue);
      void showSweetWarning({
        title: "Lokasi belum siap",
        text: locationIssue,
      });
      return;
    }

    if (!selectedPaymentChannel) {
      const message =
        paymentChannelsError ||
        "Pilih metode pembayaran Tripay sebelum melanjutkan.";

      setCheckoutNotice(message);
      void showSweetWarning({
        title: "Metode pembayaran belum siap",
        text: message,
      });
      return;
    }

    setIsSubmittingOrder(true);
    setCheckoutNotice(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": checkoutIdempotencyKeyRef.current,
        },
        body: JSON.stringify({
          idempotencyKey: checkoutIdempotencyKeyRef.current,
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.qty,
          })),
          note: notes.trim() || undefined,
          paymentMethod: selectedPaymentChannel.code,
          voucherCode: activeVoucher?.code,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        order?: {
          orderCode: string;
        };
        orders?: Array<{
          orderCode: string;
        }>;
        payment?: {
          attemptId: string;
          reference: string | null;
          status: string | null;
          checkoutUrl: string | null;
          expiresAt: string | null;
        };
      };

      const orderCodes =
        data.orders?.map((order) => order.orderCode).filter(Boolean) ??
        (data.order ? [data.order.orderCode] : []);

      if (
        !response.ok ||
        !data.ok ||
        orderCodes.length === 0 ||
        !data.payment
      ) {
        throw new Error(data.message || "Checkout gagal.");
      }

      if (data.payment.status === "PAID" && !data.payment.checkoutUrl) {
        router.push(
          `/payment-success?orders=${encodeURIComponent(orderCodes.join(","))}`,
        );
        return;
      }

      if (!data.payment.checkoutUrl) {
        throw new Error("URL pembayaran Tripay tidak tersedia.");
      }

      await showSweetSuccess({
        title: "Lanjut ke pembayaran",
        text: `${orderCodes.length} order menunggu pembayaran melalui ${selectedPaymentChannel.name}.`,
        confirmButtonText: "Buka Tripay",
      });
      window.location.assign(data.payment.checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout gagal.";

      checkoutIdempotencyKeyRef.current = createCheckoutIdempotencyKey();
      setCheckoutNotice(message);
      void showSweetError({
        title: "Checkout gagal",
        text: message,
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-50">
        <header className="sticky top-0 z-20 flex items-center bg-white px-6 pt-10 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] md:px-8 md:pt-6 lg:px-10">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            aria-label="Kembali ke keranjang"
          >
            <ChevronLeft size={24} className="text-gray-800" />
          </button>
          <div className="ml-2">
            <h1 className="text-xl font-extrabold text-gray-900">Checkout</h1>
            <p className="mt-0.5 text-xs font-medium text-gray-500">
              Konfirmasi pickup dan pembayaran.
            </p>
          </div>
        </header>

        <main className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-6 pt-6 pb-64 [scrollbar-width:none] md:px-8 lg:pb-10 [&::-webkit-scrollbar]:hidden">
          {cart.length === 0 ? (
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] bg-emerald-50 text-emerald-600">
                <ReceiptText size={38} />
              </div>
              <h2 className="text-lg font-extrabold text-gray-900">
                Belum ada pesanan
              </h2>
              <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                Tambahkan makanan ke keranjang dulu sebelum lanjut checkout.
              </p>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-extrabold text-white"
              >
                Kembali ke Beranda
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600 uppercase">
                      Ready to Save
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold text-emerald-950">
                      {cartCount} item surplus
                    </h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                    <Leaf size={28} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                  <div className="rounded-2xl bg-white px-3 py-3 text-gray-600">
                    Hemat
                    <span className="mt-1 block text-sm font-extrabold text-gray-950">
                      {formatRp(totalSaved)}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 text-gray-600">
                    Food saved
                    <span className="mt-1 block text-sm font-extrabold text-gray-950">
                      {(cartCount * 0.8).toFixed(1)} Kg
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={19} className="text-emerald-500" />
                    <h2 className="text-sm font-extrabold text-gray-950">
                      Lokasi Pickup
                    </h2>
                  </div>
                  <CustomerLocationControl
                    location={customerLocation}
                    isLoading={isCustomerLocationLoading}
                    onLocationChange={handleLocationChange}
                  />
                </div>
                <div
                  className={`rounded-[22px] border p-4 ${
                    locationIssue
                      ? "border-red-100 bg-red-50"
                      : "border-emerald-100 bg-emerald-50"
                  }`}
                >
                  <p className="text-sm font-extrabold text-gray-950">
                    {isCustomerLocationLoading
                      ? "Memeriksa titik lokasi..."
                      : hasCustomerCoordinates
                        ? customerLocation.label
                        : "Lokasi customer belum aktif"}
                  </p>
                  <p
                    className={`mt-1 text-xs leading-5 font-medium ${
                      locationIssue ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {locationIssue ||
                      (hasCustomerCoordinates
                        ? "Rute pickup akan dibuat dari lokasi aktif ke toko."
                        : "Aktifkan lokasi otomatis untuk melanjutkan checkout.")}
                  </p>
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Navigation size={19} className="text-blue-500" />
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-950">
                      Rute Pickup per Toko
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-gray-500">
                      {pickupStores.length} titik pickup akan dibuat dari keranjang ini.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {pickupStores.map((store) => {
                    const distanceKm =
                      customerLocation.coordinates && store.coordinates
                        ? calculateDistanceKm(
                            customerLocation.coordinates,
                            store.coordinates,
                          )
                        : null;
                    const pickupRoute = getPickupRouteUrl(
                      customerLocation.coordinates,
                      store.coordinates,
                      `${store.name} ${store.city}`,
                    );

                    return (
                      <article
                        key={store.key}
                        className={`rounded-[22px] border p-4 ${
                          store.coordinates
                            ? "border-emerald-100 bg-emerald-50/65"
                            : "border-red-100 bg-red-50"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <Store
                                size={15}
                                className="mt-0.5 shrink-0 text-gray-500"
                              />
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-extrabold text-gray-950">
                                  {store.name}
                                </h3>
                                <p className="mt-1 text-xs leading-5 font-semibold text-gray-600">
                                  {store.address}
                                  {store.city ? `, ${store.city}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-extrabold">
                              <span className="rounded-lg bg-white px-2 py-1 text-gray-600">
                                {store.itemCount} menu / {store.quantity} item
                              </span>
                              <span className="rounded-lg bg-white px-2 py-1 text-amber-700">
                                Pickup {store.pickupWindows.join(", ")}
                              </span>
                              <span
                                className={`rounded-lg px-2 py-1 ${
                                  distanceKm !== null
                                    ? "bg-white text-emerald-700"
                                    : store.coordinates
                                      ? "bg-white text-blue-700"
                                      : "bg-white text-red-700"
                                }`}
                              >
                                {distanceKm !== null
                                  ? formatDistance(distanceKm)
                                  : store.coordinates
                                    ? "Aktifkan lokasi otomatis"
                                    : "Pin toko belum ada"}
                              </span>
                            </div>
                          </div>
                          <a
                            href={pickupRoute.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-xs font-extrabold transition-colors ${
                              store.coordinates
                                ? "bg-white text-blue-700 shadow-sm hover:bg-blue-50"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            <MapPin size={14} />
                            {pickupRoute.label}
                          </a>
                        </div>
                        <p
                          className={`mt-3 text-xs leading-5 font-semibold ${
                            store.coordinates ? "text-emerald-800" : "text-red-700"
                          }`}
                        >
                          {store.coordinates
                            ? distanceKm !== null
                              ? "Jarak dihitung dari lokasi customer aktif."
                              : "Titik toko siap. Aktifkan lokasi otomatis sebelum bayar."
                            : "Checkout ditahan sampai mitra melengkapi titik lokasi toko ini."}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Clock3 size={19} className="text-amber-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Waktu Pickup
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {pickupOptions.map((option) => {
                    const isActive = pickupTime === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPickupTime(option.id)}
                        className={`rounded-[22px] border p-4 text-left transition-all ${
                          isActive
                            ? "border-amber-200 bg-amber-50 ring-4 ring-amber-500/10"
                            : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="text-sm font-extrabold text-gray-950">
                            {option.time}
                          </p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-amber-600">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs leading-5 font-medium text-gray-500">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Store size={19} className="text-gray-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Item Pesanan
                  </h2>
                </div>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-[20px] bg-gray-50 p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-extrabold text-gray-950">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                          {item.restaurant} • Qty {item.qty}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-extrabold text-gray-950">
                        {formatRp(item.price * item.qty)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquareText size={19} className="text-blue-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Catatan Restoran
                  </h2>
                </div>
                <textarea
                  placeholder="Cth: Tolong sambalnya dipisah ya, terima kasih..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
                />
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TicketPercent size={19} className="text-emerald-500" />
                    <h2 className="text-sm font-extrabold text-gray-950">
                      Voucher
                    </h2>
                  </div>
                </div>
                {isLoadingVoucher ? (
                  <p className="text-xs leading-5 font-bold text-gray-500">
                    Mengecek voucher dari keranjang...
                  </p>
                ) : activeVoucher ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-extrabold text-emerald-700">
                      {activeVoucher.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-emerald-800">
                      <span>{activeVoucher.code}</span>
                      <span>- {formatRp(voucherDiscount)}</span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-emerald-700">
                      Berlaku untuk {getVoucherScopeText(activeVoucher)}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs leading-5 font-medium text-gray-500">
                      Voucher diterapkan dari keranjang jika kode voucher masih valid.
                    </p>
                    {voucherCode && voucherNotice ? (
                      <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
                        {voucherNotice}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => router.push("/cart")}
                      className="rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-extrabold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Pilih Voucher
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard size={19} className="text-gray-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Metode Pembayaran
                  </h2>
                </div>
                <div className="space-y-3">
                  {isPaymentChannelsLoading ? (
                    <div className="rounded-[22px] border border-gray-100 bg-gray-50 p-4">
                      <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                      <div className="mt-2 h-3 w-28 animate-pulse rounded bg-gray-200" />
                    </div>
                  ) : null}
                  {!isPaymentChannelsLoading && paymentChannelsError ? (
                    <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-xs leading-5 font-bold text-red-700">
                      {paymentChannelsError}
                    </div>
                  ) : null}
                  {compatiblePaymentChannels.map((channel) => {
                    const isActive = paymentMethod === channel.code;
                    const { Icon, iconClassName } =
                      getPaymentChannelPresentation(channel);
                    const customerFee =
                      channel.feeCustomer.flat +
                      Math.ceil(
                        (grandTotal * channel.feeCustomer.percent) / 100,
                      );

                    return (
                      <button
                        key={channel.code}
                        type="button"
                        onClick={() => setPaymentMethod(channel.code)}
                        className={`flex w-full items-center justify-between rounded-[22px] border bg-white p-4 text-left transition-all ${
                          isActive
                            ? "border-emerald-200 ring-4 ring-emerald-500/10"
                            : "border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className={`rounded-xl p-2.5 ${iconClassName}`}>
                            <Icon size={20} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-extrabold text-gray-900">
                              {channel.name}
                            </span>
                            <span className="text-[11px] font-medium text-gray-400">
                              {channel.group}
                              {customerFee > 0
                                ? ` - biaya ${formatRp(customerFee)}`
                                : " - tanpa biaya customer"}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`h-5 w-5 shrink-0 rounded-full border-[5px] transition-colors ${
                            isActive
                              ? "border-emerald-500 bg-white"
                              : "border-gray-200 bg-transparent"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ReceiptText size={19} className="text-gray-500" />
                  <h2 className="text-sm font-extrabold text-gray-950">
                    Ringkasan Pembayaran
                  </h2>
                </div>
                <div className="space-y-3 text-xs font-medium">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal Asli</span>
                    <span className="line-through">{formatRp(originalTotal)}</span>
                  </div>
                  <div className="flex justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 font-bold text-emerald-600">
                    <span>Diskon Surplus</span>
                    <span>- {formatRp(totalSaved)}</span>
                  </div>
                  {activeVoucher ? (
                    <div className="flex justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 font-bold text-blue-600">
                      <span>Voucher {activeVoucher.code}</span>
                      <span>- {formatRp(voucherDiscount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between px-1 text-gray-600">
                    <span>Biaya Layanan</span>
                    <span>{formatRp(feePreview.serviceFee)}</span>
                  </div>
                  {feePreview.taxFee > 0 ? (
                    <div className="flex justify-between px-1 text-gray-600">
                      <span>Pajak Platform</span>
                      <span>{formatRp(feePreview.taxFee)}</span>
                    </div>
                  ) : null}
                  {selectedPaymentChannel ? (
                    <div className="flex justify-between px-1 text-gray-600">
                      <span>Biaya {selectedPaymentChannel.name}</span>
                      <span>{formatRp(selectedPaymentCustomerFee)}</span>
                    </div>
                  ) : null}
                  <div className="my-2 h-px w-full bg-gray-100" />
                  <div className="flex justify-between px-1 text-lg font-extrabold text-gray-900">
                    <span>Total</span>
                    <span>{formatRp(totalPaymentAmount)}</span>
                  </div>
                </div>
                {paymentBlockNotice ? (
                  <div className="mt-5 hidden rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 lg:block">
                    {paymentBlockNotice}
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={!canPay}
                  onClick={handlePaymentSuccess}
                  className="mt-5 hidden w-full rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all duration-300 hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none lg:block"
                >
                  {isSubmittingOrder
                    ? "Membuat transaksi..."
                    : "Lanjut ke Tripay"}
                </button>
              </section>

              <label className="flex cursor-pointer gap-3 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                <input
                  type="checkbox"
                  checked={agreePickup}
                  onChange={(event) => setAgreePickup(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-emerald-500"
                />
                <span className="text-xs leading-5 font-medium text-gray-500">
                  Saya paham pesanan surplus harus diambil sesuai jam pickup dan
                  QR perlu ditunjukkan ke kasir.
                </span>
              </label>
            </div>
          )}
        </main>

        {cart.length > 0 ? (
          <div className="absolute right-0 bottom-0 left-0 z-50 rounded-t-[32px] border-t border-gray-50 bg-white/95 p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
            {paymentBlockNotice ? (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                {paymentBlockNotice}
              </div>
            ) : null}
            <div className="mb-4 flex items-start justify-between gap-4 px-1">
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Total Pembayaran
                </p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-gray-900">
                  {formatRp(totalPaymentAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400">
                  Pickup restoran
                </p>
                <p className="mt-1 text-xs font-extrabold text-emerald-600">
                  {selectedPickup?.time}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!canPay}
              onClick={handlePaymentSuccess}
              className="w-full rounded-2xl bg-gray-900 py-4 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition-all duration-300 hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              {isSubmittingOrder
                ? "Membuat transaksi..."
                : "Lanjut ke Tripay"}
            </button>
          </div>
        ) : null}
      </div>
    </MobileDeviceFrame>
  );
}
