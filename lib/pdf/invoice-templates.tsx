// lib/pdf/invoice-templates.tsx
// Install dulu: npm install @react-pdf/renderer
//
// Disesuaikan dengan lib/types.ts ASLI project Anda: pakai `status`
// (bukan partner_status), tidak ada field nama mitra preferensi (preferensi
// klien adalah gender, tidak perlu muncul di invoice klien).

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Order, MitraProfile } from '@/lib/types';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica' },
  header: { fontSize: 18, marginBottom: 4, color: '#1F3864' },
  sub: { fontSize: 10, color: '#595959', marginBottom: 16 },
  section: { marginBottom: 14, padding: 10, borderWidth: 1, borderColor: '#DCE6F1' },
  label: { color: '#595959', fontSize: 9 },
  value: { fontSize: 12, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  badge: { fontSize: 10, color: '#1E7145', marginTop: 4 },
});

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
