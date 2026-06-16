import { PageState } from "@/components/ui-state";

export default function NotFound() {
  return (
    <PageState
      variant="empty"
      title="Halaman tidak ditemukan"
      description="Route yang kamu buka tidak tersedia atau sudah dipindahkan."
      action={{
        label: "Kembali ke Beranda",
        href: "/home",
      }}
    />
  );
}
