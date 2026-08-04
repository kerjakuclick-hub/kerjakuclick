// FILE BARU: components/MitraApplicationForm.tsx

"use client";

import { useState } from "react";

const SKILL_OPTIONS = ["Setrika", "Bersihkan Rumah", "Cuci Kendaraan"];

export default function MitraApplicationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (skills.length === 0) {
      setError("Pilih minimal 1 keahlian.");
      return;
    }

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    skills.forEach((s) => formData.append("skill_category", s));

    setSubmitting(true);
    try {
      const res = await fetch("/api/mitra-applications/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim pendaftaran.");
        return;
      }
      setSuccess(true);
      formEl.reset();
      setSkills([]);
    } catch {
      setError("Gagal mengirim pendaftaran. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="text-5xl">✅</div>
        <h3 className="font-semibold text-lg text-[#12202A]">Pendaftaran Terkirim!</h3>
        <p className="text-[#3f484d]">
          Data Anda sudah kami terima. Tim kami akan menghubungi lewat WhatsApp untuk proses
          selanjutnya.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-sm text-[#1D6F8C] underline"
        >
          Daftar lagi (untuk orang lain)
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
      <div>
        <label className="text-sm font-medium text-[#12202A] block mb-1">Nama Lengkap *</label>
        <input
          required
          name="full_name"
          className="w-full rounded-lg border border-[#dfe3e0] px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-[#12202A] block mb-1">Alamat Lengkap *</label>
        <textarea
          required
          name="address"
          rows={2}
          className="w-full rounded-lg border border-[#dfe3e0] px-3 py-2.5 text-sm"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#12202A] block mb-1">Nomor HP/WA *</label>
          <input
            required
            name="phone"
            type="tel"
            placeholder="0812xxxxxxxx"
            className="w-full rounded-lg border border-[#dfe3e0] px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#12202A] block mb-1">
            Akun Media Sosial
          </label>
          <input
            name="social_media"
            placeholder="@username Instagram/Facebook"
            className="w-full rounded-lg border border-[#dfe3e0] px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-[#12202A] block mb-2">
          Pilihan Keahlian * (boleh lebih dari 1)
        </label>
        <div className="flex flex-wrap gap-3">
          {SKILL_OPTIONS.map((skill) => (
            <label
              key={skill}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm cursor-pointer transition ${
                skills.includes(skill)
                  ? "border-[#1D6F8C] bg-[#1D6F8C]/10 text-[#1D6F8C] font-medium"
                  : "border-[#dfe3e0] text-[#3f484d]"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={skills.includes(skill)}
                onChange={() => toggleSkill(skill)}
              />
              {skill}
            </label>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-[#12202A] block mb-1">Foto Profil *</label>
          <input
            required
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="w-full text-xs"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#12202A] block mb-1">Foto KTP *</label>
          <input
            required
            type="file"
            name="ktp"
            accept="image/jpeg,image/png,image/webp"
            className="w-full text-xs"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#12202A] block mb-1">Foto KK *</label>
          <input
            required
            type="file"
            name="kk"
            accept="image/jpeg,image/png,image/webp"
            className="w-full text-xs"
          />
        </div>
      </div>
      <p className="text-xs text-[#3f484d]/70">
        Dokumen Anda hanya dapat diakses oleh tim internal Kerjaku.click untuk keperluan
        verifikasi pendaftaran, dan tidak ditampilkan publik.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#F5B324] text-[#12202A] font-semibold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-60"
      >
        {submitting ? "Mengirim..." : "Kirim Pendaftaran"}
      </button>
    </form>
  );
}
