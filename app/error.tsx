"use client";

import { useEffect } from "react";

import { PageState } from "@/components/ui-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageState
      variant="error"
      title="Halaman gagal dimuat"
      description="Koneksi atau data halaman sedang bermasalah. Coba muat ulang halaman ini."
      action={{
        label: "Coba Lagi",
        onClick: reset,
      }}
    />
  );
}
