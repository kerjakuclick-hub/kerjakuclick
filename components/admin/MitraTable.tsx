"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/services";
import type { MitraProfile } from "@/lib/types";

export default function MitraTable({ initialMitra }: { initialMitra: MitraProfile[] }) {
  const [mitra, setMitra] = useState<MitraProfile[]>(initialMitra);
  const [topupAmount, setTopupAmount] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

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
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">No HP</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Total Pendapatan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aktif</th>
              <th className="px-4 py-3">Top Up</th>
            </tr>
          </thead>
          <tbody>
            {mitra.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                <td className="px-4 py-3 text-ink/70">{m.phone}</td>
                <td className="px-4 py-3">
                  <span className={m.wallet_balance < 50000 ? "text-red-600" : "text-ink"}>
                    {formatRupiah(m.wallet_balance)}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/70">{formatRupiah(m.total_earnings)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-bridge/25 px-2 py-1 text-xs font-medium text-bay-deep">
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
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
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/50">
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
