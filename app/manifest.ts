import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ResQFood",
    short_name: "ResQFood",
    description: "Rescue surplus food nearby and manage pickup orders.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#10b981",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      {
        src: "/logo.webp",
        sizes: "192x192",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: "/logo.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: "/logo.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Cari Menu",
        short_name: "Menu",
        description: "Buka marketplace ResQFood.",
        url: "/browse",
        icons: [{ src: "/logo.webp", sizes: "192x192" }],
      },
      {
        name: "Pesanan",
        short_name: "Order",
        description: "Lihat status pickup.",
        url: "/orders",
        icons: [{ src: "/logo.webp", sizes: "192x192" }],
      },
    ],
  };
}
