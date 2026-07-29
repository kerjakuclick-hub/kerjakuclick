import WhatsAppPreview from "./WhatsAppPreview";
import { buildOrderMessage } from "@/lib/whatsapp";

const sampleMessage = buildOrderMessage({
  nama: "Bu Anita",
  noHp: "0812xxxxxxx",
  alamat: "Jl. Cumi-Cumi No. 12, Palu",
  jasa: "Cleaning Fast",
  tanggal: "2026-08-02",
  waktu: "09.00-12.00",
  preferensi: "Bebas",
});

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      {/* Jembatan Kuning silhouette — landmark motif grounding the brand in Kota Palu */}
      <svg
        className="bridge-motif pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-[0.16] sm:h-56"
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 200 L0 160 L120 160 L160 40 L200 160 L280 160 L320 20 L360 160 L440 160 L480 40 L520 160 L600 160 L640 20 L680 160 L760 160 L800 40 L840 160 L920 160 L960 20 L1000 160 L1080 160 L1120 40 L1160 160 L1200 160 L1200 200 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
        />
        <line x1="0" y1="160" x2="1200" y2="160" stroke="currentColor" strokeWidth="4" />
      </svg>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
        <div>
          <p className="eyebrow font-mono text-xs uppercase text-bay-deep/70">
            Area Layanan Kota Palu
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl lg:text-6xl">
            Jasa Tenaga Kerja
            <br />
            ke Rumah Anda.
            <br />
            <span className="text-bay-deep">Sekali Klik.</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-ink/70 sm:text-lg">
            Setrika pakaian, bersihkan rumah, cucikan kendaraan — cukup isi form,
            tekan satu tombol, pesanan langsung terkirim ke operator lewat WhatsApp.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#pesan"
              className="rounded-full bg-bridge px-7 py-3.5 font-display text-sm font-semibold text-ink shadow-card transition hover:bg-bridge-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bay-deep"
            >
              Pesan Sekarang
            </a>
            <a
              href="#layanan"
              className="font-body text-sm font-medium text-bay-deep underline underline-offset-4 hover:text-ink"
            >
              Lihat daftar & tarif layanan
            </a>
          </div>

          <ul className="mt-10 max-w-lg space-y-5 border-t border-line pt-7">
            <li className="flex gap-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bridge/25 text-bay-deep">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 3 4 6v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V6l-8-3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-ink">Mitra Profesional</p>
                <p className="mt-0.5 text-sm text-ink/65">
                  Mitra telah melalui verifikasi ketat &amp; pelatihan keahlian standar bintang 5.
                </p>
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bridge/25 text-bay-deep">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
                  <circle cx="17.5" cy="8.5" r="2.4" />
                  <path d="M14.8 19c.4-2.4 1.9-4 3.9-4.4" />
                </svg>
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-ink">Pilih Preferensi Mitra</p>
                <p className="mt-0.5 text-sm text-ink/65">
                  Bisa pilih preferensi mitra laki-laki/wanita untuk ke rumah Anda.
                </p>
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bridge/25 text-bay-deep">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="2.5" y="6" width="19" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.6" />
                  <path d="M5.5 9v0M18.5 15v0" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-ink">Sistem Pembayaran</p>
                <p className="mt-0.5 text-sm text-ink/65">
                  Bayar tunai ke mitra setelah pekerjaan selesai.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-sm">
            <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-wide text-ink/50 lg:text-left">
              Contoh pesan yang terkirim otomatis
            </p>
            <WhatsAppPreview message={sampleMessage} />
          </div>
        </div>
      </div>
    </section>
  );
}
