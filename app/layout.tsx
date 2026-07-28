import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
