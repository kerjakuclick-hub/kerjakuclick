# Peta Jalan Eksekusi — Kerjakuclick MVP Fase 1

Dokumen ini membagi pembangunan sistem menjadi tahap-tahap kerja. Ikuti urut,
jangan lompat — setiap tahap adalah pondasi untuk tahap berikutnya.

## Ringkasan Tahapan

| Tahap | Isi | Status |
|---|---|---|
| **Tahap 1** | Landing Page + Supabase + Setup Fonnte (order WA otomatis masuk DB) | 👉 Dikerjakan sekarang |
| Tahap 2 | Dasbor Admin (`/admin`) — live feed, tugaskan mitra, kelola saldo | Menyusul |
| Tahap 3 | Dasbor Mitra (`/mitra`) — daftar tugas, progres kerja, e-wallet | Menyusul |
| Tahap 4 | Logika bagi hasil otomatis (potong saldo 20%, proteksi saldo min.) | Menyusul |
| Tahap 5 | Go-live: testing acceptance criteria, sambung domain, monitoring | Menyusul |

---

## TAHAP 1 — Landing Page + Supabase + Setup Fonnte

Tujuan akhir tahap ini: **customer isi form di landing page → klik kirim di
WhatsApp mereka → pesan otomatis tersimpan ke tabel `orders` di Supabase dalam
hitungan detik**, tanpa Anda mengetik ulang manual.

### 1.1 Supabase — buat project & schema

1. [supabase.com](https://supabase.com) → **New Project**, region **Southeast Asia (Singapore)**.
2. **SQL Editor** → jalankan schema `profiles` + `orders` + RLS (sudah saya berikan sebelumnya — simpan sebagai `supabase/schema.sql` di project Anda agar tidak hilang).
3. **Authentication → Users → Add user** → buat akun admin pertama (Anda).
4. Insert baris ke `profiles` dengan role `'admin'` memakai UUID user tadi.
5. **Settings → API** → catat: `Project URL`, `anon public key`, `service_role key`.

### 1.2 VS Code — jalankan project lokal

1. Extract project, buka di VS Code, `npm install`.
2. Buat `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   ```
3. `npm run dev`, cek `localhost:3000` — landing page & form harus tampil normal.

### 1.3 GitHub — push kode

```bash
git init
git add .
git commit -m "Tahap 1: landing page + webhook fonnte"
git branch -M main
git remote add origin https://github.com/USERNAME/kerjakuclick.git
git push -u origin main
```

### 1.4 Vercel — deploy

1. Import repo `kerjakuclick` di Vercel.
2. Isi 3 environment variable yang sama seperti `.env.local`.
3. Deploy, lalu sambungkan domain `www.kerjaku.click` di **Settings → Domains**.
4. Setelah live, catat URL webhook Anda: `https://www.kerjaku.click/api/webhook/fonnte`

### 1.5 Setup Fonnte — jembatan WA ke Supabase

1. Daftar di [fonnte.com](https://fonnte.com), tambah **Device** baru.
2. Scan QR code memakai nomor WA operator (**+62 882-4518-5778**) — device berstatus "Connected".
3. Buka menu **Device → Edit**:
   - Aktifkan **Autoread**.
   - Isi kolom **Webhook URL** dengan `https://www.kerjaku.click/api/webhook/fonnte`.
   - Simpan.
4. Ambil **API Token** device dari dashboard Fonnte (untuk keperluan Tahap 2 saat admin perlu membalas WA — belum dipakai di Tahap 1).
5. **Uji coba nyata**: buka landing page → isi form → klik kirim → kirim pesan di WhatsApp Anda ke nomor operator (nomor sama dengan device Fonnte). Dalam beberapa detik, cek tabel `orders` di Supabase — baris baru harus muncul dengan `status = unassigned`.

### 1.6 Kode yang sudah disiapkan untuk tahap ini

Saya sudah menambahkan ke project:
- `app/api/webhook/fonnte/route.ts` — endpoint yang menerima payload Fonnte, memvalidasi format `#BARU`, memotong per baris berdasarkan `:`, mencocokkan harga dari `lib/services.ts`, lalu insert ke Supabase. Kalau pesan bukan format order, endpoint mengabaikannya tanpa error (supaya Fonnte tidak retry terus untuk chat biasa).
- `lib/supabaseAdmin.ts` — koneksi Supabase pakai `service_role key`, khusus dipakai di server (route ini), tidak pernah diekspos ke browser.
- `lib/services.ts` — ditambah `findServiceByLabel()` untuk mencocokkan teks "Jasa" dari WhatsApp ke tarif yang benar.

### 1.7 Checklist selesai Tahap 1

- [ ] Tabel `profiles` & `orders` ada di Supabase, RLS aktif
- [ ] Landing page live di `www.kerjaku.click`
- [ ] Device Fonnte terhubung ke nomor operator, webhook URL terisi
- [ ] Kirim 1 order uji coba end-to-end → muncul di tabel `orders` dalam < 3 detik (ini persis AC 1 di PRD)

Begitu semua tercentang, kabari saya — kita lanjut **Tahap 2: Dasbor Admin**.
