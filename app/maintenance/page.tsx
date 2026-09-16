// BARU — app/maintenance/page.tsx
//
// Halaman yang ditampilkan ke SEMUA pengunjung (publik, mitra, admin yang
// belum punya cookie bypass) selama MAINTENANCE_MODE aktif (lihat
// middleware.ts). Sengaja generik/tidak menyebut alasan internal (audit
// fraud) ke publik -- cukup informasikan sedang pemeliharaan, dan beri
// kontak CS untuk klien yang order-nya sedang berjalan.
//
// Halaman ini statis (tidak query Supabase apa pun) supaya tetap bisa
// tampil walau ada masalah di backend/database.

export const dynamic = "force-static";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-card border border-line bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bridge/25 text-2xl">
          🛠️
        </div>
        <h1 className="font-display text-xl font-semibold text-ink">
          Sedang Dalam Pemeliharaan
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/70">
          Kerjaku.click sedang melakukan pemeliharaan sistem untuk meningkatkan kualitas layanan.
          Pemesanan baru untuk sementara belum bisa dilakukan. Mohon maaf atas
          ketidaknyamanannya — silakan coba kembali dalam waktu dekat.
        </p>
        <div className="mt-6 rounded-lg bg-paper p-4 text-left">
          <p className="text-xs font-semibold uppercase text-ink/50">
            Ada pesanan yang sedang berjalan?
          </p>
          <p className="mt-1 text-sm text-ink/70">
            Untuk pertanyaan mendesak terkait pesanan Anda, silakan hubungi Customer Service kami
            di WhatsApp:
          </p>
          <a
            href="https://wa.me/6281141109567?text=Halo%2C%20saya%20ingin%20bertanya%20soal%20pesanan%20saya%20saat%20website%20maintenance."
            className="mt-2 inline-block rounded-full bg-wa px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Chat CS via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
