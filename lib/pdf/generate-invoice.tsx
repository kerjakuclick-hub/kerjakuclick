// lib/pdf/generate-invoice.ts
//
// Dipanggil dari app/api/admin/orders/assign/route.ts (lihat
// patches/route-assign.ts). Disesuaikan dengan pola project Anda:
// pakai getSupabaseAdmin() (service_role, hanya server-side), bukan
// createClient() bersesi seperti draf sebelumnya.
//
// Install dulu: npm install @react-pdf/renderer
// Buat 1 Storage bucket bernama "invoices" di Supabase Dashboard.

import { renderToBuffer } from '@react-pdf/renderer';
import { InvoiceKlienPDF, InvoiceMitraPDF } from './invoice-templates';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { Order, MitraProfile } from '@/lib/types';

const STORAGE_BUCKET = 'invoices';

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

  const { data: invoiceNumberData, error: rpcError } = await admin.rpc('generate_invoice_number');
  if (rpcError) throw new Error(`Gagal generate nomor invoice: ${rpcError.message}`);
  const invoiceNumber: string = invoiceNumberData;

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
    uploadPdf(`${order.id}/${invoiceNumber}-klien.pdf`, klienBuffer),
    uploadPdf(`${order.id}/${invoiceNumber}-mitra.pdf`, mitraBuffer),
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

  if (insertError) throw new Error(`Gagal menyimpan data invoice: ${insertError.message}`);

  return { invoiceNumber, klienUrl, mitraUrl };
}
