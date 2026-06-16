import { PageState } from "@/components/ui-state";

export default function Loading() {
  return (
    <PageState
      variant="loading"
      title="Memuat halaman"
      description="Sebentar, ResQFood sedang menyiapkan data terbaru."
    />
  );
}
