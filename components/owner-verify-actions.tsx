"use client";

import { HelpCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OwnerVerifyActions() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <a
        href="mailto:support@resqfood.id"
        className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5 text-sm font-extrabold text-blue-700 transition-colors hover:bg-blue-100"
      >
        <HelpCircle size={17} />
        Support
      </a>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-center text-sm font-extrabold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
      >
        <LogOut size={17} />
        {isLoggingOut ? "Keluar..." : "Keluar"}
      </button>
    </div>
  );
}
