// lib/pdf/invoice-templates.tsx
// Install dulu: npm install @react-pdf/renderer
//
// Disesuaikan dengan lib/types.ts ASLI project Anda: pakai `status`
// (bukan partner_status), tidak ada field nama mitra preferensi (preferensi
// klien adalah gender, tidak perlu muncul di invoice klien).

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Order, MitraProfile } from '@/lib/types';
import { findServiceByLabel, getServiceMaterials } from '@/lib/services';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica' },
  header: { fontSize: 18, marginBottom: 4, color: '#1F3864' },
  sub: { fontSize: 10, color: '#595959', marginBottom: 16 },
  section: { marginBottom: 14, padding: 10, borderWidth: 1, borderColor: '#DCE6F1' },
  label: { color: '#595959', fontSize: 9 },
  labelSpaced: { color: '#595959', fontSize: 9, marginTop: 8 },
  value: { fontSize: 12, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: { fontSize: 10, color: '#1E7145', marginTop: 4 },
  bullet: { fontSize: 10, marginBottom: 3 },
  materialBadge: { fontSize: 10, color: '#1E7145', marginTop: 2 },
});

// ============================================================================
// FITUR BARU (18 September 2026) -- "Detil Komponen Pesanan & Standar
// Kualitas Bahan Baku": ditugaskan Anda supaya klien tahu PERSIS apa yang
// dia dapat saat pesanan dikonfirmasi (detil pekerjaan per paket) & bahwa
// bahan baku yang dipakai mitra sudah diuji & distandarisasi kerjaku.click
// (Kispray untuk setrika, Vixal & Super Pel untuk cleaning -- lihat
// lib/services.ts SERVICE_MATERIALS/detilPekerjaan), bukan lagi cuma nama
// jasa & tarif polos.
//
// SENGAJA TIDAK menampilkan rincian Rupiah Upah Mitra/Fee Platform di sini
// -- itu transparansi khusus Dashboard Mitra (Bagian 6.1 Dokumen Bisnis
// Revisi Pasca-Audit Fraud), bukan untuk klien. Fee real per order juga
// mengikuti tier mitra yang bertugas (migrasi 024, 7-10%), jadi tabel
// komponen biaya tetap (dek presentasi internal) tidak akurat kalau
// ditampilkan apa adanya per-pesanan ke klien.
function DetilPekerjaanDanBahan({ serviceType }: { serviceType: string }) {
  const variant = findServiceByLabel(serviceType);
  const detil = variant?.detilPekerjaan ?? [];
  const materials = getServiceMaterials(serviceType) ?? [];

  if (detil.length === 0 && materials.length === 0) return null;

  return (
    <View style={styles.section}>
      {detil.length > 0 && (
        <>
          <Text style={styles.label}>Detil Pekerjaan</Text>
          {detil.map((item, i) => (
            <Text key={i} style={styles.bullet}>• {item}</Text>
          ))}
        </>
      )}
      {materials.length > 0 && (
        <>
          <Text style={styles.labelSpaced}>Bahan Baku Terstandar Kerjaku.click</Text>
          {materials.map((m, i) => (
            <Text key={i} style={styles.materialBadge}>✓ {m.label}: {m.merek}</Text>
          ))}
        </>
      )}
    </View>
  );
}

interface InvoiceKlienProps {
  invoiceNumber: string;
  order: Order;
  mitra: MitraProfile;
  estimasiWaktu: string;
}

export function InvoiceKlienPDF({ invoiceNumber, order, mitra, estimasiWaktu }: InvoiceKlienProps) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <Text style={styles.header}>Kerjaku.click</Text>
        <Text style={styles.sub}>Invoice Pesanan — {invoiceNumber}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Jasa</Text>
          <Text style={styles.value}>{order.service_type}</Text>
          <Text style={styles.label}>Alamat</Text>
          <Text style={styles.value}>{order.address}</Text>
          <Text style={styles.label}>Tarif</Text>
          <Text style={styles.value}>Rp {order.total_price.toLocaleString('id-ID')}</Text>
          <Text style={styles.label}>Estimasi Kedatangan</Text>
          <Text style={styles.value}>{estimasiWaktu}</Text>
        </View>

        <DetilPekerjaanDanBahan serviceType={order.service_type} />

        <View style={styles.section}>
          <Text style={styles.label}>Profil Mitra Bertugas</Text>
          <Text style={styles.value}>{mitra.name}</Text>
          <View style={styles.row}>
            <Text style={styles.badge}>
              Status: {mitra.status === 'ahli' ? 'Ahli' : 'Training'}
            </Text>
          </View>
        </View>

        <Text style={styles.sub}>
          Mitra kami akan menghubungi Anda untuk konfirmasi waktu kunjungan.
          Terima kasih telah menggunakan Kerjaku.click.
        </Text>
      </Page>
    </Document>
  );
}

interface InvoiceMitraProps {
  invoiceNumber: string;
  order: Order;
}

export function InvoiceMitraPDF({ invoiceNumber, order }: InvoiceMitraProps) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <Text style={styles.header}>Kerjaku.click — Tugas Mitra</Text>
        <Text style={styles.sub}>Invoice Tugas — {invoiceNumber}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Jasa</Text>
          <Text style={styles.value}>{order.service_type}</Text>
          <Text style={styles.label}>Alamat</Text>
          <Text style={styles.value}>{order.address}</Text>
          <Text style={styles.label}>Nama Klien</Text>
          <Text style={styles.value}>{order.customer_name}</Text>
          <Text style={styles.label}>No. HP Klien</Text>
          <Text style={styles.value}>{order.customer_phone}</Text>
          <Text style={styles.label}>Tarif Jasa</Text>
          <Text style={styles.value}>Rp {order.total_price.toLocaleString('id-ID')}</Text>
          {order.scheduled_date && (
            <>
              <Text style={styles.label}>Tanggal & Waktu Preferensi Klien</Text>
              <Text style={styles.value}>
                {order.scheduled_date} {order.preferred_time ?? ''}
              </Text>
            </>
          )}
        </View>

        <Text style={styles.sub}>
          Segera hubungi klien untuk: (1) perkenalkan diri sebagai petugas resmi
          Kerjaku.click, (2) sepakati waktu kunjungan, (3) minta share lokasi.
        </Text>
      </Page>
    </Document>
  );
}

// ============================================================================
// FILE BARU (fitur "Invoice Pembayaran"): terbit otomatis saat mitra klik
// "Selesaikan Tugas" di dashboard mitra (lib/pdf/generate-invoice.tsx ->
// generatePaymentInvoiceForOrder). Ini invoice/struk PEMBAYARAN yang
// sesungguhnya -- beda dari InvoiceKlienPDF di atas yang terbit saat
// PENUGASAN (dokumen konfirmasi/task-slip).
//
// DIUBAH (18 September 2026) -- fitur "Tambah Waktu Kerja": kalau pesanan
// pernah ditambah waktu (extra_time_minutes > 0), invoice sekarang
// menampilkan rincian "Tarif Dasar" + "Tambah Waktu" terpisah sebelum
// "Total Tagihan" -- supaya klien bisa melihat jelas dari mana angka total
// itu berasal (transparansi, konsisten dengan semangat anti-fraud).
//
// DIUBAH (18 September 2026) -- fitur "Otomatisasi Invoice Pembayaran":
// catatan di footer diperbarui, invoice ini sekarang dikirim OTOMATIS oleh
// sistem (chat in-app + WA Fonnte), bukan lagi diunduh & dikirim manual
// oleh mitra.
// ============================================================================

interface InvoicePembayaranProps {
  invoiceNumber: string;
  order: Order;
  mitraName: string;
}

export function InvoicePembayaranPDF({ invoiceNumber, order, mitraName }: InvoicePembayaranProps) {
  const hasExtraTime = order.extra_time_minutes > 0;
  const basePrice = order.total_price - order.extra_time_price;

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <Text style={styles.header}>Kerjaku.click</Text>
        <Text style={styles.sub}>Invoice Pembayaran — {invoiceNumber}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Pelanggan</Text>
          <Text style={styles.value}>{order.customer_name}</Text>
          <Text style={styles.label}>Jasa</Text>
          <Text style={styles.value}>{order.service_type}</Text>
          <Text style={styles.label}>Alamat</Text>
          <Text style={styles.value}>{order.address}</Text>

          {hasExtraTime ? (
            <>
              <Text style={styles.label}>Tarif Dasar</Text>
              <Text style={styles.value}>Rp {basePrice.toLocaleString('id-ID')}</Text>
              <Text style={styles.label}>Tambah Waktu (+{order.extra_time_minutes} menit)</Text>
              <Text style={styles.value}>Rp {order.extra_time_price.toLocaleString('id-ID')}</Text>
              <Text style={styles.label}>Total Tagihan</Text>
              <Text style={styles.value}>Rp {order.total_price.toLocaleString('id-ID')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Total Tagihan</Text>
              <Text style={styles.value}>Rp {order.total_price.toLocaleString('id-ID')}</Text>
            </>
          )}
        </View>

        <DetilPekerjaanDanBahan serviceType={order.service_type} />

        <View style={styles.section}>
          <Text style={styles.label}>Pekerjaan Diselesaikan Oleh</Text>
          <Text style={styles.value}>{mitraName}</Text>
          <Text style={styles.badge}>Status: Selesai</Text>
        </View>

        <Text style={styles.sub}>
          Pembayaran tunai atau transfer langsung ke mitra sesuai kesepakatan di lokasi
          (bukan ke rekening kerjaku.click). Invoice ini terkirim otomatis lewat Chat
          Pesanan & WhatsApp, dan juga selalu bisa dicek ulang di halaman Riwayat
          Pesanan Anda. Terima kasih telah menggunakan Kerjaku.click.
        </Text>
      </Page>
    </Document>
  );
}
