// GANTI ISI components/OrderForm.tsx Anda dengan file ini.
//
// Perubahan besar dari versi sebelumnya: form pemesanan sekarang DIKUNCI
// di belakang login pelanggan (CustomerAuthPanel). Nama & no WA tidak
// lagi diketik manual tiap kali -- otomatis ikut akun yang login (field
// dikunci) supaya order selalu tertaut ke identitas yang benar. Alamat,
// jasa, tanggal, waktu, preferensi tetap diisi/pilih setiap kali order
// seperti biasa. Pemesanan tetap lewat WA (buildWaLink) seperti
// sebelumnya -- tidak ada perubahan pada jalur order ke webhook Fonnte.

"use client";

import { useEffect, useMemo, useState } from "react";
import { services } from "@/lib/services";
import { buildOrderMessage, buildWaLink } from "@/lib/whatsapp";
import WhatsAppPreview from "./WhatsAppPreview";
import ServiceSelect from "./ServiceSelect";
import CustomerAuthPanel, { type SessionCustomer } from "./CustomerAuthPanel";

const HOUSEHOLD_TIME_SLOTS = ["09.00-12.00", "12.00-15.00", "15.00-17.00"];
const LES_PRIVATE_TIME_SLOTS = ["15.00-17.00", "17.00-19.00", "19.00-21.00"];
const PREFERENSI_OPTIONS = ["Pria", "Wanita", "Bebas"];

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export default function OrderForm() {
  // undefined = masih dicek ke server, null = belum login, object = login.
  const [customer, setCustomer] = useState<SessionCustomer | null | undefined>(undefined);
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [jasa, setJasa] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [waktu, setWaktu] = useState("");
  const [preferensi, setPreferensi] = useState("Bebas");
  const [touched, setTouched] = useState(false);

  // Cek status login pelanggan sekali di awal.
  useEffect(() => {
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => setCustomer(data.customer ?? null))
      .catch(() => setCustomer(null));
  }, []);

  // Begitu login diketahui, nama & no WA ikut akun -- field ini dikunci
  // (lihat JSX di bawah) supaya order tetap tertaut ke akun yang benar.
  useEffect(() => {
    if (customer) {
      setNama(customer.name);
      setNoHp(customer.phone);
    }
  }, [customer]);

  // Prefill dari tombol "Pesan Lagi" di /riwayat (kalau ada) -- cuma
  // alamat/jasa/preferensi, karena nama & no WA sekarang ikut akun login,
  // bukan dari data order lama.
  useEffect(() => {
    const raw = localStorage.getItem("kerjaku_reorder");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as {
        alamat?: string;
        jasa?: string;
        preferensi?: string;
      };
      if (saved.alamat) setAlamat(saved.alamat);
      if (saved.jasa) setJasa(saved.jasa);
      if (saved.preferensi) setPreferensi(saved.preferensi);
    } catch {
      // data rusak/format tidak dikenal -- abaikan saja.
    } finally {
      localStorage.removeItem("kerjaku_reorder");
    }
  }, []);

  const selectedService = useMemo(() => services.find((s) => s.name === jasa), [jasa]);
  const isLesPrivate = selectedService?.category === "Les Private";
  const timeSlotOptions = isLesPrivate ? LES_PRIVATE_TIME_SLOTS : HOUSEHOLD_TIME_SLOTS;

  useEffect(() => {
    if (waktu && !timeSlotOptions.includes(waktu)) {
      setWaktu("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jasa]);

  const message = useMemo(
    () => buildOrderMessage({ nama, noHp, alamat, jasa, tanggal, waktu, preferensi }),
    [nama, noHp, alamat, jasa, tanggal, waktu, preferensi]
  );

  const isValid =
    nama.trim() && noHp.trim() && alamat.trim() && jasa.trim() && tanggal.trim() && waktu.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    const link = buildWaLink(message);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function handleLogout() {
    await fetch("/api/customer/logout", { method: "POST" });
    setCustomer(null);
    setNama("");
    setNoHp("");
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

          {customer === undefined && <p className="mt-8 text-sm text-white/50">Memuat...</p>}

          {customer === null && (
            <div className="mt-8">
              <CustomerAuthPanel onAuthenticated={setCustomer} />
            </div>
          )}

          {customer && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{customer.name}</p>
                  <p className="text-xs text-white/50">{customer.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-medium text-bridge underline"
                >
                  Bukan Anda? Keluar
                </button>
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
                <ServiceSelect id="jasa" value={jasa} onChange={setJasa} />
                {touched && !jasa.trim() && (
                  <p className="mt-1 text-xs text-bridge">Pilih salah satu jasa.</p>
                )}
                {isLesPrivate && (
                  <p className="mt-1.5 text-xs text-white/50">
                    Slot waktu untuk Les Private khusus sore/malam (15.00–21.00), menyesuaikan jam
                    pulang sekolah.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="tanggal" className="mb-1.5 block text-sm font-medium text-white/90">
                  Tanggal Pengerjaan
                </label>
                <input
                  id="tanggal"
                  type="date"
                  value={tanggal}
                  min={todayIso()}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
                />
                {touched && !tanggal.trim() && (
                  <p className="mt-1 text-xs text-bridge">Pilih tanggal pengerjaan.</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/90">
                  Slot Waktu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlotOptions.map((slot) => (
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
          )}
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
