// FILE BARU: components/shared/LocationMessageCard.tsx
//
// Kartu tampilan untuk pesan chat bertipe "location" (fitur "Bagikan
// Lokasi", migrasi 026_order_messages_location.sql) -- dipakai bersama oleh
// components/shared/OrderChat.tsx (mitra/admin, tema terang) dan
// components/OrderChatCustomer.tsx (pelanggan, tema gelap), supaya
// tampilannya konsisten di kedua sisi. Cukup tautan "Buka di Google Maps"
// -- tidak menampilkan peta tertanam (Static Maps butuh API key/billing
// terpisah), jadi tetap ringan & tidak butuh setup tambahan.

type LocationMessageCardProps = {
  lat: number;
  lng: number;
  /** "light" dipakai di chat mitra/admin (bg terang), "dark" di chat
   *  pelanggan (bg gelap bay-deep) -- supaya kontras warnanya pas di
   *  keduanya tanpa duplikasi komponen. */
  tone: "light" | "dark";
};

export default function LocationMessageCard({ lat, lng, tone }: LocationMessageCardProps) {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  const isDark = tone === "dark";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
        isDark
          ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
          : "border-line bg-bay-light/10 text-bay-deep hover:bg-bay-light/20"
      }`}
    >
      <span aria-hidden>📍</span>
      <span>Buka lokasi di Google Maps</span>
    </a>
  );
}
