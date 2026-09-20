// GANTI ISI components/admin/MitraTable.tsx Anda dengan file ini.
//
// FIX: tombol "Isi" (Top Up) sebenarnya SUDAH ADA dari awal, cuma tabelnya
// terlalu lebar dan scrollbar horizontal-nya ada di PALING BAWAH tabel yang
// sudah sangat panjang (karena 10 checkbox keahlian disusun 1 kolom ke
// bawah) -- jadi scrollbar itu di luar jangkauan tanpa scroll jauh ke bawah
// dulu. Sekarang: (1) checkbox keahlian disusun 2 kolom supaya baris lebih
// pendek, scrollbar jadi gampang dijangkau; (2) ditambah teks penunjuk di
// atas tabel.
//
// BARU (fitur "Toggle Ketersediaan Mitra", migrasi 023): kolom baru
// "Ketersediaan" menampilkan badge status yang mitra atur sendiri dari
// dasbor mereka (Tersedia / Tidak Tersedia + alasan) -- ini murni tampilan
// (read-only untuk admin), supaya saat operasional di lapangan admin bisa
// langsung lihat mitra mana yang sedang istirahat/sakit/kendala lain
// sebelum menugaskan pesanan baru.
//
// BARU (18 September 2026) -- "Modul Trust & Safety" (Bagian 8.4 Dokumen
// Bisnis Revisi Pasca-Audit Fraud), migrasi 025: kolom baru "Trust &
// Safety" menampilkan violation_count mitra (syarat naik tier Terpercaya/
// Unggulan sejak migrasi 024) + tombol untuk buka panel riwayat pelanggaran
// & tambah catatan baru lewat app/api/admin/mitra/violations/route.ts.
// violation_count TIDAK diedit langsung di sini -- selalu lewat catatan
// beralasan supaya ada jejak audit (persis semangat "Modul Trust & Safety").
//
// Perubahan BESAR (20 September 2026) -- migrasi "3 Pilar Layanan" &
// "Upgrade Fee Tier Produk" (migrasi 030):
//   - Opsi keahlian "Cuci Kendaraan" DIHAPUS (layanan ini dihapus total
//     dari sistem, lihat lib/services.ts).
//   - Badge peringatan saldo mitra ("merah" kalau di bawah ambang) DULU
//     dihitung dinamis dari 20% harga termurah (MIN_TARIF) -- sekarang
//     pakai ambang FLAT MITRA_WALLET_MIN_BALANCE (15% x harga Setrika
//     Fast = Rp8.250) yang sama persis dengan validasi assign mitra
//     (app/api/admin/orders/assign/route.ts) & RPC mitra_wallet_threshold()
//     di database, supaya tidak ada 2 angka ambang saldo yang beda-beda.

"use client";

import { useRef, useState } from "react";
import { formatRupiah, MITRA_WALLET_MIN_BALANCE } from "@/lib/services";
import type { MitraProfile, MitraViolation } from "@/lib/types";

const SKILL_GROUPS: { label: string; options: string[] }[] = [
  { label: "Rumah Tangga", options: ["Setrika", "Bersihkan Rumah"] },
  {
    label: "Les Private",
    options: ["Mengaji", "Bahasa Inggris", "Matematika", "Fisika", "Kimia", "Biologi", "Komputer"],
  },
];

function PhotoUploadAvatar({
  mitra,
  onUploaded,
}: {
  mitra: MitraProfile;
  onUploaded: (updated: MitraProfile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mitraId", mitra.id);

      const res = await fetch("/api/admin/mitra/upload-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal upload foto.");
        return;
      }
      onUploaded(data.profile as MitraProfile);
    } catch {
      setError("Gagal upload foto.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer flex items-center justify-center bg-slate-100 transition-colors ${
          dragOver ? "border-bay-deep bg-bay-deep/10" : "border-line"
        }`}
        title="Klik atau drag & drop foto ke sini"
      >
        {mitra.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mitra.photo_url} alt={mitra.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-slate-500">
            {mitra.name?.charAt(0) ?? "M"}
          </span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-[10px] text-red-600 max-w-[80px] text-center">{error}</p>}
    </div>
  );
}

function SkillCheckboxes({
  mitra,
  busy,
  onChange,
}: {
  mitra: MitraProfile;
  busy: boolean;
  onChange: (skills: string[]) => void;
}) {
  const current: string[] = Array.isArray(mitra.skill_category) ? mitra.skill_category : [];

  function toggle(skill: string) {
    const next = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      {SKILL_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[9px] font-bold uppercase text-ink/40 mb-0.5">{group.label}</p>
          {/* 2 kolom, supaya baris tabel tidak terlalu tinggi memanjang ke bawah */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {group.options.map((skill) => (
              <label key={skill} className="flex items-center gap-1 text-xs text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={current.includes(skill)}
                  disabled={busy}
                  onChange={() => toggle(skill)}
                  className="rounded border-line shrink-0"
                />
                <span className="truncate">{skill}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AvailabilityBadge({ mitra }: { mitra: MitraProfile }) {
  if (mitra.is_available) {
    return (
      <span className="inline-block rounded-full bg-wa/20 px-2 py-1 text-xs font-medium text-wa">
        Tersedia
      </span>
    );
  }
  return (
    <div className="max-w-[150px]">
      <span className="inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-600">
        Tidak Tersedia
      </span>
      {mitra.unavailable_reason && (
        <p className="mt-1 text-[11px] text-ink/60">{mitra.unavailable_reason}</p>
      )}
    </div>
  );
}

function TrustSafetyCell({
  mitra,
  onUpdated,
}: {
  mitra: MitraProfile;
  onUpdated: (updated: MitraProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [violations, setViolations] = useState<MitraViolation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadViolations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mitra/violations?mitraId=${mitra.id}`);
      const data = await res.json();
      if (res.ok) setViolations(data.violations ?? []);
    } finally {
      setLoading(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && violations === null) loadViolations();
  }

  async function handleAdd() {
    const trimmed = note.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mitra/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mitraId: mitra.id, note: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambah catatan.");
        return;
      }
      onUpdated(data.profile as MitraProfile);
      setNote("");
      loadViolations();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(violationId: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mitra/violations?violationId=${violationId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menghapus catatan.");
        return;
      }
      onUpdated(data.profile as MitraProfile);
      loadViolations();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-[220px]">
      <button
        onClick={toggleOpen}
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          mitra.violation_count > 0 ? "bg-red-100 text-red-600" : "bg-wa/20 text-wa"
        }`}
      >
        {mitra.violation_count} pelanggaran
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-line bg-paper p-2">
          {loading && <p className="text-[11px] text-ink/40">Memuat riwayat...</p>}
          {!loading && violations && violations.length === 0 && (
            <p className="text-[11px] text-ink/40">Belum ada catatan pelanggaran.</p>
          )}
          {!loading &&
            violations?.map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-1 text-[11px]">
                <div>
                  <p className="text-ink">{v.note}</p>
                  <p className="text-ink/40">
                    {new Date(v.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(v.id)}
                  disabled={busy}
                  className="shrink-0 text-red-500 underline disabled:opacity-50"
                >
                  Hapus
                </button>
              </div>
            ))}
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Catat pelanggaran baru..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              className="flex-1 rounded border border-line px-1.5 py-1 text-[11px]"
            />
            <button
              onClick={handleAdd}
              disabled={busy || !note.trim()}
              className="shrink-0 rounded bg-bay-deep px-2 py-1 text-[11px] text-white disabled:opacity-50"
            >
              Tambah
            </button>
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function MitraTable({ initialMitra }: { initialMitra: MitraProfile[] }) {
  const [mitra, setMitra] = useState<MitraProfile[]>(initialMitra);
  const [topupAmount, setTopupAmount] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  /** Ganti 1 baris mitra di state lokal dengan versi terbaru dari server --
   *  dipakai oleh upload foto, top up, toggle aktif, update atribut, DAN
   *  (BARU) TrustSafetyCell setelah tambah/hapus catatan pelanggaran. */
  function updateMitraInState(updated: MitraProfile) {
    setMitra((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  async function handleTopup(id: string) {
    const amount = Number(topupAmount[id]);
    if (!amount || amount <= 0) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/mitra/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mitraId: id, amount }),
      });
      if (res.ok) {
        const { profile } = await res.json();
        setMitra((prev) => prev.map((m) => (m.id === id ? profile : m)));
        setTopupAmount((prev) => ({ ...prev, [id]: "" }));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/mitra/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mitraId: id }),
      });
      if (res.ok) {
        const { profile } = await res.json();
        setMitra((prev) => prev.map((m) => (m.id === id ? profile : m)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateAttributes(
    id: string,
    fields: { gender?: string; skill_category?: string[] }
  ) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/mitra/update-attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mitraId: id, ...fields }),
      });
      if (res.ok) {
        const { profile } = await res.json();
        setMitra((prev) => prev.map((m) => (m.id === id ? profile : m)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddMitra(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/mitra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Gagal menambah mitra.");
        return;
      }
      setMitra((prev) => [...prev, data.profile].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", phone: "", email: "", password: "" });
      setShowAddForm(false);
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink/50">
        Ambang saldo minimum bervariasi per pesanan (20% dari nilai layanan). Klik atau drag &
        drop gambar ke foto untuk mengubahnya. Mitra bisa punya lebih dari 1 keahlian sekaligus,
        termasuk kategori Les Private.
      </p>
      <p className="text-xs font-medium text-bay-deep flex items-center gap-1">
        ↔️ Tabel ini lebih lebar dari layar — geser ke kanan/kiri di dalam tabel untuk lihat semua
        kolom, termasuk tombol Top Up.
      </p>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-full bg-bay-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {showAddForm ? "Batal" : "+ Tambah Mitra Baru"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddMitra}
          className="grid grid-cols-1 gap-3 rounded-card border border-line bg-white p-5 shadow-card sm:grid-cols-2"
        >
          <input
            required
            placeholder="Nama lengkap"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Nomor HP"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email login"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Password awal (min. 6 karakter)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          {addError && <p className="col-span-2 text-sm text-red-600">{addError}</p>}
          <button
            type="submit"
            disabled={addLoading}
            className="col-span-2 rounded-full bg-wa px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {addLoading ? "Menyimpan..." : "Simpan Mitra"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-card border border-line bg-white shadow-card">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">No HP</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Keahlian</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aktif</th>
              <th className="px-4 py-3">Ketersediaan</th>
              <th className="px-4 py-3">Trust &amp; Safety</th>
              <th className="px-4 py-3">Top Up</th>
            </tr>
          </thead>
          <tbody>
            {mitra.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 align-top">
                  <PhotoUploadAvatar mitra={m} onUploaded={updateMitraInState} />
                </td>
                <td className="px-4 py-3 font-medium text-ink align-top">{m.name}</td>
                <td className="px-4 py-3 text-ink/70 align-top">{m.phone}</td>
                <td className="px-4 py-3 align-top">
                  <span className={m.wallet_balance < MITRA_WALLET_MIN_BALANCE ? "text-red-600" : "text-ink"}>
                    {formatRupiah(m.wallet_balance)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    value={m.gender ?? ""}
                    disabled={busyId === m.id}
                    onChange={(e) =>
                      handleUpdateAttributes(m.id, { gender: e.target.value || undefined })
                    }
                    className={`rounded-lg border px-2 py-1 text-xs ${
                      m.gender ? "border-line text-ink" : "border-red-300 text-red-600"
                    }`}
                  >
                    <option value="">Belum diisi</option>
                    <option value="Pria">Pria</option>
                    <option value="Wanita">Wanita</option>
                  </select>
                </td>
                <td className="px-4 py-3 align-top">
                  <SkillCheckboxes
                    mitra={m}
                    busy={busyId === m.id}
                    onChange={(skills) => handleUpdateAttributes(m.id, { skill_category: skills })}
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="rounded-full bg-bridge/25 px-2 py-1 text-xs font-medium text-bay-deep">
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <button
                    onClick={() => handleToggleActive(m.id)}
                    disabled={busyId === m.id}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      m.is_active ? "bg-wa/20 text-wa" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {m.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="px-4 py-3 align-top">
                  <AvailabilityBadge mitra={m} />
                </td>
                <td className="px-4 py-3 align-top">
                  <TrustSafetyCell mitra={m} onUpdated={updateMitraInState} />
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      placeholder="Rp"
                      value={topupAmount[m.id] ?? ""}
                      onChange={(e) =>
                        setTopupAmount((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="w-20 rounded-lg border border-line px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => handleTopup(m.id)}
                      disabled={busyId === m.id}
                      className="shrink-0 rounded-lg bg-bay-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Isi
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {mitra.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-ink/50">
                  Belum ada mitra terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
