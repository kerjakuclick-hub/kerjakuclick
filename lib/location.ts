// FILE BARU: lib/location.ts
//
// Helper kecil untuk fitur "Bagikan Lokasi" di Chat Pesanan (perluasan
// Bagian 7.2/8.2, migrasi 026_order_messages_location.sql). Dipakai
// bersama oleh sisi mitra/admin (components/shared/OrderChat.tsx) dan sisi
// pelanggan (components/OrderChatCustomer.tsx) supaya teks & logika
// pengambilan lokasi browser konsisten di kedua sisi, tidak dua kali
// ditulis beda-beda.
//
// Desain yang dipilih: SEDERHANA -- cukup titik koordinat (lat/lng) dikirim
// sebagai satu pesan chat bertipe "location", dirender sebagai tautan
// Google Maps ("Buka di Google Maps"). Tidak pakai skema attachment umum
// (upload file/gambar dsb) karena yang dibutuhkan sekarang cuma berbagi
// titik lokasi -- lat/lng jauh lebih mudah dipahami & dirawat (2 kolom
// angka) dibanding sistem attachment generik yang perlu storage bucket,
// tipe MIME, dsb.

/** Teks isi pesan (kolom `body`) untuk pesan lokasi -- tetap diisi (bukan
 *  kosong) supaya tampilan lama yang cuma baca `body` tetap masuk akal,
 *  dan supaya notifikasi/daftar chat singkat tetap informatif. */
export const LOCATION_MESSAGE_BODY = "📍 Membagikan titik lokasi saat ini";

/** Rentang valid koordinat bumi -- validasi dasar sebelum dikirim ke server. */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Link Google Maps untuk satu titik koordinat -- dibuka di tab baru, tidak
 *  perlu API key (beda dengan Static Maps yang butuh billing/API key). */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Bungkus Geolocation API browser (callback-based) jadi Promise dengan
 *  pesan error berbahasa Indonesia yang jelas per kasus (izin ditolak,
 *  tidak terdeteksi, timeout) -- dipakai langsung sebagai teks error di UI
 *  chat kedua sisi. */
export function getBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Perangkat/browser ini tidak mendukung fitur berbagi lokasi."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        let message = "Gagal mengambil lokasi. Coba lagi.";
        if (err.code === err.PERMISSION_DENIED) {
          message = "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser Anda.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "Lokasi tidak dapat dideteksi saat ini. Pastikan GPS/lokasi perangkat aktif.";
        } else if (err.code === err.TIMEOUT) {
          message = "Waktu permintaan lokasi habis. Coba lagi.";
        }
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
