// GANTI ISI components/OrderForm.tsx Anda dengan file ini.
//
// REVISI BESAR (23 September 2026) -- "Revisi dan perbaikan Formulir
// Pesanan": dropdown tunggal "Pilihan Jasa" (ServiceSelect.tsx) DIGANTI
// TOTAL dengan wizard progresif sesuai urutan yang diminta:
//
//   Tombol kategori [Setrika] [Bersihkan Rumah] [Les Private]
//     -> Tombol tier [Fast] [PRO]
//     -> (KHUSUS Les Private) Tingkat Pendidikan Anak [TK/SD/SMP/SMA]
//     -> (KHUSUS Les Private) Mata Pelajaran (dibatasi sesuai tingkat --
//        DIKONFIRMASI lewat pertanyaan klarifikasi 23 September 2026)
//     -> Kartu detail (Harga - Durasi - Cakupan Kerja)
//     -> Tanggal dikerjakan -> Slot Waktu -> Preferensi Mitra
//     -> tombol submit "Pesan Jasa"
//
// Alamat sekarang OTOMATIS TERISI dari alamat tersimpan di akun (customer.
// address, migrasi 032) begitu login diketahui -- TETAP BISA diubah/diisi
// baru di form ini per pesanan (textarea tidak dikunci), sesuai permintaan
// "Otomatis terisi sesuai alamat daftar / ada alamat baru (bisa di isi
// baru)". Prefill alamat ini TIDAK menimpa alamat yang sudah diisi manual
// atau yang datang dari mekanisme "Pesan Lagi"/"Pesan Sekarang" (localStorage
// "kerjaku_reorder", lihat efek di bawah) -- hanya mengisi kalau textarea
// masih kosong saat login diketahui.
//
// ServiceSelect.tsx SENGAJA TIDAK dihapus (cuma tidak dipakai lagi di sini)
// -- hapus file perlu izin terpisah lewat device bridge, dan tidak
// mengganggu apa pun kalau dibiarkan ada.
//
// Nama & no WA tetap terkunci ikut akun yang login (customer.name/phone) --
// tidak berubah dari versi sebelumnya, sudah sesuai permintaan "NAMA ...
// otomatis terisi".

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  orderableServices as services,
  findServiceByLabel,
  formatRupiah,
  getWorkScopeText,
  LES_PRIVATE_SUBJECTS,
  EDUCATION_LEVELS,
  LES_PRIVATE_LEVEL_SUBJECT_SLUGS,
  getLesPrivateSubjectsForLevel,
  type EducationLevel,
} from "@/lib/services";
import { buildOrderMessage, buildWaLink } from "@/lib/whatsapp";
import WhatsAppPreview from "./WhatsAppPreview";
import CustomerAuthPanel, { type SessionCustomer } from "./CustomerAuthPanel";

// Slot waktu diperbarui 20 September 2026 sesuai dokumen struktur website
// versi baru ("UPDATE WEBSITE KERJAKU.CLICK").
const HOUSEHOLD_TIME_SLOTS = ["09.00-11.00", "13.00-15.00", "15.00-18.00"];
const LES_PRIVATE_TIME_SLOTS = ["15.00-17.00", "17.00-18.00", "19.00-21.00"];
const PREFERENSI_OPTIONS = ["Pria", "Wanita", "Bebas"];

// Kategori jasa -- `key` harus PERSIS sama dengan `category` di
// lib/services.ts, `label` adalah teks tombol sesuai permintaan (mis.
// "Setrika" bukan "Setrika Pakaian").
const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: "Setrika Pakaian", label: "Setrika" },
  { key: "Bersihkan Rumah", label: "Bersihkan Rumah" },
  { key: "Les Private", label: "Les Private" },
];

const TIER_LABELS: Record<"Fast" | "PRO", string> = {
  Fast: "FAST",
  PRO: "PRO",
};

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function isEducationLevel(value: string): value is EducationLevel {
  return (EDUCATION_LEVELS as readonly string[]).includes(value);
}

export default function OrderForm() {
  // undefined = masih dicek ke server, null = belum login, object = login.
  const [customer, setCustomer] = useState<SessionCustomer | null | undefined>(undefined);
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");

  // --- State wizard "Pilihan Jasa Tenaga Kerja" (BARU, gantikan dropdown) ---
  const [category, setCategory] = useState("");
  const [tier, setTier] = useState<"" | "Fast" | "PRO">("");
  const [tingkatPendidikan, setTingkatPendidikan] = useState<EducationLevel | "">("");
  const [subjectSlug, setSubjectSlug] = useState("");

  const [tanggal, setTanggal] = useState("");
  const [waktu, setWaktu] = useState("");
  const [preferensi, setPreferensi] = useState("Bebas");
  const [touched, setTouched] = useState(false);

  const isLesPrivate = category === "Les Private";

  // Cek status login pelanggan sekali di awal.
  useEffect(() => {
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => setCustomer(data.customer ?? null))
      .catch(() => setCustomer(null));
  }, []);

  // Begitu login diketahui, nama & no WA ikut akun -- field ini dikunci
  // (lihat JSX di bawah) supaya order tetap tertaut ke akun yang benar.
  // Alamat juga diisi otomatis dari alamat tersimpan (customer.address,
  // migrasi 032) -- TAPI cuma kalau textarea-nya masih kosong, supaya
  // tidak menimpa alamat baru yang sudah sempat diisi/diprefill duluan
  // (lihat efek "kerjaku_reorder" di bawah, urutan efek React menjamin
  // efek reorder di bawah ini jalan lebih dulu daripada round-trip fetch
  // /api/customer/me karena reorder murni baca localStorage synchronous,
  // tapi pengecekan alamat.trim() di sini tetap dipasang berjaga-jaga).
  useEffect(() => {
    if (customer) {
      setNama(customer.name);
      setNoHp(customer.phone);
      setAlamat((prev) => (prev.trim() ? prev : customer.address ?? ""));
    }
  }, [customer]);

  // Prefill dari tombol "Pesan Lagi" di /riwayat, atau "Pesan Sekarang" di
  // modal detail jasa (ServicesGridInteractive.tsx) -- keduanya menulis ke
  // localStorage "kerjaku_reorder" lalu navigasi ke halaman ini. `jasa`
  // (nama produk lengkap, mis. "Cleaning PRO" atau "Matematika Fast")
  // diuraikan balik jadi kategori/tier/mata-pelajaran wizard di bawah lewat
  // backfillFromJasa -- supaya wizard langsung terbuka sampai ke tahap
  // kartu detail, tidak perlu klik ulang dari awal.
  useEffect(() => {
    const raw = localStorage.getItem("kerjaku_reorder");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as {
        alamat?: string;
        jasa?: string;
        preferensi?: string;
        tingkatPendidikan?: string;
      };
      if (saved.alamat) setAlamat(saved.alamat);
      if (saved.preferensi) setPreferensi(saved.preferensi);
      if (saved.jasa) backfillFromJasa(saved.jasa, saved.tingkatPendidikan);
    } catch {
      // data rusak/format tidak dikenal -- abaikan saja.
    } finally {
      localStorage.removeItem("kerjaku_reorder");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Uraikan nama produk lengkap (mis. "Setrika Fast", "Fisika PRO") jadi
  // state wizard kategori/tier/(khusus Les Private) mata pelajaran +
  // tingkat pendidikan. Dipakai satu-satunya oleh efek prefill di atas.
  function backfillFromJasa(jasaName: string, savedTingkat?: string) {
    const variant = findServiceByLabel(jasaName);
    if (!variant) return;
    setCategory(variant.category);
    setTier(variant.tier);

    if (variant.category !== "Les Private") return;

    // ID varian Les Private selalu berpola "les-<slug>-fast"/"les-<slug>-pro"
    // (lihat lib/services.ts) -- dipakai di sini untuk mengambil kembali
    // slug mata pelajarannya.
    const match = variant.id.match(/^les-(.+)-(fast|pro)$/);
    const slug = match?.[1];
    if (!slug) return;
    setSubjectSlug(slug);

    // Tingkat pendidikan TIDAK selalu tersimpan di riwayat pesanan lama
    // (fitur ini baru ada 23 September 2026) -- kalau ada & masih cocok
    // dengan mata pelajarannya, pakai itu; kalau tidak, pilih tingkat
    // pertama yang memang menampilkan mata pelajaran ini supaya wizard
    // tetap dalam keadaan valid (bukan tebakan acak).
    if (
      savedTingkat &&
      isEducationLevel(savedTingkat) &&
      LES_PRIVATE_LEVEL_SUBJECT_SLUGS[savedTingkat].includes(slug)
    ) {
      setTingkatPendidikan(savedTingkat);
      return;
    }
    const fallbackLevel = EDUCATION_LEVELS.find((level) =>
      LES_PRIVATE_LEVEL_SUBJECT_SLUGS[level].includes(slug)
    );
    if (fallbackLevel) setTingkatPendidikan(fallbackLevel);
  }

  // Tier yang tersedia untuk kategori terpilih -- diambil dinamis dari
  // katalog (bukan di-hardcode ["Fast","PRO"]) supaya otomatis menyesuaikan
  // kalau suatu saat ada produk dengan tier terbatas.
  const availableTiers = useMemo(() => {
    if (!category) return [];
    const tiers = new Set(services.filter((s) => s.category === category).map((s) => s.tier));
    return (["Fast", "PRO"] as const).filter((t) => tiers.has(t));
  }, [category]);

  const subjectOptions = useMemo(() => {
    if (!isLesPrivate || !tingkatPendidikan) return [];
    return getLesPrivateSubjectsForLevel(tingkatPendidikan);
  }, [isLesPrivate, tingkatPendidikan]);

  const selectedService = useMemo(() => {
    if (!category || !tier) return undefined;
    if (isLesPrivate) {
      if (!subjectSlug) return undefined;
      const subject = LES_PRIVATE_SUBJECTS.find((s) => s.slug === subjectSlug);
      if (!subject) return undefined;
      return services.find(
        (s) => s.category === "Les Private" && s.tier === tier && s.name === `${subject.label} ${tier}`
      );
    }
    return services.find((s) => s.category === category && s.tier === tier);
  }, [category, tier, isLesPrivate, subjectSlug]);

  const jasa = selectedService?.name ?? "";
  const timeSlotOptions = isLesPrivate ? LES_PRIVATE_TIME_SLOTS : HOUSEHOLD_TIME_SLOTS;

  // Reset slot waktu kalau kategori berubah (opsi slot beda antara Les
  // Private & rumah tangga) dan slot yang sudah dipilih jadi tidak valid.
  useEffect(() => {
    if (waktu && !timeSlotOptions.includes(waktu)) {
      setWaktu("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function handleSelectCategory(key: string) {
    setCategory(key);
    setTier("");
    setTingkatPendidikan("");
    setSubjectSlug("");
  }

  function handleSelectTier(t: "Fast" | "PRO") {
    setTier(t);
    if (isLesPrivate) {
      setTingkatPendidikan("");
      setSubjectSlug("");
    }
  }

  function handleSelectTingkat(level: EducationLevel) {
    setTingkatPendidikan(level);
    setSubjectSlug("");
  }

  const message = useMemo(
    () =>
      buildOrderMessage({
        nama,
        noHp,
        alamat,
        jasa,
        tanggal,
        waktu,
        preferensi,
        tingkatPendidikan: isLesPrivate && tingkatPendidikan ? tingkatPendidikan : undefined,
      }),
    [nama, noHp, alamat, jasa, tanggal, waktu, preferensi, isLesPrivate, tingkatPendidikan]
  );

  const isValid =
    nama.trim() &&
    noHp.trim() &&
    alamat.trim() &&
    jasa.trim() &&
    tanggal.trim() &&
    waktu.trim() &&
    (!isLesPrivate || tingkatPendidikan);

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
                <p className="mt-1 text-xs text-white/50">
                  Otomatis terisi dari alamat akun Anda — boleh diubah kalau pesanan ini untuk
                  alamat lain.
                </p>
                {touched && !alamat.trim() && (
                  <p className="mt-1 text-xs text-bridge">Alamat wajib diisi.</p>
                )}
              </div>

              {/* --- Wizard "Pilihan Jasa Tenaga Kerja" --- */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/90">
                  Pilihan Jasa Tenaga Kerja
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectCategory(opt.key)}
                      aria-pressed={category === opt.key}
                      className={`whitespace-nowrap rounded-lg border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                        category === opt.key
                          ? "border-bridge bg-bridge text-ink"
                          : "border-white/15 bg-white/5 text-white/85 hover:border-white/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {touched && !jasa.trim() && (
                  <p className="mt-1 text-xs text-bridge">Pilih salah satu jasa.</p>
                )}
              </div>

              {category && availableTiers.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/90">
                    Paket
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTiers.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectTier(t)}
                        aria-pressed={tier === t}
                        className={`whitespace-nowrap rounded-lg border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                          tier === t
                            ? "border-bridge bg-bridge text-ink"
                            : "border-white/15 bg-white/5 text-white/85 hover:border-white/30"
                        }`}
                      >
                        {TIER_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLesPrivate && tier && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/90">
                    Tingkat Pendidikan Anak
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EDUCATION_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleSelectTingkat(level)}
                        aria-pressed={tingkatPendidikan === level}
                        className={`whitespace-nowrap rounded-lg border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                          tingkatPendidikan === level
                            ? "border-bridge bg-bridge text-ink"
                            : "border-white/15 bg-white/5 text-white/85 hover:border-white/30"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  {touched && !tingkatPendidikan && (
                    <p className="mt-1 text-xs text-bridge">Pilih tingkat pendidikan anak.</p>
                  )}
                </div>
              )}

              {isLesPrivate && tingkatPendidikan && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/90">
                    Mata Pelajaran
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subjectOptions.map((subject) => (
                      <button
                        key={subject.slug}
                        type="button"
                        onClick={() => setSubjectSlug(subject.slug)}
                        aria-pressed={subjectSlug === subject.slug}
                        className={`whitespace-nowrap rounded-lg border px-3.5 py-2.5 text-xs font-medium transition ${
                          subjectSlug === subject.slug
                            ? "border-bridge bg-bridge text-ink"
                            : "border-white/15 bg-white/5 text-white/85 hover:border-white/30"
                        }`}
                      >
                        {subject.label}
                      </button>
                    ))}
                  </div>
                  {touched && !subjectSlug && (
                    <p className="mt-1 text-xs text-bridge">Pilih mata pelajaran.</p>
                  )}
                </div>
              )}

              {/* --- Kartu detail: Harga - Durasi - Cakupan Kerja --- */}
              {selectedService && (
                <div className="rounded-lg border border-bridge/40 bg-bridge/10 px-4 py-3.5">
                  <p className="font-display text-sm font-semibold text-white">
                    {selectedService.name}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs text-white/80">
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Harga</dt>
                      <dd className="text-right font-medium text-white">
                        {formatRupiah(selectedService.price)} / {selectedService.unit}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Durasi</dt>
                      <dd className="text-right font-medium text-white">{selectedService.duration}</dd>
                    </div>
                    {isLesPrivate && tingkatPendidikan && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-white/50">Tingkat</dt>
                        <dd className="text-right font-medium text-white">{tingkatPendidikan}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="mt-2 whitespace-pre-line text-xs text-white/70">
                    {getWorkScopeText(selectedService.name)}
                  </p>
                </div>
              )}

              {selectedService && (
                <>
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
                    <div className="flex flex-wrap gap-2">
                      {timeSlotOptions.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setWaktu(slot)}
                          aria-pressed={waktu === slot}
                          className={`whitespace-nowrap rounded-lg border px-3.5 py-2.5 text-xs font-medium transition ${
                            waktu === slot
                              ? "border-bridge bg-bridge text-ink"
                              : "border-white/15 bg-white/5 text-white/85 hover:border-white/30"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    {isLesPrivate && (
                      <p className="mt-1.5 text-xs text-white/50">
                        Slot waktu untuk Les Private khusus sore/malam (15.00–21.00), menyesuaikan
                        jam pulang sekolah.
                      </p>
                    )}
                    {touched && !waktu.trim() && (
                      <p className="mt-1 text-xs text-bridge">Pilih slot waktu pengerjaan.</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white/90">
                      Preferensi Mitra
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PREFERENSI_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPreferensi(opt)}
                          aria-pressed={preferensi === opt}
                          className={`whitespace-nowrap rounded-lg border px-5 py-2.5 text-xs font-medium transition ${
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
                    Pesan Jasa
                  </button>
                </>
              )}
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
