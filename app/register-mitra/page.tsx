"use client";

import {
  AlertTriangle,
  Banknote,
  Camera,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Send,
  ShieldCheck,
  Store,
  UploadCloud,
  User,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { LocationMapPicker } from "@/components/location-map-picker";
import { WelcomeLoadingOverlay } from "@/components/welcome-loading-overlay";
import {
  getBestBrowserLocation,
  getLocationAccuracyNotice,
} from "@/lib/browser-location";
import { waitForLoadingScreen } from "@/lib/loading-delay";
import {
  formatCoordinatesInput,
} from "@/lib/maps-coordinate";
import { getStorePickupCoordinateIssue } from "@/lib/location-quality";
import { saveRecentLocation } from "@/lib/recent-locations";
import {
  formatCoordinateLabel,
  reverseGeocodeCoordinates,
} from "@/lib/reverse-geocode";

const inputWrapClassName =
  "relative rounded-2xl border border-gray-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-500/10";

const inputClassName =
  "w-full rounded-2xl bg-transparent py-3.5 pr-4 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400";
const welcomeLoadingDelayMs = 4200;

const businessCategories = [
  "Bakery",
  "Restoran",
  "Warteg",
  "Kafe",
  "Catering",
] as const;

type UploadKind = "identity" | "permit" | "storefront";

const uploadRequirements: {
  id: UploadKind;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "identity",
    title: "Foto KTP Pemilik",
    description: "JPG, PNG, WEBP, atau PDF maksimal 6 MB",
    icon: Camera,
  },
  {
    id: "permit",
    title: "Surat Izin / NIB",
    description: "Dokumen legal usaha aktif",
    icon: FileText,
  },
  {
    id: "storefront",
    title: "Foto Toko",
    description: "Tampak depan lokasi pickup",
    icon: Store,
  },
];

const reviewChecklist = [
  "Identitas owner dan nama usaha harus cocok.",
  "Alamat pickup harus jelas untuk customer.",
  "Saldo baru bisa dicairkan setelah rekening tervalidasi.",
] as const;

type PartnerForm = {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  pickupWindow: string;
  averageSurplus: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  password: string;
};

type UploadedDocs = Record<UploadKind, File | null>;
type FormErrorKey = keyof PartnerForm | UploadKind;
type FormErrors = Partial<Record<FormErrorKey, string>>;

const formSteps = [
  {
    id: "account",
    title: "Akun",
    description: "Owner dan toko",
  },
  {
    id: "location",
    title: "Lokasi Toko",
    description: "Alamat dan pin",
  },
  {
    id: "operation",
    title: "Operasional",
    description: "Pickup dan rekening",
  },
  {
    id: "documents",
    title: "Dokumen",
    description: "File verifikasi",
  },
] as const;

type FormStepId = (typeof formSteps)[number]["id"];

const formStepOrder = formSteps.map((step) => step.id);

const stepFieldMap: Record<FormStepId, FormErrorKey[]> = {
  account: ["storeName", "ownerName", "email", "phone", "password"],
  location: ["address", "latitude", "longitude"],
  operation: [
    "pickupWindow",
    "averageSurplus",
    "bankName",
    "bankAccountNumber",
    "bankAccountHolder",
  ],
  documents: ["identity", "permit", "storefront"],
};

const fieldStepMap: Record<FormErrorKey, FormStepId> = {
  storeName: "account",
  ownerName: "account",
  email: "account",
  phone: "account",
  password: "account",
  address: "location",
  latitude: "location",
  longitude: "location",
  pickupWindow: "operation",
  averageSurplus: "operation",
  bankName: "operation",
  bankAccountNumber: "operation",
  bankAccountHolder: "operation",
  identity: "documents",
  permit: "documents",
  storefront: "documents",
};

const fieldErrorOrder: FormErrorKey[] = [
  "storeName",
  "ownerName",
  "email",
  "phone",
  "password",
  "address",
  "latitude",
  "longitude",
  "pickupWindow",
  "averageSurplus",
  "bankName",
  "bankAccountNumber",
  "bankAccountHolder",
  "identity",
  "permit",
  "storefront",
];

const fieldErrorLabels: Record<FormErrorKey, string> = {
  storeName: "Nama toko",
  ownerName: "Nama pemilik",
  email: "Email owner",
  phone: "No. WhatsApp",
  password: "Password owner",
  address: "Alamat pickup",
  latitude: "Titik lokasi toko",
  longitude: "Titik lokasi toko",
  pickupWindow: "Jam pickup",
  averageSurplus: "Estimasi surplus",
  bankName: "Nama bank/e-wallet",
  bankAccountNumber: "Nomor rekening",
  bankAccountHolder: "Nama pemilik rekening",
  identity: "Foto KTP pemilik",
  permit: "Surat izin / NIB",
  storefront: "Foto toko",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxUploadSize = 6 * 1024 * 1024;
const allowedUploadTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function normalizeBankAccountNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 20);
}

function getBankNameError(value: string) {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (normalizedValue.length < 2) {
    return "Nama bank/e-wallet wajib diisi, contoh: BCA.";
  }

  if (normalizedValue.length > 40) {
    return "Nama bank/e-wallet maksimal 40 karakter.";
  }

  return "";
}

function getBankAccountNumberError(value: string) {
  const digits = normalizeBankAccountNumber(value);

  if (digits.length < 6 || digits.length > 20) {
    return "Nomor rekening harus 6-20 digit angka.";
  }

  return "";
}

function getBankAccountHolderError(value: string) {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (normalizedValue.length < 3) {
    return "Nama pemilik rekening minimal 3 karakter.";
  }

  if (normalizedValue.length > 80) {
    return "Nama pemilik rekening maksimal 80 karakter.";
  }

  return "";
}

function getFormErrorCount(errors: FormErrors) {
  return fieldErrorOrder.filter((key) => Boolean(errors[key])).length;
}

function getFirstErrorKey(errors: FormErrors) {
  return fieldErrorOrder.find((key) => Boolean(errors[key])) || null;
}

function pickStepErrors(errors: FormErrors, stepId: FormStepId) {
  return stepFieldMap[stepId].reduce<FormErrors>((stepErrors, key) => {
    if (errors[key]) {
      stepErrors[key] = errors[key];
    }

    return stepErrors;
  }, {});
}

function mergeStepErrors(
  currentErrors: FormErrors,
  stepId: FormStepId,
  stepErrors: FormErrors,
) {
  const nextErrors = { ...currentErrors };

  stepFieldMap[stepId].forEach((key) => {
    delete nextErrors[key];
  });

  return { ...nextErrors, ...stepErrors };
}

function getInputWrapClassName(error?: string) {
  return `${inputWrapClassName} ${
    error
      ? "border-red-200 bg-red-50/40 focus-within:border-red-300 focus-within:ring-red-500/10"
      : ""
  }`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-2 text-xs leading-5 font-bold text-red-600" role="alert">
      {message}
    </p>
  );
}

function validatePartnerForm(form: PartnerForm, uploadedDocs: UploadedDocs) {
  const errors: FormErrors = {};
  const phoneDigits = form.phone.replace(/\D/g, "");

  if (form.storeName.trim().length < 3) {
    errors.storeName = "Nama toko minimal 3 karakter.";
  }

  if (form.ownerName.trim().length < 3) {
    errors.ownerName = "Nama pemilik minimal 3 karakter sesuai identitas.";
  }

  if (!emailPattern.test(form.email.trim())) {
    errors.email = "Masukkan email owner yang valid.";
  }

  if (phoneDigits.length < 8) {
    errors.phone = "Nomor WhatsApp minimal 8 digit.";
  }

  if (form.password.length < 6) {
    errors.password = "Password owner minimal 6 karakter.";
  }

  if (form.address.trim().length < 20) {
    errors.address =
      "Alamat pickup terlalu pendek. Tulis alamat lengkap, nomor bangunan, area, dan patokan utama.";
  }

  const latitude = form.latitude.trim();
  const longitude = form.longitude.trim();

  if (!latitude && !longitude) {
    errors.latitude =
      "Titik lokasi toko wajib diisi. Klik Ambil Lokasi agar sistem menyimpan patokan maps.";
  } else if ((latitude && !longitude) || (!latitude && longitude)) {
    errors.latitude = "Titik lokasi toko belum lengkap. Klik Ambil Lokasi lagi.";
  }

  if (latitude && longitude) {
    const coordinateIssue = getStorePickupCoordinateIssue({
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    if (coordinateIssue) {
      errors.latitude = coordinateIssue;
    }
  }

  if (form.pickupWindow.trim().length < 5) {
    errors.pickupWindow = "Tulis jam pickup, contoh: 17:00 - 21:00.";
  }

  if (form.averageSurplus.trim().length < 3) {
    errors.averageSurplus = "Tulis estimasi surplus, contoh: 10 porsi / hari.";
  }

  const bankNameError = getBankNameError(form.bankName);
  const bankAccountNumberError = getBankAccountNumberError(
    form.bankAccountNumber,
  );
  const bankAccountHolderError = getBankAccountHolderError(
    form.bankAccountHolder,
  );

  if (bankNameError) {
    errors.bankName = bankNameError;
  }

  if (bankAccountNumberError) {
    errors.bankAccountNumber = bankAccountNumberError;
  }

  if (bankAccountHolderError) {
    errors.bankAccountHolder = bankAccountHolderError;
  }

  if (!uploadedDocs.identity) {
    errors.identity = "Foto KTP pemilik wajib diunggah.";
  }

  if (!uploadedDocs.permit) {
    errors.permit = "Surat izin atau NIB wajib diunggah.";
  }

  if (!uploadedDocs.storefront) {
    errors.storefront = "Foto tampak depan toko wajib diunggah.";
  }

  return errors;
}

function getFirstError(errors: FormErrors) {
  const firstKey = getFirstErrorKey(errors);

  return firstKey ? errors[firstKey] || "" : "";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-extrabold text-gray-800">
      {children}
    </label>
  );
}

function ErrorSummary({
  errors,
  onSelect,
}: {
  errors: FormErrors;
  onSelect: (key: FormErrorKey) => void;
}) {
  const errorKeys = fieldErrorOrder.filter((key) => Boolean(errors[key]));

  if (errorKeys.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-[28px] border border-red-100 bg-red-50 p-5 text-red-700"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-500">
          <AlertTriangle size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">
            Ada {errorKeys.length} data yang perlu diperbaiki.
          </p>
          <p className="mt-1 text-xs leading-5 font-semibold text-red-600/80">
            Klik item di bawah untuk langsung menuju bagian yang bermasalah.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {errorKeys.slice(0, 6).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className="rounded-full border border-red-100 bg-white px-3 py-1.5 text-[11px] font-extrabold text-red-700 transition-colors hover:bg-red-100"
              >
                {fieldErrorLabels[key]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadBox({
  title,
  description,
  icon: Icon,
  fileName,
  error,
  onChange,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  fileName?: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`group flex cursor-pointer flex-col rounded-[24px] border border-dashed px-5 py-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-all ${
        error
          ? "border-red-200 bg-red-50"
          : fileName
          ? "border-emerald-200 bg-emerald-50"
          : "border-gray-300 bg-white hover:border-emerald-300 hover:bg-emerald-50"
      }`}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={onChange}
      />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            fileName
              ? "bg-white text-emerald-600"
              : "bg-gray-50 text-gray-500 group-hover:bg-white group-hover:text-emerald-500"
          }`}
        >
          <Icon size={26} />
        </div>
        {fileName ? (
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-emerald-600">
            <CheckCircle2 size={12} />
            Terunggah
          </span>
        ) : null}
      </div>
      <p className="text-sm font-extrabold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-5 font-medium text-gray-500">
        {fileName || description}
      </p>
      <FieldError message={error} />
      <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-xs font-extrabold text-white transition-colors group-hover:bg-emerald-500">
        <UploadCloud size={14} />
        {fileName ? "Ganti File" : "Pilih File"}
      </span>
    </label>
  );
}

export default function RegisterMitraPage() {
  const router = useRouter();
  const fieldRefs = useRef<Partial<Record<FormErrorKey, HTMLDivElement | null>>>(
    {},
  );
  const [category, setCategory] =
    useState<(typeof businessCategories)[number]>("Bakery");
  const [activeStep, setActiveStep] = useState<FormStepId>("account");
  const [form, setForm] = useState<PartnerForm>({
    storeName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    latitude: "",
    longitude: "",
    pickupWindow: "17:00 - 21:00",
    averageSurplus: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false);
  const [isLocatingStore, setIsLocatingStore] = useState(false);
  const [storeLocationLabel, setStoreLocationLabel] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocs>({
    identity: null,
    permit: null,
    storefront: null,
  });

  const completion = useMemo(() => {
    const requiredItems = [
      form.storeName,
      form.ownerName,
      form.email,
      form.phone,
      form.address,
      form.pickupWindow,
      form.averageSurplus,
      form.bankName,
      form.bankAccountNumber,
      form.bankAccountHolder,
      form.latitude && form.longitude,
      form.password,
      uploadedDocs.identity?.name,
      uploadedDocs.permit?.name,
      uploadedDocs.storefront?.name,
    ];
    const completed = requiredItems.filter(Boolean).length;

    return Math.round((completed / requiredItems.length) * 100);
  }, [form, uploadedDocs]);
  const activeStepIndex = formStepOrder.indexOf(activeStep);
  const stepErrorCount = getFormErrorCount(pickStepErrors(formErrors, activeStep));
  const setFieldRef =
    (key: FormErrorKey) => (node: HTMLDivElement | null) => {
      fieldRefs.current[key] = node;
    };
  const focusField = (key: FormErrorKey) => {
    const stepId = fieldStepMap[key];

    setActiveStep(stepId);
    window.setTimeout(() => {
      const fieldNode = fieldRefs.current[key];

      fieldNode?.scrollIntoView({ behavior: "smooth", block: "center" });
      fieldNode
        ?.querySelector<HTMLElement>("input, textarea, button")
        ?.focus({ preventScroll: true });
    }, 90);
  };
  const focusFirstError = (errors: FormErrors) => {
    const firstKey = getFirstErrorKey(errors);

    if (firstKey) {
      focusField(firstKey);
    }
  };
  const hasStoreCoordinates = Boolean(
    form.latitude.trim() && form.longitude.trim(),
  );
  const storeCoordinates = hasStoreCoordinates
    ? {
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      }
    : null;
  const storeMapsHref = hasStoreCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        `${form.latitude.trim()},${form.longitude.trim()}`,
      )}`
    : "";
  const setStoreCoordinates = (coordinates: {
    latitude: number;
    longitude: number;
  }) => {
    const formattedCoordinates = formatCoordinatesInput(coordinates);

    setForm((current) => ({
      ...current,
      ...formattedCoordinates,
    }));
    setFormErrors((current) => {
      if (!current.latitude && !current.longitude) {
        return current;
      }

      const next = { ...current };
      delete next.latitude;
      delete next.longitude;

      return next;
    });
  };
  const handleStoreCoordinatesChange = async (
    coordinates: {
      latitude: number;
      longitude: number;
    },
    { fillAddress = false }: { fillAddress?: boolean } = {},
  ) => {
    setStoreCoordinates(coordinates);
    setStoreLocationLabel(formatCoordinateLabel(coordinates));

    const geocodedLocation = await reverseGeocodeCoordinates(coordinates);
    const locationLabel =
      geocodedLocation?.label || formatCoordinateLabel(coordinates);

    setStoreLocationLabel(locationLabel);
    saveRecentLocation({
      source: "store",
      label: locationLabel,
      addressLine: geocodedLocation?.addressLine,
      coordinates,
    });

    if (fillAddress && geocodedLocation?.addressLine) {
      setForm((current) =>
        current.address.trim().length >= 20
          ? current
          : { ...current, address: geocodedLocation.addressLine },
      );
      setFormErrors((current) => {
        if (!current.address) {
          return current;
        }

        const next = { ...current };
        delete next.address;

        return next;
      });
    }
  };

  const handleInputChange =
    (key: keyof PartnerForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
      setNotice("");
      setFormErrors((current) => {
        if (!current[key]) {
          return current;
        }

        const next = { ...current };
        delete next[key];

        return next;
      });
    };

  const handleBankAccountNumberChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const nextValue = normalizeBankAccountNumber(event.target.value);

    setForm((current) => ({ ...current, bankAccountNumber: nextValue }));
    setNotice("");
    setFormErrors((current) => {
      if (!current.bankAccountNumber) {
        return current;
      }

      const next = { ...current };
      delete next.bankAccountNumber;

      return next;
    });
  };

  const handleBankFieldBlur = (
    key: "bankName" | "bankAccountNumber" | "bankAccountHolder",
  ) => {
    const fieldError =
      key === "bankName"
        ? getBankNameError(form.bankName)
        : key === "bankAccountNumber"
          ? getBankAccountNumberError(form.bankAccountNumber)
          : getBankAccountHolderError(form.bankAccountHolder);

    setFormErrors((current) => {
      const next = { ...current };

      if (fieldError) {
        next[key] = fieldError;
      } else {
        delete next[key];
      }

      return next;
    });
  };

  const handleUploadChange =
    (key: UploadKind) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!allowedUploadTypes.has(file.type)) {
        setFormErrors((current) => ({
          ...current,
          [key]: "Format dokumen harus JPG, PNG, WEBP, atau PDF.",
        }));
        setNotice("Periksa dokumen yang ditandai merah.");
        return;
      }

      if (file.size > maxUploadSize) {
        setFormErrors((current) => ({
          ...current,
          [key]: "Ukuran dokumen maksimal 6 MB.",
        }));
        setNotice("Periksa dokumen yang ditandai merah.");
        return;
      }

      setUploadedDocs((current) => ({ ...current, [key]: file }));
      setNotice("");
      setFormErrors((current) => {
        if (!current[key]) {
          return current;
        }

        const next = { ...current };
        delete next[key];

        return next;
      });
    };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setNotice("Browser belum mendukung akses lokasi.");
      return;
    }

    setIsLocatingStore(true);
    setNotice("");

    try {
      const result = await getBestBrowserLocation();

      void handleStoreCoordinatesChange(result.coordinates, {
        fillAddress: form.address.trim().length < 20,
      });
      setNotice(getLocationAccuracyNotice(result.accuracy));
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Lokasi toko gagal diambil. Izinkan akses lokasi browser lalu coba lagi.",
      );
    } finally {
      setIsLocatingStore(false);
    }
  };

  const handleNextStep = () => {
    const validationErrors = validatePartnerForm(form, uploadedDocs);
    const activeStepErrors = pickStepErrors(validationErrors, activeStep);

    if (Object.keys(activeStepErrors).length > 0) {
      setFormErrors((current) =>
        mergeStepErrors(current, activeStep, activeStepErrors),
      );
      setNotice(
        getFirstError(activeStepErrors) ||
          "Periksa data yang ditandai merah sebelum lanjut.",
      );
      focusFirstError(activeStepErrors);
      return;
    }

    setFormErrors((current) => mergeStepErrors(current, activeStep, {}));
    setNotice("");
    setActiveStep(formStepOrder[Math.min(activeStepIndex + 1, formStepOrder.length - 1)]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const validationErrors = validatePartnerForm(form, uploadedDocs);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setNotice(
        getFirstError(validationErrors) ||
          "Periksa data yang ditandai merah sebelum mendaftar.",
      );
      focusFirstError(validationErrors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.set("ownerName", form.ownerName);
      formData.set("email", form.email);
      formData.set("phone", form.phone);
      formData.set("password", form.password);
      formData.set("storeName", form.storeName);
      formData.set("businessType", category);
      formData.set("address", form.address);
      formData.set("city", "Jakarta");
      formData.set("latitude", form.latitude);
      formData.set("longitude", form.longitude);
      formData.set("bankName", form.bankName);
      formData.set(
        "bankAccountNumber",
        normalizeBankAccountNumber(form.bankAccountNumber),
      );
      formData.set("bankAccountHolder", form.bankAccountHolder);
      formData.set(
        "description",
        `Jam pickup ${form.pickupWindow}. Estimasi surplus ${form.averageSurplus}. Rekening ${form.bankName} ${normalizeBankAccountNumber(
          form.bankAccountNumber,
        )} a.n. ${form.bankAccountHolder}.`,
      );

      Object.entries(uploadedDocs).forEach(([key, file]) => {
        if (file) {
          formData.set(key, file);
        }
      });

      const [response] = await Promise.all([
        fetch("/api/auth/register-owner", {
          method: "POST",
          body: formData,
        }),
        waitForLoadingScreen(),
      ]);
      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        redirectTo?: string;
        issues?: {
          fieldErrors?: Partial<Record<keyof PartnerForm, string[]>>;
        };
      };

      if (!response.ok || !result.ok || !result.redirectTo) {
        const apiFieldErrors = result.issues?.fieldErrors;

        if (apiFieldErrors) {
          const nextErrors: FormErrors = {};

          Object.entries(apiFieldErrors).forEach(([key, messages]) => {
            const message = messages?.[0];

            if (message) {
              nextErrors[key as keyof PartnerForm] = message;
            }
          });

          setFormErrors(nextErrors);
        }

        setNotice(result.message || "Pendaftaran mitra gagal. Coba lagi.");
        return;
      }

      setIsWelcomeLoading(true);
      await new Promise((resolve) => setTimeout(resolve, welcomeLoadingDelayMs));
      router.push(result.redirectTo);
      router.refresh();
    } catch {
      setNotice("Pendaftaran mitra gagal karena koneksi bermasalah.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#f8fafc] px-5 py-8 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900">
      {isSubmitting && !isWelcomeLoading ? (
        <LoadingScreen
          title="Mengirim pendaftaran..."
          description="Dokumen dan data mitra sedang dikirim ke ResQFood."
        />
      ) : null}
      {isWelcomeLoading ? (
        <WelcomeLoadingOverlay
          title="Pendaftaran diterima!"
          description="Akun mitra sudah dibuat. Kami sedang membuka halaman status verifikasi."
        />
      ) : null}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.84fr_1.16fr]"
      >
        <aside className="h-fit rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)] lg:sticky lg:top-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-7 flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition-colors hover:bg-gray-100"
            aria-label="Kembali ke login"
          >
            <ChevronLeft size={21} />
          </button>

          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.22)]">
            <Store size={31} />
          </div>

          <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
            ResQFood Partner
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">
            Pendaftaran Mitra Toko
          </h1>
          <p className="mt-4 text-sm leading-7 font-medium text-gray-500">
            Lengkapi profil usaha dan dokumen verifikasi agar admin bisa
            meninjau toko sebelum dashboard owner aktif.
          </p>

          <div className="mt-7 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-extrabold text-emerald-700">
              <span>Kelengkapan</span>
              <span>{completion}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {reviewChecklist.map((item) => (
              <div key={item} className="flex gap-3 text-xs font-medium text-gray-500">
                <ShieldCheck
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-500"
                />
                <span className="leading-5">{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="grid gap-3 sm:grid-cols-4">
              {formSteps.map((step, index) => {
                const isActive = step.id === activeStep;
                const hasStepError = getFormErrorCount(
                  pickStepErrors(formErrors, step.id),
                ) > 0;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    className={`rounded-2xl border p-3 text-left transition-all ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
                        : hasStepError
                          ? "border-red-100 bg-red-50 text-red-700"
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-extrabold">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                          isActive
                            ? "bg-emerald-500 text-white"
                            : hasStepError
                              ? "bg-red-500 text-white"
                              : "bg-white text-gray-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {step.title}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold opacity-75">
                      {step.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <ErrorSummary errors={formErrors} onSelect={focusField} />

          {activeStep === "account" ? (
            <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Akun Owner dan Toko
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Data ini dipakai untuk login owner dan identitas toko.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div ref={setFieldRef("storeName")}>
                <FieldLabel>Nama Toko</FieldLabel>
                <div className={getInputWrapClassName(formErrors.storeName)}>
                  <Store
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.storeName}
                    onChange={handleInputChange("storeName")}
                    placeholder="Nama usaha kamu"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.storeName)}
                  />
                </div>
                <FieldError message={formErrors.storeName} />
              </div>

              <div ref={setFieldRef("ownerName")}>
                <FieldLabel>Nama Pemilik</FieldLabel>
                <div className={getInputWrapClassName(formErrors.ownerName)}>
                  <User
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.ownerName}
                    onChange={handleInputChange("ownerName")}
                    placeholder="Nama sesuai KTP"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.ownerName)}
                  />
                </div>
                <FieldError message={formErrors.ownerName} />
              </div>

              <div ref={setFieldRef("email")}>
                <FieldLabel>Email Owner</FieldLabel>
                <div className={getInputWrapClassName(formErrors.email)}>
                  <Mail
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={handleInputChange("email")}
                    placeholder="owner@email.com"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.email)}
                  />
                </div>
                <FieldError message={formErrors.email} />
              </div>

              <div ref={setFieldRef("phone")}>
                <FieldLabel>No. WhatsApp</FieldLabel>
                <div className={getInputWrapClassName(formErrors.phone)}>
                  <Phone
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={handleInputChange("phone")}
                    placeholder="08123456789"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.phone)}
                  />
                </div>
                <FieldError message={formErrors.phone} />
              </div>

              <div ref={setFieldRef("password")} className="md:col-span-2">
                <FieldLabel>Password Owner</FieldLabel>
                <div className={getInputWrapClassName(formErrors.password)}>
                  <Lock
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleInputChange("password")}
                    placeholder="Minimal 6 karakter untuk login owner"
                    className="w-full rounded-2xl bg-transparent py-3.5 pr-12 pl-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                    aria-invalid={Boolean(formErrors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label={
                      showPassword ? "Sembunyikan password" : "Lihat password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <FieldError message={formErrors.password} />
              </div>

            </div>
          </section>
          ) : null}

          {activeStep === "location" ? (
            <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Lokasi Pickup Toko
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Alamat dan titik peta ini jadi patokan rute customer.
              </p>
            </div>

            <div className="grid gap-4">
              <div ref={setFieldRef("address")}>
                <FieldLabel>Alamat Pickup</FieldLabel>
                <div className={getInputWrapClassName(formErrors.address)}>
                  <MapPin
                    size={19}
                    className="absolute top-4 left-4 text-emerald-500"
                  />
                  <textarea
                    required
                    rows={4}
                    value={form.address}
                    onChange={handleInputChange("address")}
                    placeholder="Tulis alamat lengkap dan patokan utama."
                    className={`${inputClassName} resize-none py-4`}
                    aria-invalid={Boolean(formErrors.address)}
                  />
                </div>
                <FieldError message={formErrors.address} />
              </div>

              <div ref={setFieldRef("latitude")}>
                <section className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">
                        Titik Lokasi Toko
                      </p>
                      <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                        Wajib diisi agar customer bisa melihat rute pickup.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocatingStore}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-600 disabled:bg-gray-300"
                    >
                      <Navigation size={15} />
                      {isLocatingStore ? "Mengambil..." : "Ambil Lokasi"}
                    </button>
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      hasStoreCoordinates
                        ? "border-emerald-200 bg-white"
                        : formErrors.latitude || formErrors.longitude
                          ? "border-red-100 bg-red-50"
                          : "border-emerald-100 bg-white/80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                            hasStoreCoordinates
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <MapPin size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-gray-950">
                            {hasStoreCoordinates
                              ? "Titik lokasi sudah aktif"
                              : "Titik lokasi belum aktif"}
                          </p>
                          <p className="mt-1 text-xs leading-5 font-semibold text-gray-500">
                            {hasStoreCoordinates
                              ? "Lokasi ditemukan. Titik ini akan dipakai customer untuk membuka rute pickup."
                              : "Klik Ambil Lokasi, atau buka peta lalu cari nama jalan/toko dan pilih titik pickup."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <LocationMapPicker
                          coordinates={storeCoordinates}
                          onCoordinatesChange={(coordinates) => {
                            void handleStoreCoordinatesChange(coordinates, {
                              fillAddress: form.address.trim().length < 20,
                            });
                            setNotice(
                              "Lokasi ditemukan. Titik toko sudah tersimpan di form.",
                            );
                          }}
                          title="Pin Lokasi Toko"
                          description="Cari nama jalan/toko, lalu pastikan pin tepat di lokasi pickup mitra."
                          recentSource="store"
                          buttonLabel={
                            hasStoreCoordinates
                              ? "Ubah Titik di Peta"
                              : "Cari di Peta"
                          }
                        />
                        {storeMapsHref ? (
                          <a
                            href={storeMapsHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-700 transition-colors hover:bg-emerald-100"
                          >
                            <Navigation size={15} />
                            Buka Maps
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {hasStoreCoordinates ? (
                      <p className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs leading-5 font-bold text-emerald-700">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        {storeLocationLabel
                          ? `Lokasi ditemukan: ${storeLocationLabel}. Titik pickup sudah siap dipakai untuk rute customer.`
                          : "Lokasi ditemukan. Titik pickup sudah siap dipakai untuk rute customer."}
                      </p>
                    ) : null}
                    <input
                      type="hidden"
                      name="latitude"
                      value={form.latitude}
                      readOnly
                    />
                    <input
                      type="hidden"
                      name="longitude"
                      value={form.longitude}
                      readOnly
                    />
                    <FieldError
                      message={formErrors.latitude || formErrors.longitude}
                    />
                  </div>
                </section>
              </div>
            </div>
          </section>
          ) : null}

          {activeStep === "operation" ? (
            <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Operasional Surplus
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Bantu admin memahami tipe usaha dan jam pickup kamu.
              </p>
            </div>

            <FieldLabel>Kategori Usaha</FieldLabel>
            <div className="mb-5 flex flex-wrap gap-2">
              {businessCategories.map((item) => {
                const isActive = category === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all ${
                      isActive
                        ? "bg-gray-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div ref={setFieldRef("pickupWindow")}>
                <FieldLabel>Jam Pickup</FieldLabel>
                <div className={getInputWrapClassName(formErrors.pickupWindow)}>
                  <Clock3
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.pickupWindow}
                    onChange={handleInputChange("pickupWindow")}
                    placeholder="17:00 - 21:00"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.pickupWindow)}
                  />
                </div>
                <FieldError message={formErrors.pickupWindow} />
              </div>

              <div ref={setFieldRef("averageSurplus")}>
                <FieldLabel>Estimasi Surplus</FieldLabel>
                <div className={getInputWrapClassName(formErrors.averageSurplus)}>
                  <FileText
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.averageSurplus}
                    onChange={handleInputChange("averageSurplus")}
                    placeholder="10 porsi / hari"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.averageSurplus)}
                  />
                </div>
                <FieldError message={formErrors.averageSurplus} />
              </div>

              <div ref={setFieldRef("bankName")}>
                <FieldLabel>Nama Bank / E-wallet</FieldLabel>
                <div className={getInputWrapClassName(formErrors.bankName)}>
                  <Banknote
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.bankName}
                    onChange={handleInputChange("bankName")}
                    onBlur={() => handleBankFieldBlur("bankName")}
                    placeholder="BCA, BRI, Mandiri, GoPay"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.bankName)}
                  />
                </div>
                <FieldError message={formErrors.bankName} />
              </div>

              <div ref={setFieldRef("bankAccountNumber")}>
                <FieldLabel>Nomor Rekening</FieldLabel>
                <div
                  className={getInputWrapClassName(
                    formErrors.bankAccountNumber,
                  )}
                >
                  <Banknote
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={form.bankAccountNumber}
                    onChange={handleBankAccountNumberChange}
                    onBlur={() => handleBankFieldBlur("bankAccountNumber")}
                    placeholder="1234567890"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.bankAccountNumber)}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 font-semibold text-gray-400">
                  Angka saja, 6-20 digit. Sistem otomatis membuang spasi/simbol.
                </p>
                <FieldError message={formErrors.bankAccountNumber} />
              </div>

              <div ref={setFieldRef("bankAccountHolder")} className="md:col-span-2">
                <FieldLabel>Nama Pemilik Rekening</FieldLabel>
                <div
                  className={getInputWrapClassName(
                    formErrors.bankAccountHolder,
                  )}
                >
                  <User
                    size={19}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-500"
                  />
                  <input
                    required
                    type="text"
                    value={form.bankAccountHolder}
                    onChange={handleInputChange("bankAccountHolder")}
                    onBlur={() => handleBankFieldBlur("bankAccountHolder")}
                    placeholder="Nama sesuai rekening"
                    className={inputClassName}
                    aria-invalid={Boolean(formErrors.bankAccountHolder)}
                  />
                </div>
                <FieldError message={formErrors.bankAccountHolder} />
              </div>
            </div>
          </section>
          ) : null}

          {activeStep === "documents" ? (
          <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
            <div className="mb-5">
              <h2 className="text-lg font-extrabold text-gray-950">
                Verifikasi Dokumen
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-500">
                Dokumen dikirim ke admin untuk proses review usaha.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {uploadRequirements.map((item) => (
                <div key={item.id} ref={setFieldRef(item.id)}>
                  <UploadBox
                    title={item.title}
                    description={item.description}
                    icon={item.icon}
                    fileName={uploadedDocs[item.id]?.name}
                    error={formErrors[item.id]}
                    onChange={handleUploadChange(item.id)}
                  />
                </div>
              ))}
            </div>
          </section>
          ) : null}

          {notice ? (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 font-bold text-amber-700">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
            {activeStepIndex > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setNotice("");
                  setActiveStep(formStepOrder[activeStepIndex - 1]);
                }}
                className="min-h-14 rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-extrabold whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50"
              >
                Kembali
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}

            {activeStep === "documents" ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
              >
                <Send size={18} />
                {isSubmitting ? "Mengirim Pendaftaran..." : "Kirim Pendaftaran"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-4 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-emerald-500"
              >
                Lanjut
                {stepErrorCount > 0 ? (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                    {stepErrorCount}
                  </span>
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/owner/verify")}
              className="min-h-14 rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-extrabold whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-50"
            >
              Lihat Status
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
