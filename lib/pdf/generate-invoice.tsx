// lib/pdf/generate-invoice.ts
//
// Dipanggil dari app/api/admin/orders/assign/route.ts.
//
// PERUBAHAN dari versi sebelumnya:
// 1. Retry otomatis (maks 3x) kalau nomor invoice kebetulan bentrok
//    (invoice_number sudah dipakai order lain) -- ini bisa terjadi kalau
//    ada 2 permintaan generate hampir bersamaan dari sumber berbeda
//    (mis. 2 tab/browser admin berbeda), bahkan walau tombolnya sendiri
//    sudah dilindungi "disabled" di masing-masing tab.
// 2. Nama file PDF sekarang selalu unik (pakai timestamp) supaya generate
//    ulang untuk order yang sama tidak pernah menimpa/ke-cache file lama.

import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceKlienPDF, InvoiceMitraPDF } from './invoice-templates';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { Order, MitraProfile } from '@/lib/types';

const STORAGE_BUCKET = 'invoices';
const MAX_RETRY = 3;

async function uploadPdf(fileName: string, buffer: Buffer) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, buffer, { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(`Gagal upload invoice: ${error.message}`);
  const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// Dipanggil sekali per penugasan mitra — generate KEDUA invoice sekaligus
// (klien & mitra), sesuai AC4: siap dalam hitungan detik.
export async function generateInvoicesForOrder(
  order: Order,
  mitra: MitraProfile,
  estimasiWaktu: string
) {
  const admin = getSupabaseAdmin();
  let lastErrorMessage = '';

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    const { data: invoiceNumberData, error: rpcError } = await admin.rpc('generate_invoice_number');
    if (rpcError) throw new Error(`Gagal generate nomor invoice: ${rpcError.message}`);
    const invoiceNumber: string = invoiceNumberData;
    const fileSuffix = Date.now();

    const [klienBuffer, mitraBuffer] = await Promise.all([
      renderToBuffer(
        <InvoiceKlienPDF
          invoiceNumber={invoiceNumber}
          order={order}
          mitra={mitra}
          estimasiWaktu={estimasiWaktu}
        />
      ),
      renderToBuffer(<InvoiceMitraPDF invoiceNumber={invoiceNumber} order={order} />),
    ]);

    const [klienUrl, mitraUrl] = await Promise.all([
      uploadPdf(`${order.id}/${invoiceNumber}-${fileSuffix}-klien.pdf`, klienBuffer),
      uploadPdf(`${order.id}/${invoiceNumber}-${fileSuffix}-mitra.pdf`, mitraBuffer),
    ]);

    const { error: insertError } = await admin.from('invoices').insert([
      {
        order_id: order.id,
        invoice_number: invoiceNumber,
        recipient_type: 'klien',
        file_url: klienUrl,
        channel: 'wa_manual',
      },
      {
        order_id: order.id,
        invoice_number: invoiceNumber,
        recipient_type: 'mitra',
        file_url: mitraUrl,
        channel: 'wa_manual',
      },
    ]);

    if (!insertError) {
      return { invoiceNumber, klienUrl, mitraUrl };
    }

    // Kalau gagal karena nomor invoice bentrok (dua permintaan generate
    // datang hampir bersamaan, dapat nomor sama) -- coba lagi dengan
    // nomor baru. Kalau gagal karena sebab LAIN, langsung lempar error,
    // jangan buang waktu coba lagi.
    const isDuplicateNumber =
      insertError.code === '23505' || insertError.message.includes('duplicate key');
    if (!isDuplicateNumber) {
      throw new Error(`Gagal menyimpan data invoice: ${insertError.message}`);
    }
    lastErrorMessage = insertError.message;
  }

  throw new Error(
    `Gagal generate invoice setelah ${MAX_RETRY} percobaan (nomor selalu bentrok): ${lastErrorMessage}`
  );
}
