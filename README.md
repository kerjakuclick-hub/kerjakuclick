# Landing Page v2 — Kerjaku.click (Redesign via Google Stitch)

## Cara pakai

Timpa file-file berikut di project Anda dengan isi yang ada di paket ini:

```
components/Header.tsx        ← timpa
components/Hero.tsx          ← timpa (tetap pakai <WhatsAppPreview /> asli)
components/ServicesGrid.tsx  ← timpa
components/HowItWorks.tsx    ← timpa
components/Footer.tsx        ← timpa
app/page.tsx                 ← timpa (tetap pakai <OrderForm /> asli)
```

File **baru** (belum ada sebelumnya):

```
components/TrustBar.tsx
components/MitraShowcase.tsx   ← dynamic, ambil data mitra asli dari Supabase
components/WhyChooseUs.tsx
```

**Tidak disentuh sama sekali**: `components/OrderForm.tsx`,
`components/WhatsAppPreview.tsx` — logika form & pengiriman WA Anda yang
sudah jalan tetap seperti semula, hanya dibungkus tampilan baru.

## Yang PERLU dicek sebelum deploy

1. **`components/Hero.tsx` mengasumsikan `<WhatsAppPreview />` tidak butuh
   props.** Kalau ternyata komponen itu butuh data (mis. dari state
   `OrderForm`), akan muncul error TypeScript saat build. Kalau itu terjadi,
   kirim isi `WhatsAppPreview.tsx` ke saya, saya sesuaikan pemanggilannya.
2. **`components/MitraShowcase.tsx` query ke tabel `profiles`** — pastikan
   sudah jalan di atas migrasi 007 (kolom `photo_url`, `skill_category`,
   `rating` harus sudah ada). Kalau belum ada mitra yang `is_active = true`
   dengan data lengkap, section ini otomatis tidak tampil (bukan error).
3. **Font**: komponen pakai `var(--font-space-grotesk)` untuk heading,
   sesuai variable yang sudah didefinisikan di `layout.tsx` Anda
   (`Space_Grotesk({..., variable: "--font-space-grotesk"})`). Kalau nama
   variable-nya beda, sesuaikan di semua file (cari `--font-space-grotesk`).
4. **Foto layanan**: sengaja saya ganti dari URL sementara Google (hasil
   Stitch) jadi placeholder gradient warna brand + emoji, supaya tidak
   bergantung pada link yang bisa mati kapan saja. Kalau Anda punya foto
   asli hasil kerja mitra, kirim ke saya — saya pasang lewat `next/image`.

## Belum dimasukkan — menunggu konfirmasi Anda

- **Section Testimoni** — hasil Stitch berisi nama & kutipan pelanggan
  FIKTIF. Tidak dimasukkan ke `app/page.tsx` sampai ada testimoni asli
  (dari chat WA pelanggan, review Instagram/Google) yang bisa saya pasang,
  atau Anda putuskan untuk skip dulu section ini.
- **Section FAQ** — berisi 3 klaim yang perlu dikonfirmasi:
  1. Verifikasi KTP + pemeriksaan latar belakang mitra — sungguhan?
  2. Pemantauan kesehatan/vaksinasi mitra rutin — sungguhan?
  3. CS 24/7 — atau tetap 07.00–20.00 WIB sesuai SOP WA yang sudah dibuat?
- **Panel "Kenapa Memilih Kerjaku"** (`WhyChooseUs.tsx`) — saya sudah
  lunakkan klaim "verifikasi KTP" jadi "proses seleksi mitra" yang lebih
  umum. Update ke kalimat yang lebih spesifik begitu proses seleksi mitra
  yang sebenarnya dikonfirmasi.

## Setelah semua file ditempel

```bash
npm run dev
# cek localhost:3000, pastikan tidak ada error, scroll semua section
```

Kalau lolos, lanjut commit & push seperti biasa (branch baru dulu, PR,
cek di Preview, baru merge ke main).
