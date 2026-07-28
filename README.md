# Kerjakuclick — Landing Page (MVP Fase 1)

Landing page publik untuk Kerjakuclick, sesuai PRD MVP Fase 1. Dibangun dengan
**Next.js (App Router) + TypeScript + Tailwind CSS**, siap deploy ke **Vercel**.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Konsep desain

- **Motif visual**: siluet Jembatan Kuning (landmark Kota Palu) ditampilkan tipis
  di bagian hero — menegaskan identitas lokal, bukan template generik.
- **Palet warna**: putih kehijauan pucat (`paper`) + biru teluk (`bay`) + kuning
  jembatan (`bridge`), dengan hijau WhatsApp (`wa`) dipakai *khusus* pada
  tombol/aksi WhatsApp (sinyal fungsional, bukan dekorasi).
- **Elemen signature**: pratinjau gelembung chat WhatsApp yang menampilkan teks
  pesanan `#BARU` secara *live* saat pengguna mengisi form — memperlihatkan
  langsung mekanisme inti produk (form → pesan WA terstruktur).
- **Tipografi**: Space Grotesk (display), Inter (body), IBM Plex Mono (data/label,
  dipakai untuk format pesanan & harga agar terasa seperti data terstruktur).

## Struktur

```
app/
  layout.tsx     — metadata SEO, font
  page.tsx       — merangkai semua section
  globals.css
components/
  Hero.tsx
  ServicesGrid.tsx
  HowItWorks.tsx
  OrderForm.tsx        — form fungsional (client component)
  WhatsAppPreview.tsx  — komponen preview gelembung WA (dipakai 2x)
  Promo.tsx
  Footer.tsx
lib/
  services.ts    — data tarif 3 kategori jasa (sesuai tabel PRD)
  whatsapp.ts    — pembentuk format pesan #BARU & link wa.me
```

## Catatan penting sesuai PRD

- Form **tidak** melakukan transaksi ke database — tombol "Kirim Pesanan lewat
  WhatsApp" hanya membangun link `wa.me/<nomor>?text=...` dengan format:

  ```
  #BARU
  Nama:[Nama]
  NoHP:[NoHP]
  Alamat:[Alamat]
  Jasa:[Jasa]
  ```

- Nomor WA operator diambil dari identitas perusahaan: **+62 882-4518-5778**
  (lihat `lib/whatsapp.ts` — mudah diganti jika nomor berubah).
- Halaman ini murni landing page publik (tanpa login), sesuai fase MVP.
  Dasbor Admin (`/admin`) dan Dasbor Mitra (`/mitra`) beserta Supabase belum
  termasuk di bagian ini — menyusul di tahap berikutnya.

## Deploy ke Vercel

1. Push folder ini ke repo GitHub baru.
2. Import repo di [vercel.com/new](https://vercel.com/new).
3. Vercel otomatis mendeteksi Next.js — klik Deploy.
4. Hubungkan domain `www.kerjaku.click` di tab Domains setelah deploy pertama.
