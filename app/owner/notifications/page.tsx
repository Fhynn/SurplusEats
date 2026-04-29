import { AlertCircle, CheckCircle2, ShoppingBag } from "lucide-react";

const notifications = [
  {
    id: 1,
    title: "Pesanan Baru Masuk",
    description: "Order SFM-99A2X menunggu konfirmasi dari restoran.",
    time: "2 menit lalu",
    type: "order",
    unread: true,
  },
  {
    id: 2,
    title: "Stok Hampir Habis",
    description: "Paket Roti Artisan tersisa 2 porsi untuk pickup malam ini.",
    time: "18 menit lalu",
    type: "stock",
    unread: true,
  },
  {
    id: 3,
    title: "Sistem Pembayaran Normal",
    description: "Gateway pembayaran sudah kembali stabil setelah pemeliharaan.",
    time: "1 jam lalu",
    type: "system",
    unread: false,
  },
  {
    id: 4,
    title: "Pickup Selesai",
    description: "Customer sudah mengambil pesanan SFM-44F7U dari toko.",
    time: "Kemarin",
    type: "system",
    unread: false,
  },
] as const;

const notificationStyleByType = {
  order: {
    icon: ShoppingBag,
    className: "bg-blue-50 text-blue-600",
  },
  stock: {
    icon: AlertCircle,
    className: "bg-amber-50 text-amber-600",
  },
  system: {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-600",
  },
} as const;

export default function OwnerNotificationsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-emerald-500 uppercase">
              Owner Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-950">
              Pusat Notifikasi
            </h1>
          </div>
          <button
            type="button"
            className="w-fit rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-extrabold text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            Tandai Semua Dibaca
          </button>
        </div>

        <div className="space-y-3 p-5">
          {notifications.map((notification) => {
            const style = notificationStyleByType[notification.type];
            const Icon = style.icon;

            return (
              <article
                key={notification.id}
                className={`rounded-[24px] border p-5 transition-colors ${
                  notification.unread
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${style.className}`}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="text-sm font-extrabold text-gray-950">
                        {notification.title}
                      </h2>
                      <span className="shrink-0 text-xs font-bold text-gray-400">
                        {notification.time}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 font-medium text-gray-500">
                      {notification.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
