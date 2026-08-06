// FILE BARU: app/manifest.ts
//
// Next.js otomatis mendeteksi file ini dan generate tag <link rel="manifest">
// di setiap halaman. Manifest ini yang membuat logo Kerjaku.click muncul
// sebagai ikon app saat pengguna "Add to Home Screen" di HP, atau
// "Install App" lewat Chrome/Edge di desktop.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kerjaku.click — Jasa Tenaga Kerja Ke Rumah Anda",
    short_name: "Kerjaku.click",
    description: "Jasa setrika, bersih rumah, dan cuci kendaraan on-demand di Kota Palu.",
    start_url: "/",
    display: "standalone",
    background_color: "#EEF2EE",
    theme_color: "#1D6F8C",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
