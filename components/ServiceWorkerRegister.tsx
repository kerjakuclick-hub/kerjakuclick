// FILE BARU (25 September 2026): mendaftarkan public/sw.js di semua halaman
// supaya aplikasi Mitra/Admin/Pelanggan memenuhi syarat install Chrome HP
// Android. Lihat catatan di public/sw.js -- service worker ini TIDAK
// menyimpan cache data apa pun.

"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("Gagal mendaftarkan service worker:", err);
    });
  }, []);
  return null;
}
