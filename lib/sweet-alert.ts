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
  const cameraBoxId = "resqfood-pickup-scanner-camera-box";
  const statusId = "resqfood-pickup-scanner-status";
  const inputId = "resqfood-pickup-scanner-input";
  const retryButtonId = "resqfood-pickup-scanner-retry";
  type ScannerStatusTone = "info" | "success" | "warning" | "error";
  let scannerControls: IScannerControls | null = null;
  let scannerResolved = false;
  let isScannerClosed = false;
  let permissionNoticeTimer: number | null = null;

  const clearPermissionNoticeTimer = () => {
    if (permissionNoticeTimer !== null) {
      window.clearTimeout(permissionNoticeTimer);
      permissionNoticeTimer = null;
    }
  };

  const stopScanner = ({ closing = false }: { closing?: boolean } = {}) => {
    if (closing) {
      isScannerClosed = true;
    }

    clearPermissionNoticeTimer();

    try {
      scannerControls?.stop();
    } catch {
      // Scanner controls can already be stopped by ZXing after a successful scan.
    }
    scannerControls = null;
  };

  const setStatus = (message: string, tone: ScannerStatusTone = "info") => {
    const statusElement =
      Swal.getHtmlContainer()?.querySelector<HTMLParagraphElement>(
        `#${statusId}`,
      );

    if (!statusElement) {
      return;
    }

    const toneClassNames: Record<ScannerStatusTone, string> = {
      info: "text-gray-500",
      success: "text-emerald-700",
      warning: "text-amber-700",
      error: "text-red-600",
    };

    statusElement.textContent = message;
    statusElement.className = `text-xs font-bold ${toneClassNames[tone]}`;
  };

  const setRetryButtonVisible = (isVisible: boolean) => {
    const retryButton =
      Swal.getHtmlContainer()?.querySelector<HTMLButtonElement>(
        `#${retryButtonId}`,
      );

    retryButton?.classList.toggle("hidden", !isVisible);
  };

  const setCameraBoxTone = (tone: ScannerStatusTone) => {
    const cameraBox =
      Swal.getHtmlContainer()?.querySelector<HTMLDivElement>(`#${cameraBoxId}`);

    if (!cameraBox) {
      return;
    }

    const borderClassName =
      tone === "error"
        ? "border-red-200"
        : tone === "warning"
          ? "border-amber-200"
          : tone === "success"
            ? "border-emerald-200"
            : "border-gray-100";

    cameraBox.className = `overflow-hidden rounded-3xl border ${borderClassName} bg-gray-950 shadow-inner transition-colors`;
  };

  const focusManualInput = () => {
    window.setTimeout(() => {
      Swal.getHtmlContainer()
        ?.querySelector<HTMLInputElement>(`#${inputId}`)
        ?.focus({ preventScroll: true });
    }, 60);
  };

  const showCameraFallback = (
    message: string,
    tone: ScannerStatusTone = "error",
  ) => {
    setCameraBoxTone(tone);
    setRetryButtonVisible(true);
    setStatus(message, tone);
    focusManualInput();
  };

  const getCameraErrorMessage = (error: unknown) => {
    const errorName =
      typeof error === "object" && error !== null && "name" in error
        ? String((error as { name?: unknown }).name ?? "")
        : "";

    if (errorName === "NotAllowedError" || errorName === "SecurityError") {
      return "Izin kamera ditolak. Aktifkan permission kamera browser, atau masukkan kode manual.";
    }

    if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
      return "Kamera tidak ditemukan di perangkat ini. Masukkan kode pickup manual.";
    }

    if (errorName === "NotReadableError" || errorName === "TrackStartError") {
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lain, lalu coba lagi.";
    }

    if (
      errorName === "OverconstrainedError" ||
      errorName === "ConstraintNotSatisfiedError"
    ) {
      return "Kamera belakang tidak tersedia. Coba buka kamera lagi, atau masukkan kode manual.";
    }

    return "Kamera tidak bisa dibuka. Masukkan kode manual, atau coba buka kamera lagi.";
  };

  const startScanner = async () => {
    stopScanner();
    scannerResolved = false;

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

    setRetryButtonVisible(false);
    setCameraBoxTone("info");
    setStatus("Menyiapkan kamera...", "info");

    if (!navigator.mediaDevices?.getUserMedia) {
      showCameraFallback(
        "Browser ini tidak mendukung akses kamera. Masukkan kode pickup manual.",
        "warning",
      );
      return;
    }

    permissionNoticeTimer = window.setTimeout(() => {
      if (!scannerControls && !isScannerClosed && Swal.isVisible()) {
        setStatus(
          "Menunggu izin kamera. Jika popup permission muncul, pilih Allow. Kode manual tetap bisa dipakai.",
          "warning",
        );
        setCameraBoxTone("warning");
      }
    }, 5000);

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");

      if (isScannerClosed || !Swal.isVisible()) {
        return;
      }

      const codeReader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 180,
        delayBetweenScanSuccess: 500,
      });

      type ScannerCallback = Parameters<
        typeof codeReader.decodeFromConstraints
      >[2];

      const handleScanResult: ScannerCallback = (result, _error, controls) => {
        if (scannerResolved || !result) {
          return;
        }

        const parsedCode = parseScannedPickupCode(result.getText(), orderId);

        if (!parsedCode.code) {
          setStatus(parsedCode.error ?? "QR pickup tidak valid.", "error");
          setCameraBoxTone("error");
          return;
        }

        scannerResolved = true;
        try {
          controls.stop();
        } catch {
          // Controls can be stopped again during modal cleanup.
        }
        scannerControls = null;
        inputElement.value = parsedCode.code;
        Swal.resetValidationMessage();
        setRetryButtonVisible(false);
        setCameraBoxTone("success");
        setStatus("QR terbaca. Kode akan diverifikasi.", "success");
        window.setTimeout(() => {
          if (!isScannerClosed && Swal.isVisible()) {
            Swal.clickConfirm();
          }
        }, 350);
      };

      try {
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
          handleScanResult,
        );
      } catch (preferredCameraError) {
        if (isScannerClosed || !Swal.isVisible()) {
          return;
        }

        const errorName =
          typeof preferredCameraError === "object" &&
          preferredCameraError !== null &&
          "name" in preferredCameraError
            ? String((preferredCameraError as { name?: unknown }).name ?? "")
            : "";

        if (
          errorName !== "OverconstrainedError" &&
          errorName !== "ConstraintNotSatisfiedError"
        ) {
          throw preferredCameraError;
        }

        setStatus(
          "Kamera belakang tidak tersedia. Mencoba kamera yang tersedia...",
          "warning",
        );
        setCameraBoxTone("warning");

        scannerControls = await codeReader.decodeFromConstraints(
          { audio: false, video: true },
          videoElement,
          handleScanResult,
        );
      }

      clearPermissionNoticeTimer();

      if (isScannerClosed || !Swal.isVisible()) {
        stopScanner();
        return;
      }

      setCameraBoxTone("success");
      setStatus("Kamera aktif. Arahkan ke QR pickup customer.", "success");
    } catch (error) {
      clearPermissionNoticeTimer();
      showCameraFallback(getCameraErrorMessage(error));
    }
  };

  const result = await Swal.fire<string>({
    icon: "question",
    title,
    html: `
      <div class="mt-4 space-y-4 text-left">
        <p class="text-center text-sm leading-6 font-semibold text-gray-500">${escapeHtml(text)}</p>
        <div id="${cameraBoxId}" class="overflow-hidden rounded-3xl border border-gray-100 bg-gray-950 shadow-inner transition-colors">
          <video id="${videoId}" class="aspect-video w-full bg-gray-950 object-cover" muted playsinline></video>
        </div>
        <div class="flex items-start justify-between gap-3">
          <p id="${statusId}" class="text-xs font-bold text-gray-500" aria-live="polite">Menyiapkan kamera...</p>
          <button id="${retryButtonId}" type="button" class="hidden shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">Buka kamera</button>
        </div>
        <label class="block">
          <span class="mb-2 block text-xs font-extrabold tracking-wider text-gray-400 uppercase">Kode manual</span>
          <input id="${inputId}" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6 digit" class="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-center font-mono text-xl font-black tracking-[0.2em] text-gray-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
          <span class="mt-2 block text-xs font-semibold leading-5 text-gray-400">Kalau kamera bermasalah, minta customer menyebutkan 6 digit kode pickup.</span>
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
      const container = Swal.getHtmlContainer();
      const inputElement = container?.querySelector<HTMLInputElement>(
        `#${inputId}`,
      );
      const retryButton = container?.querySelector<HTMLButtonElement>(
        `#${retryButtonId}`,
      );

      inputElement?.addEventListener("input", () => {
        const normalizedValue = normalizePickupCode(inputElement.value).slice(
          0,
          6,
        );

        if (inputElement.value !== normalizedValue) {
          inputElement.value = normalizedValue;
        }

        if (normalizedValue.length === 6) {
          Swal.resetValidationMessage();
          setStatus("Kode manual lengkap. Tekan Verifikasi.", "success");
        }
      });

      retryButton?.addEventListener("click", () => {
        void startScanner();
      });

      void startScanner();
    },
    willClose: () => stopScanner({ closing: true }),
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

  stopScanner({ closing: true });

  return result.isConfirmed ? String(result.value ?? "") : null;
}
