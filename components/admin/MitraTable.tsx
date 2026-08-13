// GANTI ISI components/admin/MitraTable.tsx Anda dengan file ini.
//
// Perubahan: SKILL_OPTIONS diperluas dengan 7 mata pelajaran Les Private,
// dikelompokkan visual jadi 2 bagian (Rumah Tangga / Les Private) supaya
// tetap rapi meski sekarang ada 10 pilihan keahlian.

"use client";

import { useRef, useState } from "react";
import { formatRupiah, services } from "@/lib/services";
import type { MitraProfile } from "@/lib/types";

const MIN_TARIF = Math.min(...services.map((s) => s.price));
const SALDO_WARNING_THRESHOLD = Math.round(MIN_TARIF * 0.2);

const SKILL_GROUPS: { label: string; options: string[] }[] = [
  { label: "Rumah Tangga", options: ["Setrika", "Bersihkan Rumah", "Cuci Kendaraan"] },
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
    <div className="flex flex-col gap-2 min-w-[150px]">
      {SKILL_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[9px] font-bold uppercase text-ink/40 mb-0.5">{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.options.map((skill) => (
              <label key={skill} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={current.includes(skill)}
                  disabled={busy}
                  onChange={() => toggle(skill)}
                  className="rounded border-line"
                />
                {skill}
              </label>
            ))}
          </div>
        </div>
      ))}
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

  function handlePhotoUploaded(updated: MitraProfile) {
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
        <table className="w-full min-w-[1140px] text-left text-sm">
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
              <th className="px-4 py-3">Top Up</th>
            </tr>
          </thead>
          <tbody>
            {mitra.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <PhotoUploadAvatar mitra={m} onUploaded={handlePhotoUploaded} />
                </td>
                <td className="px-4 py-3 font-medium text-ink align-top">{m.name}</td>
                <td className="px-4 py-3 text-ink/70 align-top">{m.phone}</td>
                <td className="px-4 py-3 align-top">
                  <span className={m.wallet_balance < SALDO_WARNING_THRESHOLD ? "text-red-600" : "text-ink"}>
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
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      placeholder="Rp"
                      value={topupAmount[m.id] ?? ""}
                      onChange={(e) =>
                        setTopupAmount((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="w-24 rounded-lg border border-line px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => handleTopup(m.id)}
                      disabled={busyId === m.id}
                      className="rounded-lg bg-bay-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Isi
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {mitra.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-ink/50">
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
