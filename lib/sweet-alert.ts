import Swal, { type SweetAlertIcon } from "sweetalert2";
import type { IScannerControls } from "@zxing/browser";

const baseCustomClass = {
  popup:
    "rounded-[28px] px-5 pb-6 pt-6 font-sans shadow-[0_28px_90px_rgba(15,23,42,0.22)]",
  title: "text-xl font-extrabold tracking-tight text-gray-950",
  htmlContainer: "text-sm leading-6 font-medium text-gray-500",
  confirmButton:
    "rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(16,185,129,0.22)] transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100",
  cancelButton:
    "ml-2 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100",
};

type SweetAlertMessage = {
  title: string;
  text?: string;
  confirmButtonText?: string;
};

type SweetAlertTextInput = SweetAlertMessage & {
  cancelButtonText?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  validationMessage?: string;
  numeric?: boolean;
  maxLength?: number;
  validate?: (value: string) => string | null;
};

type PickupScannerOptions = {
  title?: string;
  text?: string;
  orderId?: string;
};

function normalizePickupCode(value: string | number | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseScannedPickupCode(rawValue: string, orderId?: string) {
  const trimmedValue = rawValue.trim();

  try {
    const payload = JSON.parse(trimmedValue) as {
      type?: unknown;
      orderId?: unknown;
      pickupCode?: unknown;
    };

    if (payload.type === "RESQFOOD_PICKUP") {
      const payloadOrderId =
        typeof payload.orderId === "string" ? payload.orderId : "";

      if (orderId && payloadOrderId !== orderId) {
        return { code: null, error: "QR ini bukan untuk order yang sedang dibuka." };
      }

      const pickupCode = normalizePickupCode(
        typeof payload.pickupCode === "string" ||
          typeof payload.pickupCode === "number"
          ? payload.pickupCode
          : "",
      );

      return {
        code: pickupCode.length === 6 ? pickupCode : null,
        error: pickupCode.length === 6 ? null : "QR pickup tidak valid.",
      };
    }
  } catch {
    // QR lama/manual boleh tetap berupa 6 digit mentah.
  }

  const exactCode = trimmedValue.match(/\b\d{6}\b/)?.[0] ?? "";
  const digitsOnly = normalizePickupCode(trimmedValue);
  const fallbackCode = exactCode || (digitsOnly.length === 6 ? digitsOnly : "");

  return {
    code: fallbackCode || null,
    error: fallbackCode ? null : "QR pickup tidak berisi kode 6 digit.",
  };
}

function fireMessage(icon: SweetAlertIcon, message: SweetAlertMessage) {
  return Swal.fire({
    icon,
    title: message.title,
    text: message.text,
    confirmButtonText: message.confirmButtonText ?? "Oke",
    buttonsStyling: false,
    heightAuto: false,
    scrollbarPadding: false,
    customClass: baseCustomClass,
  });
}

export function showSweetSuccess(message: SweetAlertMessage) {
  return fireMessage("success", message);
}

export function showSweetError(message: SweetAlertMessage) {
  return fireMessage("error", message);
}

export function showSweetWarning(message: SweetAlertMessage) {
  return fireMessage("warning", message);
}

export function showSweetToast({
  icon,
  title,
}: {
  icon: SweetAlertIcon;
  title: string;
}) {
  void Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    timer: 2400,
    timerProgressBar: true,
    showConfirmButton: false,
    buttonsStyling: false,
    heightAuto: false,
    scrollbarPadding: false,
    customClass: {
      popup:
        "rounded-2xl px-4 py-3 font-sans shadow-[0_18px_50px_rgba(15,23,42,0.18)]",
      title: "text-sm font-extrabold text-gray-950",
    },
  });
}

export async function showSweetConfirm({
  title,
  text,
  confirmButtonText = "Ya, lanjut",
  cancelButtonText = "Batal",
  icon = "warning",
  danger = false,
}: SweetAlertMessage & {
  cancelButtonText?: string;
  icon?: SweetAlertIcon;
  danger?: boolean;
}) {
  const result = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    buttonsStyling: false,
    heightAuto: false,
    scrollbarPadding: false,
    customClass: {
      ...baseCustomClass,
      confirmButton: danger
        ? "rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(220,38,38,0.22)] transition-colors hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
        : baseCustomClass.confirmButton,
    },
  });

  return result.isConfirmed;
}

export async function showSweetTextInput({
  title,
  text,
  inputLabel,
  inputPlaceholder,
  confirmButtonText = "Lanjut",
  cancelButtonText = "Batal",
  validationMessage = "Input wajib diisi.",
  numeric = false,
  maxLength,
  validate,
}: SweetAlertTextInput) {
  const inputAttributes: Record<string, string> = {
    autocomplete: numeric ? "one-time-code" : "off",
  };

  if (numeric) {
    inputAttributes.inputmode = "numeric";
    inputAttributes.pattern = "[0-9]*";
  }

  if (maxLength) {
    inputAttributes.maxlength = String(maxLength);
  }

  const result = await Swal.fire<string>({
    icon: "question",
    title,
    text,
    input: "text",
    inputLabel,
    inputPlaceholder,
    inputAttributes,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    buttonsStyling: false,
    heightAuto: false,
    scrollbarPadding: false,
    customClass: {
      ...baseCustomClass,
      input:
        "mx-auto mt-4 h-12 w-[min(100%,18rem)] rounded-2xl border border-gray-200 bg-gray-50 px-4 text-center text-lg font-extrabold tracking-[0.18em] text-gray-950 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100",
    },
    preConfirm: (value) => {
      const normalizedValue = String(value ?? "").trim();

      if (!normalizedValue) {
        Swal.showValidationMessage(validationMessage);
        return false;
      }

      const validationError = validate?.(normalizedValue) ?? null;

      if (validationError) {
        Swal.showValidationMessage(validationError);
        return false;
      }

      return normalizedValue;
    },
  });

  return result.isConfirmed ? String(result.value ?? "").trim() : null;
}

export async function showPickupCodeScanner({
  title = "Verifikasi Pickup",
  text = "Arahkan kamera ke QR customer, atau masukkan kode pickup manual.",
  orderId,
}: PickupScannerOptions = {}) {
  const videoId = "resqfood-pickup-scanner-video";
  const statusId = "resqfood-pickup-scanner-status";
  const inputId = "resqfood-pickup-scanner-input";
  let scannerControls: IScannerControls | null = null;
  let scannerResolved = false;
  let isScannerClosed = false;

  const stopScanner = () => {
    isScannerClosed = true;

    scannerControls?.stop();
    scannerControls = null;
  };

  const setStatus = (message: string, isError = false) => {
    const statusElement =
      Swal.getHtmlContainer()?.querySelector<HTMLParagraphElement>(
        `#${statusId}`,
      );

    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.className = `mt-3 text-xs font-bold ${
      isError ? "text-red-600" : "text-emerald-700"
    }`;
  };

  const startScanner = async () => {
    const container = Swal.getHtmlContainer();
    const videoElement = container?.querySelector<HTMLVideoElement>(
      `#${videoId}`,
    );
    const inputElement = container?.querySelector<HTMLInputElement>(
      `#${inputId}`,
    );

    if (!videoElement || !inputElement) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Kamera tidak tersedia. Masukkan kode pickup manual.", true);
      return;
    }

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");

      if (isScannerClosed || !Swal.isVisible()) {
        return;
      }

      const codeReader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 180,
        delayBetweenScanSuccess: 500,
      });

      scannerControls = await codeReader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoElement,
        (result, _error, controls) => {
          if (scannerResolved || !result) {
            return;
          }

          const parsedCode = parseScannedPickupCode(result.getText(), orderId);

          if (!parsedCode.code) {
            setStatus(parsedCode.error ?? "QR pickup tidak valid.", true);
            return;
          }

          scannerResolved = true;
          controls.stop();
          inputElement.value = parsedCode.code;
          setStatus("QR terbaca. Kode akan diverifikasi.");
          window.setTimeout(() => Swal.clickConfirm(), 350);
        },
      );

      if (isScannerClosed || !Swal.isVisible()) {
        stopScanner();
        return;
      }

      setStatus("Kamera aktif. Arahkan ke QR pickup customer.");
    } catch {
      setStatus(
        "Izin kamera ditolak atau kamera tidak bisa dibuka. Masukkan kode manual.",
        true,
      );
    }
  };

  const result = await Swal.fire<string>({
    icon: "question",
    title,
    html: `
      <div class="mt-4 space-y-4 text-left">
        <p class="text-center text-sm leading-6 font-semibold text-gray-500">${escapeHtml(text)}</p>
        <div class="overflow-hidden rounded-3xl border border-gray-100 bg-gray-950 shadow-inner">
          <video id="${videoId}" class="aspect-video w-full bg-gray-950 object-cover" muted playsinline></video>
        </div>
        <p id="${statusId}" class="mt-3 text-xs font-bold text-gray-500">Menyiapkan kamera...</p>
        <label class="block">
          <span class="mb-2 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">Kode manual</span>
          <input id="${inputId}" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6 digit" class="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-center font-mono text-xl font-black tracking-[0.2em] text-gray-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
        </label>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Verifikasi",
    cancelButtonText: "Batal",
    reverseButtons: true,
    buttonsStyling: false,
    heightAuto: false,
    scrollbarPadding: false,
    customClass: baseCustomClass,
    didOpen: () => {
      void startScanner();
    },
    willClose: stopScanner,
    preConfirm: () => {
      const inputElement =
        Swal.getHtmlContainer()?.querySelector<HTMLInputElement>(`#${inputId}`);
      const pickupCode = normalizePickupCode(inputElement?.value);

      if (pickupCode.length !== 6) {
        Swal.showValidationMessage("Kode pickup harus 6 digit.");
        return false;
      }

      return pickupCode;
    },
  });

  stopScanner();

  return result.isConfirmed ? String(result.value ?? "") : null;
}
