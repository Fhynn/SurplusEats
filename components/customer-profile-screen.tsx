"use client";

import Image from "next/image";
import {
  ChevronLeft,
  Flame,
  History,
  Leaf,
  LogOut,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function CustomerProfileScreen() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-gray-50 pb-24">
      <div className="relative overflow-hidden rounded-b-[40px] bg-white px-6 pt-10 pb-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-emerald-50 blur-3xl" />

        <div className="relative z-10 mb-8 flex items-center gap-5 pt-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-emerald-100 shadow-[0_10px_26px_rgba(15,23,42,0.10)]">
            <Image
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alfhin"
              alt="User avatar"
              width={80}
              height={80}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h2 className="mb-0.5 text-2xl font-extrabold tracking-tight text-gray-900">
              Alfhin
            </h2>
            <p className="text-sm font-medium text-gray-500">
              alfhin@email.com
            </p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <Leaf size={10} />
              Food Hero Level 2
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-[20px] border border-emerald-100/50 bg-emerald-50 p-4">
            <Leaf size={24} className="absolute right-2 bottom-2 text-emerald-500/20" />
            <p className="mb-1 text-[10px] font-extrabold tracking-wider text-emerald-800 uppercase">
              Food Saved
            </p>
            <p className="text-xl font-extrabold tracking-tight text-gray-900">
              12.5 <span className="text-sm font-medium text-gray-500">Kg</span>
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[20px] border border-amber-100/50 bg-amber-50 p-4">
            <Flame size={24} className="absolute right-2 bottom-2 text-amber-500/20" />
            <p className="mb-1 text-[10px] font-extrabold tracking-wider text-amber-800 uppercase">
              Total Order
            </p>
            <p className="text-xl font-extrabold tracking-tight text-gray-900">
              24{" "}
              <span className="text-sm font-medium text-gray-500">Kali</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3 px-6">
        <button
          type="button"
          onClick={() => router.push("/orders")}
          className="group flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-emerald-200 active:scale-[0.98]"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-xl bg-gray-50 p-2.5 transition-colors group-hover:bg-emerald-50">
              <History size={20} className="text-gray-700 group-hover:text-emerald-600" />
            </span>
            <span className="text-sm font-bold text-gray-900">
              Riwayat Pesanan
            </span>
          </span>
          <ChevronLeft size={18} className="rotate-180 text-gray-400 group-hover:text-emerald-500" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/profile/settings")}
          className="group flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-gray-200 active:scale-[0.98]"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-xl bg-gray-50 p-2.5">
              <Settings size={20} className="text-gray-700" />
            </span>
            <span className="text-sm font-bold text-gray-900">
              Pengaturan Akun
            </span>
          </span>
          <ChevronLeft size={18} className="rotate-180 text-gray-400" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 flex w-full items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-4 transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <span className="rounded-xl bg-red-100 p-2">
              <LogOut size={18} className="text-red-600" />
            </span>
            <span className="text-sm font-bold text-red-600">Keluar Akun</span>
          </span>
        </button>
      </div>
    </div>
  );
}
