# Checklist Keamanan & Kesiapan Production — Tahap 5

## ✅ Sudah aman (bawaan dari tahap-tahap sebelumnya)
- RLS (Row Level Security) aktif di tabel `profiles`, `orders`, `transactions`
- Fungsi `is_admin()` pakai SECURITY DEFINER — tidak ada lagi bug infinite recursion
- Mitra hanya bisa mengubah status order **miliknya sendiri**, dan hanya maju (assigned → working → completed) — tidak bisa reassign atau membatalkan order sendiri
- `SUPABASE_SERVICE_ROLE_KEY` sudah dicek ulang — tidak pernah dipakai di kode sisi client, hanya di API routes server-side
- `.env.local` ada di `.gitignore`, tidak ikut ter-commit ke GitHub

## 🔧 Baru saja diperbaiki: webhook Fonnte sekarang dikunci token rahasia

**Masalahnya:** endpoint `/api/webhook/fonnte` sebelumnya bisa dipanggil siapa saja yang tahu URL-nya (tanpa password/verifikasi apa pun), dan langsung menulis ke tabel `orders` menggunakan hak akses penuh (`service_role`). Orang iseng bisa mengirim ratusan order palsu ke database Anda.

**Perbaikannya:** endpoint sekarang wajib menyertakan `?secret=...` di URL yang cocok dengan environment variable `FONNTE_WEBHOOK_SECRET`. Tanpa itu, ditolak dengan error 401.

### Langkah aktivasi (wajib dilakukan, sistem tidak akan jalan tanpa ini):

1. Generate token acak. Cara termudah — buka terminal VS Code, jalankan:
   ```bash
   openssl rand -hex 24
   ```
   (Kalau `openssl` tidak tersedia di Windows, pakai generator password online yang menghasilkan string acak minimal 32 karakter.)

2. Buka **Vercel → Settings → Environment Variables** → tambah baru:
   - Name: `FONNTE_WEBHOOK_SECRET`
   - Value: token dari langkah 1
   - Environment: Production
   
   Lalu **Redeploy**.

3. Buka **Fonnte → Device → Edit**, ubah isi kolom **Webhook** dari:
   ```
   https://www.kerjaku.click/api/webhook/fonnte
   ```
   menjadi:
   ```
   https://www.kerjaku.click/api/webhook/fonnte?secret=TOKEN_ANDA_TADI
   ```
   (ganti `TOKEN_ANDA_TADI` dengan token yang sama persis dari langkah 1). **Save**.

4. Kirim 1 order uji coba dari landing page seperti biasa — pastikan masih masuk normal ke tabel `orders`. Kalau gagal (tidak masuk), kemungkinan token di Vercel dan di URL Fonnte tidak persis sama — cek lagi keduanya.

## 🔲 Perlu Anda cek manual di dashboard (bukan lewat kode)

### Supabase
- [ ] **Authentication → Rate Limits** — pastikan pembatasan percobaan login aktif (biasanya default sudah aktif, tinggal dikonfirmasi)
- [ ] Pertimbangkan password admin yang lebih kuat dari sekadar 6 karakter — akun ini punya akses ke semua data keuangan

### GitHub
- [ ] Pastikan repo `kerjakuclick` berstatus **Private** (Settings → repo → General → Danger Zone bisa cek/ubah visibility). Kalau Public, siapa saja bisa membaca seluruh source code dan struktur database Anda.
- [ ] Jalankan di terminal untuk memastikan `.env.local` **tidak pernah** ter-commit sebelumnya:
  ```bash
  git log --all --full-history -- .env.local
  ```
  Kalau perintah ini menampilkan hasil apa pun (bukan kosong), berarti file itu pernah masuk riwayat git — **semua kunci Supabase harus dianggap bocor** dan wajib di-generate ulang (rotate) di Supabase. Kabari saya kalau ini terjadi, supaya saya bantu langkah rotasinya.

### Vercel
- [ ] **Settings → Environment Variables** — pastikan `SUPABASE_SERVICE_ROLE_KEY` dan `FONNTE_WEBHOOK_SECRET` hanya aktif untuk environment **Production**, tidak perlu di Preview/Development kecuali Anda memang testing di situ.

### Data & backup
- [ ] Supabase paket gratis **tidak** menyediakan backup otomatis jangka panjang. Karena sekarang ada data saldo & transaksi keuangan mitra, sebaiknya sesekali export manual (Table Editor → pilih tabel → Export → CSV) atau pertimbangkan upgrade paket berbayar yang termasuk automated daily backup.

## Ringkasan prioritas
1. **Wajib segera**: aktifkan `FONNTE_WEBHOOK_SECRET` (4 langkah di atas)
2. **Wajib dicek sekali**: visibility repo GitHub + riwayat `.env.local`
3. **Baik dilakukan**: rate limit login, password admin lebih kuat, backup berkala
