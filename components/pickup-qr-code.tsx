"use client";

import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

type PickupQrCodeProps = {
  orderId: string;
  pickupCode: string | null;
  isActive: boolean;
  className?: string;
};

export function createPickupQrPayload(orderId: string, pickupCode: string) {
  return JSON.stringify({
    type: "RESQFOOD_PICKUP",
    orderId,
    pickupCode,
  });
}

export function PickupQrCode({
  orderId,
  pickupCode,
  isActive,
  className = "",
}: PickupQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [hasQrError, setHasQrError] = useState(false);
  const payload = useMemo(
    () => (pickupCode ? createPickupQrPayload(orderId, pickupCode) : null),
    [orderId, pickupCode],
  );

  useEffect(() => {
    let ignore = false;

    async function generateQrCode() {
      if (!isActive || !payload) {
        setQrDataUrl(null);
        setHasQrError(false);
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 256,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });

        if (!ignore) {
          setQrDataUrl(dataUrl);
          setHasQrError(false);
        }
      } catch {
        if (!ignore) {
          setQrDataUrl(null);
          setHasQrError(true);
        }
      }
    }

    void generateQrCode();

    return () => {
      ignore = true;
    };
  }, [isActive, payload]);

  if (!isActive) {
    return (
      <div
        className={`flex min-h-40 min-w-40 items-center justify-center rounded-3xl border border-gray-100 bg-gray-50 text-gray-300 ${className}`}
      >
        <QrCode size={112} />
      </div>
    );
  }

  if (qrDataUrl) {
    return (
      <div
        className={`flex flex-col items-center gap-3 rounded-3xl bg-white p-3 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- QR dibuat sebagai data URL lokal, jadi tidak perlu optimasi next/image. */}
        <img
          src={qrDataUrl}
          alt={`QR pickup order ${orderId}`}
          width="176"
          height="176"
          className="h-44 w-44 rounded-2xl"
        />
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 font-mono text-3xl font-black tracking-[0.2em] text-emerald-700">
          {pickupCode}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-40 min-w-40 flex-col items-center justify-center gap-3 rounded-3xl bg-white p-5 text-center ${className}`}
    >
      {hasQrError ? (
        <>
          <QrCode size={72} className="text-gray-300" />
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 font-mono text-3xl font-black tracking-[0.2em] text-emerald-700">
            {pickupCode}
          </div>
        </>
      ) : (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
          <p className="text-xs font-extrabold text-gray-400">Membuat QR</p>
        </>
      )}
    </div>
  );
}
