export const CATEGORIES = [
  "Semua",
  "Nasi",
  "Roti & Pastry",
  "Sayur",
  "Snack",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Food {
  id: number;
  name: string;
  restaurant: string;
  distance: string;
  rating: number;
  reviews: number;
  stock: number;
  time: string;
  originalPrice: number;
  price: number;
  image: string;
  category: Exclude<Category, "Semua">;
  description: string;
}

export interface CartItem extends Food {
  qty: number;
}

export const MOCK_FOODS: Food[] = [
  {
    id: 1,
    name: "Paket Roti Artisan Sourdough",
    restaurant: "Bakehouse Bakery",
    distance: "1.2 km",
    rating: 4.8,
    reviews: 124,
    stock: 3,
    time: "19:00 - 21:00",
    originalPrice: 45000,
    price: 15000,
    category: "Roti & Pastry",
    description:
      "Paket berisi 3 jenis roti artisan (Sourdough, Croissant, dan Baguette) produksi hari ini. Kualitas masih sangat baik, diselamatkan agar tidak terbuang. Cocok untuk sarapan besok pagi!",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Nasi Ayam Bakar Spesial",
    restaurant: "Warteg Modern Bahari",
    distance: "0.8 km",
    rating: 4.6,
    reviews: 87,
    stock: 5,
    time: "20:00 - 22:00",
    originalPrice: 25000,
    price: 12000,
    category: "Nasi",
    description:
      "Nasi ayam bakar lengkap dengan sambal rumahan, tumis sayur, dan lauk pendamping pilihan. Masih fresh, hanya dialihkan agar tidak menjadi food waste malam ini.",
    image:
      "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Assorted Sushi Roll (8 Pcs)",
    restaurant: "Sushi Yay!",
    distance: "2.5 km",
    rating: 4.9,
    reviews: 201,
    stock: 2,
    time: "21:30 - 22:30",
    originalPrice: 85000,
    price: 35000,
    category: "Snack",
    description:
      "Isi 8 potong assorted sushi roll premium yang diracik untuk layanan dine-in malam ini. Rasa dan teksturnya masih optimal untuk dinikmati segera saat pickup.",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=600&auto=format&fit=crop",
  },
];

export const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
