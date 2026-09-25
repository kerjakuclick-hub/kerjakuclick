// FILE BARU (25 September 2026): mendaftarkan public/sw.js di semua halaman
// supaya aplikasi Mitra/Admin/Pelanggan memenuhi syarat install Chrome HP
// Android. Lihat catatan di public/sw.js -- service worker ini TIDAK
// menyimpan cache data apa pun.
//
// REVISI (25 Sep 2026): juga "menangkap" event beforeinstallprompt dari
// Chrome sedini mungkin (event ini bisa muncul SEBELUM kartu install di
// dasbor sempat tampil) dan menyimpannya di window.__kkInstallPrompt --
// dipakai components/InstallAppCard.tsx.

"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __kkInstallPrompt?: any;
    __kkInstalled?: boolean;
  }
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault(); // tampilkan lewat tombol kita sendiri
      window.__kkInstallPrompt = e;
      window.dispatchEvent(new Event("kk-install-available"));
    }
    function onInstalled() {
      window.__kkInstallPrompt = undefined;
      window.__kkInstalled = true;
      window.dispatchEvent(new Event("kk-installed"));
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
        console.error("Gagal mendaftarkan service worker:", err);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
