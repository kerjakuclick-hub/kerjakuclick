import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import FloatingChatLauncher from "@/components/FloatingChatLauncher";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PublicInstallBanner from "@/components/PublicInstallBanner";
import BusinessParamsProvider from "@/components/BusinessParamsProvider";
import { ensureBusinessParams, toPublicBusinessParams } from "@/lib/businessParams";

// BARU (25 Sep 2026): halaman memuat ulang Parameter Bisnis (harga,
// katalog -- migrasi 040) paling lambat tiap 60 detik; langsung saat Super
// Admin menyimpan perubahan (revalidateTag di API parameter).
export const revalidate = 60;

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kerjaku.click"),
  title: "Kerjakuclick — Jasa Tenaga Kerja ke Rumah Anda, Sekali Klik | Kota Palu",
  description:
    "Pesan jasa setrika, bersih-bersih rumah, dan cuci kendaraan langsung ke rumah Anda di Kota Palu. Isi form, klik pesan, langsung terkirim via WhatsApp. Mitra terpercaya, tarif jelas.",
  manifest: "/manifest.webmanifest",
  keywords: [
    "jasa setrika palu",
    "jasa bersih rumah palu",
    "cuci motor panggilan palu",
    "cuci mobil panggilan palu",
    "kerjakuclick",
    "jasa tenaga kerja kota palu",
  ],
  openGraph: {
    title: "Kerjakuclick — Jasa Tenaga Kerja ke Rumah Anda, Sekali Klik",
    description:
      "Setrika, bersih rumah, cuci kendaraan — pesan lewat WhatsApp, mitra datang ke rumah Anda di Kota Palu.",
    url: "https://www.kerjaku.click",
    siteName: "Kerjakuclick",
    locale: "id_ID",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Parameter Bisnis: diterapkan di server (lengkap) + dikirim ke browser
  // versi publik (fee/transport/bahan dikosongkan -- lihat
  // toPublicBusinessParams).
  const businessParams = await ensureBusinessParams();
  const publicParams = toPublicBusinessParams(businessParams);

  return (
    <html lang="id" className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="font-body antialiased">
        <BusinessParamsProvider params={publicParams}>
        {children}
        {/* Tombol Chat Pesanan melayang -- lihat components/FloatingChatLauncher.tsx.
            Dipasang di root layout supaya otomatis muncul di semua halaman publik;
            komponennya sendiri yang menentukan kapan harus disembunyikan (belum
            login, tidak ada pesanan aktif, atau sedang di dasbor admin/mitra). */}
        <FloatingChatLauncher />
        {/* BARU (25 Sep 2026): service worker utk syarat install aplikasi di
            HP Android -- lihat components/ServiceWorkerRegister.tsx. */}
        <ServiceWorkerRegister />
        {/* BARU (25 Sep 2026): ajakan install aplikasi untuk pelanggan di
            website publik -- lihat components/PublicInstallBanner.tsx. */}
        <PublicInstallBanner />
        </BusinessParamsProvider>
      </body>
    </html>
  );
}
