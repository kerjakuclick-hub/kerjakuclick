"use client";

import { useMemo, useState } from "react";
import { services } from "@/lib/services";
import { buildOrderMessage, buildWaLink } from "@/lib/whatsapp";
import WhatsAppPreview from "./WhatsAppPreview";

const TIME_SLOTS = ["09.00-12.00", "12.00-15.00", "15.00-17.00"];
const PREFERENSI_OPTIONS = ["Pria", "Wanita", "Bebas"];

export default function OrderForm() {
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [jasa, setJasa] = useState("");
  const [waktu, setWaktu] = useState("");
  const [preferensi, setPreferensi] = useState("Bebas");
  const [touched, setTouched] = useState(false);

  const message = useMemo(
    () => buildOrderMessage({ nama, noHp, alamat, jasa, waktu, preferensi }),
    [nama, noHp, alamat, jasa, waktu, preferensi]
  );

  const isValid = nama.trim() && noHp.trim() && alamat.trim() && jasa.trim() && waktu.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    const link = buildWaLink(message);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <section id="pesan" className="bg-bay-deep">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-[1fr_0.85fr] lg:px-8">
        <div>
          <p className="eyebrow font-mono text-xs uppercase text-bridge">Formulir Pesanan</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            Isi data Anda, sisanya lewat WhatsApp.
          </h2>
          <p className="mt-3 max-w-md text-white/70">
            Tombol di bawah tidak menyimpan data ke server kami — ia hanya membuka
            aplikasi WhatsApp Anda dengan pesan yang sudah tersusun rapi ke operator.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="nama" className="mb-1.5 block text-sm font-medium text-white/90">
                Nama Lengkap
              </label>
              <input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama Anda"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
              />
              {touched && !nama.trim() && (
                <p className="mt-1 text-xs text-bridge">Nama wajib diisi.</p>
              )}
            </div>

            <div>
              <label htmlFor="noHp" className="mb-1.5 block text-sm font-medium text-white/90">
                Nomor HP Aktif
              </label>
              <input
                id="noHp"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="0812xxxxxxxx"
                inputMode="tel"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
              />
              {touched && !noHp.trim() && (
                <p className="mt-1 text-xs text-bridge">Nomor HP wajib diisi.</p>
              )}
            </div>

            <div>
              <label htmlFor="alamat" className="mb-1.5 block text-sm font-medium text-white/90">
                Alamat Lengkap
              </label>
              <textarea
                id="alamat"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Jalan, nomor rumah, kelurahan, kecamatan"
                rows={3}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
              />
              {touched && !alamat.trim() && (
                <p className="mt-1 text-xs text-bridge">Alamat wajib diisi.</p>
              )}
            </div>

            <div>
              <label htmlFor="jasa" className="mb-1.5 block text-sm font-medium text-white/90">
                Pilihan Jasa
              </label>
              <select
                id="jasa"
                value={jasa}
                onChange={(e) => setJasa(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge [&>option]:text-ink"
              >
                <option value="" disabled className="text-ink/50">
                  Pilih jenis layanan
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.category} — {s.name}
                  </option>
                ))}
              </select>
              {touched && !jasa.trim() && (
                <p className="mt-1 text-xs text-bridge">Pilih salah satu jasa.</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/90">
                Slot Waktu
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setWaktu(slot)}
                    aria-pressed={waktu === slot}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                      waktu === slot
                        ? "border-bridge bg-bridge text-ink"
                        : "border-white/15 bg-white/5 text-white/85 hover:border-white/30"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {touched && !waktu.trim() && (
                <p className="mt-1 text-xs text-bridge">Pilih slot waktu pengerjaan.</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/90">
                Preferensi Mitra
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PREFERENSI_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPreferensi(opt)}
                    aria-pressed={preferensi === opt}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition ${
                      preferensi === opt
                        ? "border-bridge bg-bridge text-ink"
                        : "border-white/15 bg-white/5 text-white/85 hover:border-white/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-wa px-6 py-3.5 font-display text-sm font-semibold text-white shadow-card transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm0 18c-1.65 0-3.19-.47-4.5-1.28l-.32-.19-3 .79.8-2.93-.21-.3A7.94 7.94 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8Z" />
              </svg>
              Kirim Pesanan lewat WhatsApp
            </button>
          </form>
        </div>

        <div className="flex justify-center lg:justify-end lg:pt-16">
          <div className="w-full max-w-sm">
            <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-wide text-white/50 lg:text-left">
              Pratinjau langsung
            </p>
            <WhatsAppPreview message={message} />
          </div>
        </div>
      </div>
    </section>
  );
}
