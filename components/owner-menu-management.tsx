"use client";

import Image from "next/image";
import {
  Archive,
  CalendarClock,
  CheckSquare,
  ChevronDown,
  Clock,
  Copy,
  Edit,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { SkeletonCardGrid, StateCard } from "@/components/ui-state";
import { showSweetError, showSweetToast } from "@/lib/sweet-alert";

type SurplusMenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  stock: number;
  originalPrice: number;
  discountPrice: number;
  pickupStart: string;
  pickupEnd: string;
  imageUrl: string | null;
  image: string;
  expiresAt: string | null;
  publishAt: string | null;
  archivedAt: string | null;
  status: MenuItemStatus;
};

type MenuFormState = {
  name: string;
  category: string;
  description: string;
  originalPrice: string;
  discountPrice: string;
  stock: string;
  pickupStart: string;
  pickupEnd: string;
  publishAt: string;
  expiresAt: string;
  status: MenuItemStatus;
};

type MenuItemStatus = "ACTIVE" | "HIDDEN" | "SOLD_OUT" | "SCHEDULED" | "ARCHIVED";

type ApiOwnerMenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  stock: number;
  originalPrice: number;
  discountedPrice: number;
  pickupStart: string | null;
  pickupEnd: string | null;
  expiresAt: string | null;
  publishAt: string | null;
  archivedAt: string | null;
  imageUrl: string | null;
  status: MenuItemStatus;
};

type BulkAction = "activate" | "hide" | "archive" | "sold_out" | "set_stock" | "set_pickup";

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const categoryOptions = [
  "Bakery",
  "Rice Bowl",
  "Dessert",
  "Healthy Bowl",
  "Beverage",
] as const;

const defaultMenuImage =
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200&auto=format&fit=crop";

const defaultFormState: MenuFormState = {
  name: "",
  category: "",
  description: "",
  originalPrice: "",
  discountPrice: "",
  stock: "",
  pickupStart: "",
  pickupEnd: "",
  publishAt: "",
  expiresAt: "",
  status: "ACTIVE",
};

const allowedMenuImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxMenuImageSize = 4 * 1024 * 1024;

const statusLabel: Record<MenuItemStatus, string> = {
  ACTIVE: "Aktif",
  HIDDEN: "Hidden",
  SOLD_OUT: "Sold Out",
  SCHEDULED: "Terjadwal",
  ARCHIVED: "Arsip",
};

const statusClassName: Record<MenuItemStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  HIDDEN: "bg-gray-100 text-gray-600",
  SOLD_OUT: "bg-red-50 text-red-600",
  SCHEDULED: "bg-blue-50 text-blue-700",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

const fieldLabelClassName =
  "mb-2 block text-sm font-bold tracking-tight text-gray-700";

const inputClassName =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white";

const emeraldInputClassName =
  "w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 outline-none transition-all placeholder:text-emerald-400 focus:border-emerald-500 focus:bg-white";

function calculateDiscountPercentage(
  originalPrice: number,
  discountPrice: number,
) {
  if (originalPrice <= 0 || discountPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

function formatPickupWindow(start: string, end: string) {
  if (!start || !end) {
    return "Belum diatur";
  }

  return `${start} - ${end}`;
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function dateInputToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatSchedule(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getFormValidationMessage(
  formState: MenuFormState,
  originalPrice: number,
  discountPrice: number,
  stock: number,
) {
  if (formState.name.trim().length < 3) {
    return "Nama makanan minimal 3 karakter.";
  }

  if (!formState.category) {
    return "Pilih kategori makanan terlebih dahulu.";
  }

  if (formState.description.trim().length < 8) {
    return "Deskripsi makanan minimal 8 karakter.";
  }

  if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
    return "Harga asli harus lebih besar dari 0.";
  }

  if (!Number.isFinite(discountPrice) || discountPrice <= 0) {
    return "Harga diskon harus lebih besar dari 0.";
  }

  if (discountPrice > originalPrice) {
    return "Harga diskon tidak boleh lebih besar dari harga asli.";
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return "Stok harus angka bulat minimal 0.";
  }

  if (!formState.pickupStart || !formState.pickupEnd) {
    return "Jam pickup mulai dan selesai wajib diisi.";
  }

  if (formState.pickupEnd <= formState.pickupStart) {
    return "Jam selesai pickup harus lebih besar dari jam mulai.";
  }

  if (formState.status === "SCHEDULED" && !formState.publishAt) {
    return "Isi jadwal publish untuk menu terjadwal.";
  }

  if (
    formState.publishAt &&
    formState.expiresAt &&
    new Date(formState.publishAt) >= new Date(formState.expiresAt)
  ) {
    return "Jadwal publish harus sebelum waktu expired.";
  }

  return null;
}

function getApiErrorMessage(
  data: {
    message?: string;
    issues?: {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    };
  },
  fallback: string,
) {
  const fieldErrors = data.issues?.fieldErrors;
  const firstFieldError = fieldErrors
    ? Object.values(fieldErrors).flat().find(Boolean)
    : undefined;

  return firstFieldError || data.issues?.formErrors?.[0] || data.message || fallback;
}

function mapOwnerMenuItem(item: ApiOwnerMenuItem): SurplusMenuItem {
  const imageUrl = item.imageUrl || null;

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    stock: item.stock,
    originalPrice: item.originalPrice,
    discountPrice: item.discountedPrice,
    pickupStart: item.pickupStart ?? "",
    pickupEnd: item.pickupEnd ?? "",
    publishAt: item.publishAt,
    expiresAt: item.expiresAt,
    archivedAt: item.archivedAt,
    imageUrl,
    image: imageUrl ?? defaultMenuImage,
    status: item.status,
  };
}

export function OwnerMenuManagement() {
  const uploadInputId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SurplusMenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<SurplusMenuItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [menuItems, setMenuItems] = useState<SurplusMenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [isDeletingMenu, setIsDeletingMenu] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [duplicatingItemId, setDuplicatingItemId] = useState<string | null>(null);
  const [menuNotice, setMenuNotice] = useState<string | null>(null);
  const [formState, setFormState] = useState<MenuFormState>(defaultFormState);
  const [menuQuery, setMenuQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [stockFilter, setStockFilter] = useState<
    "all" | "active" | "scheduled" | "soldout" | "hidden" | "archived"
  >("all");
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(new Set());
  const [bulkStock, setBulkStock] = useState("");
  const [bulkPickupStart, setBulkPickupStart] = useState("");
  const [bulkPickupEnd, setBulkPickupEnd] = useState("");
  const isEditMode = editingItem !== null;
  const isAddActionOpen = searchParams.get("action") === "add";
  const isFoodModalOpen = isAddActionOpen || isModalOpen || isEditMode;
  const activeMenuCount = menuItems.filter((item) => item.status === "ACTIVE").length;
  const scheduledCount = menuItems.filter(
    (item) => item.status === "SCHEDULED",
  ).length;
  const soldOutCount = menuItems.filter(
    (item) => item.status === "SOLD_OUT" || item.stock === 0,
  ).length;
  const averageDiscount = Math.round(
    menuItems.reduce((total, item) => {
      return (
        total +
        calculateDiscountPercentage(item.originalPrice, item.discountPrice)
      );
    }, 0) / Math.max(menuItems.length, 1),
  );
  const filteredMenuItems = useMemo(() => {
    const normalizedQuery = menuQuery.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.category, item.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory =
        activeCategory === "Semua" || item.category === activeCategory;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "active" && item.status === "ACTIVE") ||
        (stockFilter === "scheduled" && item.status === "SCHEDULED") ||
        (stockFilter === "soldout" && item.status === "SOLD_OUT") ||
        (stockFilter === "hidden" && item.status === "HIDDEN") ||
        (stockFilter === "archived" && item.status === "ARCHIVED");

      return matchesQuery && matchesCategory && matchesStock;
    });
  }, [activeCategory, menuItems, menuQuery, stockFilter]);

  const loadMenuItems = useCallback(async () => {
    setIsLoadingMenu(true);

    try {
      const response = await fetch("/api/menu-items?scope=owner&includeArchived=true", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        menuItems?: ApiOwnerMenuItem[];
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Menu restoran gagal dimuat.");
      }

      setMenuItems((data.menuItems || []).map(mapOwnerMenuItem));
      setSelectedMenuIds(new Set());
    } catch (error) {
      setMenuNotice(
        error instanceof Error ? error.message : "Menu restoran gagal dimuat.",
      );
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    if (isAddActionOpen) {
      router.replace("/owner/menu", { scroll: false });
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setImagePreview(null);
    setSelectedImageFile(null);
    setFormState(defaultFormState);
  }, [isAddActionOpen, router]);

  useEffect(() => {
    void loadMenuItems();
  }, [loadMenuItems]);

  useEffect(() => {
    if (!isFoodModalOpen && !deletingItem) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseModal();
        setDeletingItem(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deletingItem, handleCloseModal, isFoodModalOpen]);

  const handleOpenModal = () => {
    setEditingItem(null);
    setImagePreview(null);
    setSelectedImageFile(null);
    setFormState(defaultFormState);
    setMenuNotice(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: SurplusMenuItem) => {
    setIsModalOpen(false);
    setEditingItem(item);
    setImagePreview(item.imageUrl ?? item.image);
    setSelectedImageFile(null);
    setMenuNotice(null);
    setFormState({
      name: item.name,
      category: item.category,
      description: item.description,
      originalPrice: String(item.originalPrice),
      discountPrice: String(item.discountPrice),
      stock: String(item.stock),
      pickupStart: item.pickupStart,
      pickupEnd: item.pickupEnd,
      publishAt: toLocalDateTimeInput(item.publishAt),
      expiresAt: toLocalDateTimeInput(item.expiresAt),
      status: item.status,
    });
  };

  const handleFieldChange = <Key extends keyof MenuFormState>(
    field: Key,
    value: MenuFormState[Key],
  ) => {
    setMenuNotice(null);
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!allowedMenuImageTypes.has(file.type)) {
      setMenuNotice("Format gambar harus JPG, PNG, atau WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > maxMenuImageSize) {
      setMenuNotice("Ukuran gambar maksimal 4MB.");
      event.target.value = "";
      return;
    }

    setSelectedImageFile(file);
    setMenuNotice(null);

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };

    reader.readAsDataURL(file);
  };

  const uploadSelectedImage = async () => {
    if (!selectedImageFile) {
      return editingItem?.imageUrl ?? "";
    }

    const formData = new FormData();
    formData.append("file", selectedImageFile);
    formData.append("folder", "menu-items");
    formData.append("entityType", "menu_item");
    formData.append("visibility", "PUBLIC");

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as {
      ok: boolean;
      message?: string;
      asset?: { url: string };
    };

    if (!response.ok || !data.ok || !data.asset?.url) {
      throw new Error(data.message || "Upload gambar menu gagal.");
    }

    return data.asset.url;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const originalPrice = Number(formState.originalPrice);
    const discountPrice = Number(formState.discountPrice);
    const stock = Number(formState.stock);
    const validationMessage = getFormValidationMessage(
      formState,
      originalPrice,
      discountPrice,
      stock,
    );

    if (validationMessage) {
      setMenuNotice(validationMessage);
      return;
    }

    setIsSavingMenu(true);
    setMenuNotice(null);

    try {
      const imageUrl = await uploadSelectedImage();
      const payload = {
        name: formState.name.trim(),
        category: formState.category,
        description: formState.description.trim(),
        originalPrice,
        discountedPrice: discountPrice,
        stock,
        pickupStart: formState.pickupStart,
        pickupEnd: formState.pickupEnd,
        publishAt: dateInputToIso(formState.publishAt),
        expiresAt: dateInputToIso(formState.expiresAt),
        status: formState.status,
        imageUrl,
      };
      const response = await fetch(
        editingItem ? `/api/menu-items/${editingItem.id}` : "/api/menu-items",
        {
          method: editingItem ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        issues?: {
          fieldErrors?: Record<string, string[] | undefined>;
          formErrors?: string[];
        };
      };

      if (!response.ok || !data.ok) {
        throw new Error(getApiErrorMessage(data, "Menu gagal disimpan."));
      }

      await loadMenuItems();
      handleCloseModal();
      const successMessage = editingItem
        ? "Perubahan menu berhasil disimpan."
        : "Menu baru berhasil dipublish.";

      setMenuNotice(successMessage);
      showSweetToast({
        icon: "success",
        title: successMessage,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Menu gagal disimpan.";

      setMenuNotice(message);
      void showSweetError({
        title: "Menu gagal disimpan",
        text: message,
      });
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!deletingItem) {
      return;
    }

    setIsDeletingMenu(true);
    setMenuNotice(null);

    try {
      const response = await fetch(`/api/menu-items/${deletingItem.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Menu gagal dihapus.");
      }

      setMenuItems((current) =>
        current.filter((item) => item.id !== deletingItem.id),
      );
      setDeletingItem(null);
      setMenuNotice("Menu berhasil dihapus.");
      showSweetToast({
        icon: "success",
        title: "Menu berhasil dihapus.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Menu gagal dihapus.";

      setMenuNotice(message);
      void showSweetError({
        title: "Menu gagal dihapus",
        text: message,
      });
    } finally {
      setIsDeletingMenu(false);
    }
  };

  const toggleSelectedMenu = (menuId: string) => {
    setSelectedMenuIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(menuId)) {
        nextIds.delete(menuId);
      } else {
        nextIds.add(menuId);
      }

      return nextIds;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedMenuIds((currentIds) => {
      const visibleIds = filteredMenuItems.map((item) => item.id);
      const allVisibleSelected = visibleIds.every((id) => currentIds.has(id));

      if (allVisibleSelected) {
        return new Set(
          Array.from(currentIds).filter((id) => !visibleIds.includes(id)),
        );
      }

      return new Set([...Array.from(currentIds), ...visibleIds]);
    });
  };

  const handleBulkAction = async (action: BulkAction) => {
    if (selectedMenuIds.size === 0 || isBulkUpdating) {
      return;
    }

    if (action === "set_stock" && bulkStock.trim() === "") {
      setMenuNotice("Isi stok bulk terlebih dahulu.");
      return;
    }

    if (action === "set_pickup") {
      if (!bulkPickupStart || !bulkPickupEnd) {
        setMenuNotice("Isi jam pickup bulk terlebih dahulu.");
        return;
      }

      if (bulkPickupEnd <= bulkPickupStart) {
        setMenuNotice("Jam selesai pickup harus lebih besar dari jam mulai.");
        return;
      }
    }

    setIsBulkUpdating(true);
    setMenuNotice(null);

    try {
      const response = await fetch("/api/menu-items/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: Array.from(selectedMenuIds),
          action,
          stock: action === "set_stock" ? Number(bulkStock) : undefined,
          pickupStart: action === "set_pickup" ? bulkPickupStart : undefined,
          pickupEnd: action === "set_pickup" ? bulkPickupEnd : undefined,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        updatedCount?: number;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Bulk update menu gagal.");
      }

      await loadMenuItems();
      showSweetToast({
        icon: "success",
        title: `${data.updatedCount ?? selectedMenuIds.size} menu diperbarui.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bulk update menu gagal.";

      setMenuNotice(message);
      void showSweetError({
        title: "Bulk update gagal",
        text: message,
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleDuplicateMenuItem = async (item: SurplusMenuItem) => {
    setDuplicatingItemId(item.id);
    setMenuNotice(null);

    try {
      const response = await fetch(`/api/menu-items/${item.id}?action=duplicate`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Menu gagal diduplikasi.");
      }

      await loadMenuItems();
      showSweetToast({
        icon: "success",
        title: "Menu berhasil diduplikasi sebagai draft hidden.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Menu gagal diduplikasi.";

      setMenuNotice(message);
      void showSweetError({
        title: "Duplicate gagal",
        text: message,
      });
    } finally {
      setDuplicatingItemId(null);
    }
  };

  const handleArchiveMenuItem = async (item: SurplusMenuItem) => {
    setMenuNotice(null);

    try {
      const response = await fetch(`/api/menu-items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Menu gagal diarsipkan.");
      }

      await loadMenuItems();
      showSweetToast({
        icon: "success",
        title: "Menu berhasil diarsipkan.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Menu gagal diarsipkan.";

      setMenuNotice(message);
      void showSweetError({
        title: "Arsip gagal",
        text: message,
      });
    }
  };

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_2px_15px_rgba(0,0,0,0.03)] lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold tracking-[0.24em] text-emerald-500 uppercase">
              Owner Dashboard
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
              Kelola Menu Surplus
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Atur stok, harga diskon, dan jam pickup makanan surplus agar
              listing selalu siap dipublish ke pelanggan.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(16,185,129,0.28)] transition-all hover:bg-emerald-600 active:scale-[0.98]"
          >
            <Plus size={18} />
            Tambah Makanan
          </button>
        </div>

        {menuNotice ? (
          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {menuNotice}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={menuQuery}
                  onChange={(event) => setMenuQuery(event.target.value)}
                  placeholder="Cari nama menu, kategori, atau deskripsi..."
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pr-4 pl-11 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "Semua Stok"],
                  ["active", "Aktif"],
                  ["scheduled", "Terjadwal"],
                  ["soldout", "Sold Out"],
                  ["hidden", "Hidden"],
                  ["archived", "Arsip"],
                ].map(([key, label]) => {
                  const isActive = stockFilter === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setStockFilter(
                          key as
                            | "all"
                            | "active"
                            | "scheduled"
                            | "soldout"
                            | "hidden"
                            | "archived",
                        )
                      }
                      className={`inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-extrabold transition-colors ${
                        isActive
                          ? "bg-gray-950 text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {key === "all" ? <SlidersHorizontal size={16} /> : null}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {["Semua", ...categoryOptions].map((category) => {
                const isActive = activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[22px] border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-extrabold text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <CheckSquare size={16} />
                  {filteredMenuItems.every((item) => selectedMenuIds.has(item.id)) &&
                  filteredMenuItems.length > 0
                    ? "Batal pilih semua"
                    : "Pilih semua tampil"}
                </button>
                <p className="text-xs font-bold text-gray-500">
                  {selectedMenuIds.size} menu dipilih untuk bulk edit.
                </p>
              </div>

              {selectedMenuIds.size > 0 ? (
                <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_auto]">
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["activate", "Aktifkan"],
                      ["hide", "Hidden"],
                      ["sold_out", "Sold Out"],
                      ["archive", "Arsip"],
                    ].map(([action, label]) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => void handleBulkAction(action as BulkAction)}
                        disabled={isBulkUpdating}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-gray-700 transition-colors hover:bg-emerald-500 hover:text-white disabled:cursor-wait disabled:text-gray-300"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="number"
                      min={0}
                      value={bulkStock}
                      onChange={(event) => setBulkStock(event.target.value)}
                      placeholder="Set stok"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="time"
                      value={bulkPickupStart}
                      onChange={(event) => setBulkPickupStart(event.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="time"
                      value={bulkPickupEnd}
                      onChange={(event) => setBulkPickupEnd(event.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleBulkAction("set_stock")}
                      disabled={isBulkUpdating}
                      className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:bg-gray-300"
                    >
                      Set Stok
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBulkAction("set_pickup")}
                      disabled={isBulkUpdating}
                      className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:bg-gray-300"
                    >
                      Set Pickup
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 xl:grid-cols-4">
            {[
              ["Aktif", activeMenuCount, "text-emerald-600"],
              ["Terjadwal", scheduledCount, "text-blue-600"],
              ["Sold Out", soldOutCount, "text-red-600"],
              ["Avg Diskon", `${averageDiscount}%`, "text-amber-600"],
            ].map(([label, value, className]) => (
              <div
                key={label}
                className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_2px_15px_rgba(0,0,0,0.03)]"
              >
                <p className={`text-xl font-extrabold ${className}`}>
                  {value}
                </p>
                <p className="mt-1 text-[11px] font-extrabold text-gray-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {isLoadingMenu ? (
          <SkeletonCardGrid count={6} />
        ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredMenuItems.map((item) => {
            const discountPercentage = calculateDiscountPercentage(
              item.originalPrice,
              item.discountPrice,
            );

            return (
              <article
                key={item.id}
                className="group overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.1)]"
              >
                <div className="relative h-52 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSelectedMenu(item.id)}
                    className={`absolute top-4 left-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-extrabold shadow-sm transition-colors ${
                      selectedMenuIds.has(item.id)
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-white/70 bg-white/90 text-gray-500"
                    }`}
                    aria-label={`Pilih ${item.name}`}
                  >
                    {selectedMenuIds.has(item.id) ? "✓" : ""}
                  </button>
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className={`absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${statusClassName[item.status]}`}
                  >
                    {statusLabel[item.status]} · Stok {item.stock}
                  </span>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <p className="text-[11px] font-extrabold tracking-[0.18em] text-gray-400 uppercase">
                      {item.category}
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold tracking-tight text-gray-900">
                      {item.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {item.description}
                    </p>
                    <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-500">
                      <Clock size={16} className="text-emerald-500" />
                      Pickup Time {formatPickupWindow(item.pickupStart, item.pickupEnd)}
                    </p>
                    {item.publishAt || item.expiresAt ? (
                      <p className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-600">
                        <CalendarClock size={14} />
                        {item.publishAt
                          ? `Publish ${formatSchedule(item.publishAt)}`
                          : "Publish langsung"}
                        {item.expiresAt
                          ? ` · Expired ${formatSchedule(item.expiresAt)}`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-400 line-through">
                        {formatRp(item.originalPrice)}
                      </p>
                      <p className="mt-1 text-2xl font-extrabold tracking-tight text-emerald-600">
                        {formatRp(item.discountPrice)}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                      {discountPercentage > 0 ? `-${discountPercentage}%` : "Promo"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDuplicateMenuItem(item)}
                      disabled={duplicatingItemId === item.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-wait disabled:text-gray-300"
                    >
                      <Copy size={16} />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleArchiveMenuItem(item)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Archive size={16} />
                      Arsip
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        )}

        {!isLoadingMenu && filteredMenuItems.length === 0 ? (
          <StateCard
            title="Menu tidak ditemukan"
            description="Ubah kata kunci, kategori, atau filter stok untuk melihat menu lain."
            variant="empty"
            action={{
              label: "Tambah Menu",
              onClick: handleOpenModal,
            }}
          />
        ) : null}
      </section>

      {isFoodModalOpen ? (
        <div
          className="animate-in fade-in fixed inset-0 z-[90] overflow-y-auto bg-gray-900/60 px-4 py-6 backdrop-blur-sm [scrollbar-width:none] sm:px-6 sm:py-8 [&::-webkit-scrollbar]:hidden"
          onClick={handleCloseModal}
        >
          <div className="flex min-h-full items-start justify-center">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="owner-food-form-title"
              onClick={(event) => event.stopPropagation()}
              className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0_28px_120px_rgba(15,23,42,0.22)] [scrollbar-width:none] animate-[modal-pop_240ms_cubic-bezier(0.16,1,0.3,1)] sm:max-h-[calc(100vh-4rem)] sm:p-8 [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  {isEditMode ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Edit size={22} />
                    </div>
                  ) : null}
                  <div>
                  <h3
                    id="owner-food-form-title"
                    className="text-2xl font-extrabold tracking-tight text-gray-900"
                  >
                    {isEditMode ? "Edit Makanan" : "Tambah Makanan Surplus"}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {isEditMode
                      ? "Perbarui detail menu, stok, harga, dan jam pickup makanan."
                      : "Lengkapi detail menu agar bisa langsung dipublish ke etalase surplus hari ini."}
                  </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-2xl border border-gray-200 p-3 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
                  aria-label="Tutup modal"
                >
                  <X size={18} />
                </button>
              </div>

              {menuNotice ? (
                <div className="mt-6 rounded-[22px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 font-bold text-amber-700">
                  {menuNotice}
                </div>
              ) : null}

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div>
                  <span className={fieldLabelClassName}>Upload Foto</span>
                  <label
                    htmlFor={uploadInputId}
                    className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <input
                      id={uploadInputId}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                    />

                    {imagePreview ? (
                      <div className="w-full">
                        <div className="relative h-48 w-full overflow-hidden rounded-[24px]">
                          <Image
                            src={imagePreview}
                            alt="Preview makanan surplus"
                            fill
                            sizes="(max-width: 768px) 100vw, 640px"
                            className="object-cover"
                          />
                        </div>
                        <p className="mt-4 text-sm font-bold text-emerald-600">
                          Klik untuk ganti gambar
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.14)]">
                          <UploadCloud size={26} />
                        </div>
                        <p className="mt-4 text-base font-extrabold tracking-tight text-gray-900">
                          Klik untuk upload gambar
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                          Format JPG, PNG, atau WEBP. Maksimal 4MB.
                        </p>
                      </>
                    )}
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="food-name" className={fieldLabelClassName}>
                      Nama Makanan
                    </label>
                    <input
                      id="food-name"
                      type="text"
                      required
                      value={formState.name}
                      onChange={(event) =>
                        handleFieldChange("name", event.target.value)
                      }
                      placeholder="Contoh: Paket Croissant Mix"
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label htmlFor="food-category" className={fieldLabelClassName}>
                      Kategori
                    </label>
                    <div className="relative">
                      <select
                        id="food-category"
                        required
                        value={formState.category}
                        onChange={(event) =>
                          handleFieldChange("category", event.target.value)
                        }
                        className={`${inputClassName} appearance-none pr-11`}
                      >
                        <option value="">Pilih kategori</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={18}
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="food-description" className={fieldLabelClassName}>
                    Deskripsi Makanan
                  </label>
                  <textarea
                    id="food-description"
                    required
                    rows={4}
                    value={formState.description}
                    onChange={(event) =>
                      handleFieldChange("description", event.target.value)
                    }
                    placeholder="Tulis detail singkat porsi, rasa, atau kondisi makanan."
                    className={`${inputClassName} resize-none py-4`}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="food-original-price" className={fieldLabelClassName}>
                      Harga Asli
                    </label>
                    <input
                      id="food-original-price"
                      type="number"
                      min="0"
                      required
                      value={formState.originalPrice}
                      onChange={(event) =>
                        handleFieldChange("originalPrice", event.target.value)
                      }
                      placeholder="30000"
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label htmlFor="food-discount-price" className={fieldLabelClassName}>
                      Harga Diskon
                    </label>
                    <input
                      id="food-discount-price"
                      type="number"
                      min="0"
                      required
                      value={formState.discountPrice}
                      onChange={(event) =>
                        handleFieldChange("discountPrice", event.target.value)
                      }
                      placeholder="15000"
                      className={emeraldInputClassName}
                    />
                  </div>

                  <div>
                    <label htmlFor="food-stock" className={fieldLabelClassName}>
                      Stok
                    </label>
                    <input
                      id="food-stock"
                      type="number"
                      min="0"
                      required
                      value={formState.stock}
                      onChange={(event) =>
                        handleFieldChange("stock", event.target.value)
                      }
                      placeholder="5"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <span className={fieldLabelClassName}>Jam Pickup</span>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="time"
                      required
                      value={formState.pickupStart}
                      onChange={(event) =>
                        handleFieldChange("pickupStart", event.target.value)
                      }
                      className={inputClassName}
                    />
                    <input
                      type="time"
                      required
                      value={formState.pickupEnd}
                      onChange={(event) =>
                        handleFieldChange("pickupEnd", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="food-status" className={fieldLabelClassName}>
                      Status Menu
                    </label>
                    <div className="relative">
                      <select
                        id="food-status"
                        value={formState.status}
                        onChange={(event) =>
                          handleFieldChange(
                            "status",
                            event.target.value as MenuItemStatus,
                          )
                        }
                        className={`${inputClassName} appearance-none pr-11`}
                      >
                        <option value="ACTIVE">Aktif</option>
                        <option value="HIDDEN">Hidden</option>
                        <option value="SCHEDULED">Terjadwal</option>
                        <option value="SOLD_OUT">Sold Out</option>
                        <option value="ARCHIVED">Arsip</option>
                      </select>
                      <ChevronDown
                        size={18}
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="food-publish-at" className={fieldLabelClassName}>
                      Jadwal Publish
                    </label>
                    <input
                      id="food-publish-at"
                      type="datetime-local"
                      value={formState.publishAt}
                      onChange={(event) =>
                        handleFieldChange("publishAt", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="food-expires-at" className={fieldLabelClassName}>
                      Otomatis Sold Out
                    </label>
                    <input
                      id="food-expires-at"
                      type="datetime-local"
                      value={formState.expiresAt}
                      onChange={(event) =>
                        handleFieldChange("expiresAt", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-2 py-3 text-sm font-bold text-gray-500 transition-colors hover:text-gray-900"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingMenu}
                    className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(17,24,39,0.18)] transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {isSavingMenu
                      ? "Menyimpan..."
                      : isEditMode
                        ? "Simpan Perubahan"
                        : "Simpan & Publish"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {deletingItem ? (
        <div
          className="animate-in fade-in fixed inset-0 z-[95] flex items-center justify-center bg-gray-900/60 px-4 backdrop-blur-sm"
          onClick={() => setDeletingItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-menu-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-[0_28px_120px_rgba(15,23,42,0.22)] animate-[modal-pop_220ms_cubic-bezier(0.16,1,0.3,1)]"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={30} className="text-red-600" />
            </div>
            <h3
              id="delete-menu-title"
              className="text-xl font-extrabold tracking-tight text-gray-900"
            >
              Hapus Menu Ini?
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Data yang dihapus tidak dapat dikembalikan.
            </p>
            <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
              {deletingItem.name}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteMenuItem}
                disabled={isDeletingMenu}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(220,38,38,0.22)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isDeletingMenu ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
