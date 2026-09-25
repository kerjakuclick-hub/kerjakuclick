// FILE BARU (25 September 2026): menerapkan Parameter Bisnis (katalog,
// harga, fee, dst -- migrasi 040) ke lib/services.ts di BROWSER, sebelum
// komponen di dalamnya dirender. Di server, parameter sudah diterapkan
// lewat ensureBusinessParams() (lib/businessParams.ts) -- komponen ini
// sengaja TIDAK mengubah state server (supaya versi "publik" yang angka
// internalnya dikosongkan tidak pernah dipakai perhitungan di server).
//
// Dipasang di app/layout.tsx (versi publik) dan app/mitra/layout.tsx +
// app/admin/layout.tsx (versi lengkap).

"use client";

import { applyBusinessParams, type BusinessParams } from "@/lib/services";

export default function BusinessParamsProvider({
  params,
  children,
}: {
  params: BusinessParams;
  children: React.ReactNode;
}) {
  if (typeof window !== "undefined") {
    applyBusinessParams(params);
  }
  return <>{children}</>;
}
