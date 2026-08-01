# Kerjaku.click — Addendum Fase 1.1 (Paket Final, Siap Paste)

Paket ini disusun **persis meniru struktur folder project Anda** — extract
lalu timpa/gabung langsung ke root project, tidak perlu lagi mencocokkan
manual path per file.

## Cara pakai

1. Extract zip ini.
2. Salin (copy-paste) seluruh isi folder `app/`, `components/`, `lib/`,
   `supabase/` ke root project Anda — pilih **overwrite/merge** saat file
   API/komponen yang namanya sama sudah ada (file baru di paket ini memang
   dimaksudkan untuk MENIMPA versi lama).
3. File yang **baru dibuat** (belum ada sebelumnya di project Anda):
   - `app/api/admin/mitra/update-attributes/route.ts`
   - `lib/pdf/invoice-templates.tsx`
   - `lib/pdf/generate-invoice.tsx`
   - Semua isi `supabase/migrations/007`, `008`, `009` dan `supabase/scripts/`
4. File yang **menimpa** yang sudah ada:
   - `lib/types.ts` (sudah termasuk semua field lama + field baru)
   - `app/admin/page.tsx`, `app/admin/mitra/page.tsx`, `app/admin/transaksi/page.tsx`
   - `app/mitra/page.tsx`
   - `app/api/admin/orders/assign/route.ts`, `app/api/admin/mitra/topup/route.ts`
   - `components/admin/OrdersFeed.tsx`, `components/admin/MitraTable.tsx`
   - `components/mitra/TaskList.tsx`

Tidak ada file lain di project Anda yang perlu diubah — `middleware.ts`,
`lib/supabase/client.ts`/`server.ts`, `lib/supabaseAdmin.ts`,
`lib/whatsapp.ts`, `lib/services.ts`, dan seluruh landing page
(`app/page.tsx`, `components/Hero.tsx`, `Footer.tsx`, `HowItWorks.tsx`,
`Promo.tsx`, `ServicesGrid.tsx`, `WhatsAppPreview.tsx`, `OrderForm.tsx`)
sudah benar apa adanya dan tidak tersentuh addendum ini.

## Dependency baru

```bash
npm install @react-pdf/renderer
```

Buat 1 Storage bucket bernama **`invoices`** di Supabase Dashboard → Storage.

---

## ⚠️ WAJIB DIBACA sebelum menjalankan migrasi Supabase

Project Anda sudah punya trigger bagi hasil **80/20 model LAMA**
(`006_bagi_hasil_otomatis.sql`), **sudah pernah diproses untuk order real**
(dikonfirmasi). Migrasi `008` mengganti ke model **deposit addendum**
(potong 20%, tunai langsung ke mitra). Sudah dikonfirmasi juga bahwa
wallet_balance yang terakumulasi dari model lama **hanya angka pencatatan**
(tidak pernah dicairkan ke mitra manapun) — jadi migrasi `009` aman
mereset ke 0, dengan snapshot arsip untuk jaga-jaga.

## Urutan eksekusi

1. **Backup** database production (Supabase Dashboard → Database → Backups).
2. SQL Editor → jalankan `supabase/scripts/pre_migration_audit_saldo.sql`
   (read-only). Cek terutama bagian 4 (mitra aktif yang gender-nya kosong)
   dan bagian 3 (mitra yang bakal gagal ambang baru).
3. SQL Editor → jalankan `supabase/migrations/007_addendum_fase_1_1_schema.sql`.
4. SQL Editor → jalankan `supabase/migrations/008_switch_to_deposit_model.sql`
   — **titik ini yang mematikan trigger lama**.
5. **Pilih rencana rollout** sebelum lanjut ke langkah 6:
   - **Opsi A**: broadcast WA ke semua mitra aktif dulu, kasih jeda 1-2 hari
     untuk top up, baru lanjut ke langkah 6.
   - **Opsi B**: langsung lanjut langkah 6, lalu SEGERA seed top up kecil
     untuk semua mitra aktif lewat Kelola Mitra (poin 9 di bawah) sebelum ada
     pesanan baru masuk — supaya tidak ada jeda operasional.
6. SQL Editor → jalankan `supabase/migrations/009_reset_legacy_wallet_balance.sql`.
7. Deploy kode (lihat bagian "VS Code & Vercel" di bawah).
8. Buka **Kelola Mitra** (`/admin/mitra`) → isi kolom **Gender** untuk semua
   mitra aktif (dropdown sudah tersedia langsung di tabel).
9. (Kalau pilih Opsi B) → top up saldo awal tiap mitra aktif lewat kolom
   "Top Up" di halaman yang sama.
10. Test end-to-end: buat 1 order percobaan → tugaskan mitra → cek invoice
    PDF ter-generate → selesaikan order → cek `wallet_balance` berkurang 20%
    dan muncul baris baru di `earnings` + `wallet_transactions`.

## VS Code & Vercel

```bash
# di root project, setelah file-file paket ini sudah ditempel
git checkout -b feature/addendum-fase-1.1
npm install @react-pdf/renderer
npm run dev   # cek localhost:3000/admin dan /admin/mitra tidak error

git add .
git commit -m "feat: addendum fase 1.1 - dompet deposit, invoice, dashboard"
git push -u origin feature/addendum-fase-1.1
```

Buka GitHub → buat Pull Request → Vercel otomatis bikin **Preview
Deployment**. Uji di URL preview itu dulu (bukan production):
- `/admin` — dropdown penugasan mitra muncul sesuai saldo/gender/keahlian.
- `/admin/mitra` — isi gender, coba top up.
- Tugaskan 1 mitra ke order percobaan → cek invoice ter-generate.
- Selesaikan order percobaan → cek saldo & laporan di `/admin/transaksi`
  (bagian "Pendapatan & Fee Platform").

Kalau semua lolos → merge PR ke `main`. Vercel deploy otomatis ke production.

**Rollback**: `supabase/scripts/rollback_007_008.sql` — ada 2 skenario di
dalamnya (kembali ke trigger lama sementara, atau rollback total). Untuk
rollback kode, pakai **Vercel → Deployments → Promote** ke deployment
sebelumnya.

---

## Riwayat Koreksi (dari draf-draf sebelumnya)

- ❌ `partner_status` (kolom baru) → ✅ pakai `profiles.status` yang sudah ada
- ❌ `preferred_mitra_name` (asumsi klien pilih nama mitra) → ✅ ternyata
  `orders.mitra_gender_preference` (preferensi gender), kolom `profiles.gender`
  ditambahkan supaya bisa dicocokkan
- ❌ Trigger baru ditambah begitu saja di atas trigger lama → ✅ trigger lama
  (`on_order_completed`) di-drop dulu di migrasi 008
- ❌ Kode pakai Server Actions & client Supabase baru → ✅ disesuaikan ke pola
  API Route (`route.ts` + `getSupabaseAdmin()`) yang sudah dipakai project Anda
- ❌ Tabel tarif di audit script pakai asumsi harga → ✅ diganti query yang
  mengambil tarif nyata dari data `orders`
- ❌ Ambang Rp50.000 dikira cuma di 1 tempat → ✅ ternyata di 4 tempat
  (`admin/page.tsx`, `admin/mitra/page.tsx`, `MitraTable.tsx`, `mitra/page.tsx`)
  — semua sudah diganti ke ambang dinamis 20%
- ❌ Dropdown mitra pakai 1 daftar global → ✅ per-order lewat RPC
  `eligible_mitra_for_order`
- ❌ Halaman Transaksi akan beku setelah trigger lama mati → ✅ dipecah jadi
  arsip lama + laporan baru
