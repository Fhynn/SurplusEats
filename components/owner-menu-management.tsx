"use client";

import Image from "next/image";
import {
  ChevronDown,
  Clock,
  Edit,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useId, useState } from "react";

type SurplusMenuItem = {
  id: number;
  name: string;
  category: string;
  description: string;
  stock: number;
  originalPrice: number;
  discountPrice: number;
  pickupStart: string;
  pickupEnd: string;
  image: string;
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
};

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

const initialMenuItems: SurplusMenuItem[] = [
  {
    id: 1,
    name: "Paket Roti Artisan",
    category: "Bakery",
    description: "Assorted sourdough, focaccia, dan soft roll yang masih fresh untuk pickup malam ini.",
    stock: 3,
    originalPrice: 45000,
    discountPrice: 15000,
    pickupStart: "19:00",
    pickupEnd: "21:00",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Rice Bowl Chicken Katsu",
    category: "Rice Bowl",
    description: "Menu makan malam praktis dengan saus gurih manis dan topping crunchy.",
    stock: 5,
    originalPrice: 32000,
    discountPrice: 17000,
    pickupStart: "18:30",
    pickupEnd: "20:30",
    image:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Baguette Panjang",
    category: "Bakery",
    description: "Baguette renyah untuk stok rumah, cocok dipadukan dengan sup atau salad.",
    stock: 0,
    originalPrice: 25000,
    discountPrice: 10000,
    pickupStart: "19:00",
    pickupEnd: "21:00",
    image:
      "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Donut Box Cokelat",
    category: "Dessert",
    description: "Isi 4 donut glaze cokelat, cocok untuk camilan kantor atau keluarga.",
    stock: 7,
    originalPrice: 28000,
    discountPrice: 12000,
    pickupStart: "17:30",
    pickupEnd: "20:00",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Fresh Salad Bowl",
    category: "Healthy Bowl",
    description: "Mixed greens, roasted vegetables, dan dressing lemon ringan untuk makan cepat.",
    stock: 4,
    originalPrice: 34000,
    discountPrice: 19000,
    pickupStart: "18:00",
    pickupEnd: "20:30",
    image:
      "https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 6,
    name: "Cold Brew Latte",
    category: "Beverage",
    description: "Minuman kopi susu dingin dengan stok terbatas untuk penutup hari.",
    stock: 2,
    originalPrice: 26000,
    discountPrice: 14000,
    pickupStart: "18:00",
    pickupEnd: "20:00",
    image:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=1200&auto=format&fit=crop",
  },
];

const categoryOptions = [
  "Bakery",
  "Rice Bowl",
  "Dessert",
  "Healthy Bowl",
  "Beverage",
] as const;

const fallbackImageByCategory: Record<string, string> = {
  Bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200&auto=format&fit=crop",
  "Rice Bowl":
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1200&auto=format&fit=crop",
  Dessert:
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1200&auto=format&fit=crop",
  "Healthy Bowl":
    "https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=1200&auto=format&fit=crop",
  Beverage:
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=1200&auto=format&fit=crop",
};

const defaultFormState: MenuFormState = {
  name: "",
  category: "",
  description: "",
  originalPrice: "",
  discountPrice: "",
  stock: "",
  pickupStart: "",
  pickupEnd: "",
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
  return `${start} - ${end}`;
}

export function OwnerMenuManagement() {
  const uploadInputId = useId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SurplusMenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<SurplusMenuItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [formState, setFormState] = useState<MenuFormState>(defaultFormState);
  const isEditMode = editingItem !== null;
  const isFoodModalOpen = isModalOpen || isEditMode;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setImagePreview(null);
    setFormState(defaultFormState);
  };

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
  }, [isFoodModalOpen, deletingItem]);

  const handleOpenModal = () => {
    setEditingItem(null);
    setImagePreview(null);
    setFormState(defaultFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: SurplusMenuItem) => {
    setIsModalOpen(false);
    setEditingItem(item);
    setImagePreview(item.image);
    setFormState({
      name: item.name,
      category: item.category,
      description: item.description,
      originalPrice: String(item.originalPrice),
      discountPrice: String(item.discountPrice),
      stock: String(item.stock),
      pickupStart: item.pickupStart,
      pickupEnd: item.pickupEnd,
    });
  };

  const handleFieldChange = <Key extends keyof MenuFormState>(
    field: Key,
    value: MenuFormState[Key],
  ) => {
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

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const originalPrice = Number(formState.originalPrice);
    const discountPrice = Number(formState.discountPrice);
    const stock = Number(formState.stock);

    const nextMenuItem: SurplusMenuItem = {
      id: editingItem?.id ?? Date.now(),
      name: formState.name.trim(),
      category: formState.category,
      description: formState.description.trim(),
      stock,
      originalPrice,
      discountPrice,
      pickupStart: formState.pickupStart,
      pickupEnd: formState.pickupEnd,
      image:
        imagePreview ??
        fallbackImageByCategory[formState.category] ??
        initialMenuItems[0].image,
    };

    setMenuItems((current) =>
      editingItem
        ? current.map((item) =>
            item.id === editingItem.id ? nextMenuItem : item,
          )
        : [nextMenuItem, ...current],
    );
    handleCloseModal();
  };

  const handleDeleteMenuItem = () => {
    if (!deletingItem) {
      return;
    }

    setMenuItems((current) =>
      current.filter((item) => item.id !== deletingItem.id),
    );
    setDeletingItem(null);
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {menuItems.map((item) => {
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
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className={`absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-extrabold shadow-sm ${
                      item.stock > 0
                        ? "bg-white text-emerald-600"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {item.stock > 0 ? `Sisa Stok: ${item.stock}` : "SOLD OUT"}
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

                  <div className="flex gap-3 border-t border-gray-100 pt-5">
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
      </section>

      {isFoodModalOpen ? (
        <div
          className="animate-in fade-in fixed inset-0 z-[90] bg-gray-900/60 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div className="flex min-h-full items-center justify-center px-4 py-8 sm:px-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="owner-food-form-title"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-[0_28px_120px_rgba(15,23,42,0.22)] animate-[modal-pop_240ms_cubic-bezier(0.16,1,0.3,1)] sm:p-8"
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
                          Format JPG, PNG, atau WEBP untuk tampilan card menu.
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
                    className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(17,24,39,0.18)] transition-all hover:bg-emerald-500 active:scale-[0.98]"
                  >
                    {isEditMode ? "Simpan Perubahan" : "Simpan & Publish"}
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
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(220,38,38,0.22)] transition-colors hover:bg-red-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
