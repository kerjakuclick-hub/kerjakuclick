// GANTI ISI components/admin/MitraApplicationsList.tsx Anda dengan file ini.
// Perubahan: tampilkan pendidikan terakhir + tombol lihat KTM (kalau ada).

"use client";

import { useState } from "react";

interface MitraApplication {
  id: number;
  full_name: string;
  address: string;
  phone: string;
  social_media: string | null;
  last_education: string | null;
  is_student: boolean;
  skill_category: string[];
  photo_path: string | null;
  ktp_path: string | null;
  kk_path: string | null;
  student_id_path: string | null;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  admin_notes: string | null;
  submitted_at: string;
}

const STATUS_LABEL: Record<MitraApplication["status"], string> = {
  pending: "Baru Masuk",
  reviewed: "Sudah Ditinjau",
  accepted: "Diterima",
  rejected: "Ditolak",
};

const STATUS_COLOR: Record<MitraApplication["status"], string> = {
  pending: "bg-bridge/25 text-bay-deep",
  reviewed: "bg-bay-light/30 text-bay-deep",
  accepted: "bg-wa/20 text-wa",
  rejected: "bg-red-100 text-red-600",
};

export default function MitraApplicationsList({
  initialApplications,
}: {
  initialApplications: MitraApplication[];
}) {
  const [applications, setApplications] = useState<MitraApplication[]>(initialApplications);
  const [filter, setFilter] = useState<"all" | MitraApplication["status"]>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  async function viewDocument(path: string | null, label: string) {
    if (!path) return;
    setLoadingDoc(label);
    try {
      const res = await fetch("/api/admin/mitra-applications/get-file-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        alert(data.error ?? "Gagal membuka dokumen.");
      }
    } finally {
      setLoadingDoc(null);
    }
  }

  async function updateStatus(id: number, status: MitraApplication["status"]) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/mitra-applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const { application } = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === application.id ? application : a)));
      }
    } finally {
      setBusyId(null);
    }
  }

  const filtered =
    filter === "all" ? applications : applications.filter((a) => a.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "reviewed", "accepted", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
              filter === f
                ? "bg-bay-deep text-white border-bay-deep"
                : "border-line text-ink/60"
            }`}
          >
            {f === "all" ? "Semua" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((app) => (
          <div
            key={app.id}
            className="rounded-card border border-line bg-white p-5 shadow-card"
          >
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <p className="font-semibold text-ink">{app.full_name}</p>
                <p className="text-sm text-ink/60">{app.phone}</p>
                {app.social_media && (
                  <p className="text-xs text-ink/50">{app.social_media}</p>
                )}
                <p className="text-xs text-ink/50 mt-1 max-w-md">{app.address}</p>
                <p className="text-xs text-ink/60 mt-1">
                  <span className="font-medium">Pendidikan:</span> {app.last_education ?? "-"}
                  {app.is_student && (
                    <span className="ml-1.5 rounded-full bg-bay-light/20 px-2 py-0.5 text-[10px] font-medium text-bay-deep">
                      Masih Berkuliah
                    </span>
                  )}
                </p>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {app.skill_category.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-bay-light/20 px-2 py-0.5 text-[10px] font-medium text-bay-deep"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-ink/40 mt-2">
                  Daftar: {new Date(app.submitted_at).toLocaleString("id-ID")}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[app.status]}`}
              >
                {STATUS_LABEL[app.status]}
              </span>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => viewDocument(app.photo_path, `photo-${app.id}`)}
                disabled={loadingDoc === `photo-${app.id}`}
                className="text-xs rounded-lg border border-line px-3 py-1.5 hover:bg-paper"
              >
                {loadingDoc === `photo-${app.id}` ? "Membuka..." : "Lihat Foto Profil"}
              </button>
              <button
                onClick={() => viewDocument(app.ktp_path, `ktp-${app.id}`)}
                disabled={loadingDoc === `ktp-${app.id}`}
                className="text-xs rounded-lg border border-line px-3 py-1.5 hover:bg-paper"
              >
                {loadingDoc === `ktp-${app.id}` ? "Membuka..." : "Lihat KTP"}
              </button>
              <button
                onClick={() => viewDocument(app.kk_path, `kk-${app.id}`)}
                disabled={loadingDoc === `kk-${app.id}`}
                className="text-xs rounded-lg border border-line px-3 py-1.5 hover:bg-paper"
              >
                {loadingDoc === `kk-${app.id}` ? "Membuka..." : "Lihat KK"}
              </button>
              {app.student_id_path && (
                <button
                  onClick={() => viewDocument(app.student_id_path, `ktm-${app.id}`)}
                  disabled={loadingDoc === `ktm-${app.id}`}
                  className="text-xs rounded-lg border border-bay-deep/30 bg-bay-light/10 px-3 py-1.5 hover:bg-bay-light/20"
                >
                  {loadingDoc === `ktm-${app.id}` ? "Membuka..." : "Lihat KTM"}
                </button>
              )}
            </div>

            <div className="mt-3 flex gap-2 flex-wrap border-t border-line pt-3">
              {(["reviewed", "accepted", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(app.id, s)}
                  disabled={busyId === app.id || app.status === s}
                  className={`text-xs rounded-lg px-3 py-1.5 font-medium disabled:opacity-40 ${
                    s === "accepted"
                      ? "bg-wa text-white"
                      : s === "rejected"
                      ? "bg-red-500 text-white"
                      : "bg-bay-light/30 text-bay-deep"
                  }`}
                >
                  Tandai {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-ink/50 py-8">Tidak ada pendaftar.</p>
        )}
      </div>
    </div>
  );
}
