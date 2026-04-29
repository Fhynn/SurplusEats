import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OwnerMenuManagement } from "@/components/owner-menu-management";

export default function OwnerMenuPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-[family-name:var(--font-plus-jakarta-sans)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/owner/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors hover:border-emerald-200 hover:text-emerald-600"
          >
            <ArrowLeft size={16} />
            Kembali ke Dashboard Owner
          </Link>
        </div>

        <OwnerMenuManagement />
      </div>
    </div>
  );
}
