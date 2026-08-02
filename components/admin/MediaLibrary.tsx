// FILE BARU: components/admin/MediaLibrary.tsx

"use client";

import { useRef, useState } from "react";

interface SiteMedia {
  slug: string;
  label: string;
  image_url: string | null;
  updated_at: string;
}

const PROTECTED_SLUGS = ["service_setrika", "service_bersihkan_rumah", "service_cuci_kendaraan"];

function MediaCard({
  media,
  onUpdated,
  onDeleted,
}: {
  media: SiteMedia;
  onUpdated: (m: SiteMedia) => void;
  onDeleted: (slug: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProtected = PROTECTED_SLUGS.includes(media.slug);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", media.slug);

      const res = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal upload gambar.");
        return;
      }
      onUpdated(data.media as SiteMedia);
    } catch {
      setError("Gagal upload gambar.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Hapus slot media "${media.label}"?`)) return;
    const res = await fetch("/api/admin/media/delete-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: media.slug }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Gagal menghapus slot.");
      return;
    }
    onDeleted(media.slug);
  }

  return (
    <div className="rounded-card border border-line bg-white shadow-card overflow-hidden">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) uploadFile(file);
        }}
        className={`relative h-40 w-full cursor-pointer flex items-center justify-center bg-slate-100 transition-colors ${
          dragOver ? "ring-4 ring-inset ring-bay-deep bg-bay-deep/10" : ""
        }`}
        title="Klik atau drag & drop gambar ke sini"
      >
        {media.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.image_url} alt={media.label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-ink/40 text-center px-4">
            Belum ada gambar
            <br />
            Klik atau drag & drop di sini
          </span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{media.label}</p>
          <p className="text-[10px] text-ink/40 truncate">{media.slug}</p>
        </div>
        {!isProtected && (
          <button
            onClick={handleDelete}
            className="text-xs text-red-600 hover:underline shrink-0"
          >
            Hapus
          </button>
        )}
      </div>
      {error && <p className="px-3 pb-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function MediaLibrary({ initialMedia }: { initialMedia: SiteMedia[] }) {
  const [mediaList, setMediaList] = useState<SiteMedia[]>(initialMedia);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function handleUpdated(updated: SiteMedia) {
    setMediaList((prev) => prev.map((m) => (m.slug === updated.slug ? updated : m)));
  }

  function handleDeleted(slug: string) {
    setMediaList((prev) => prev.filter((m) => m.slug !== slug));
  }

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/media/create-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Gagal menambah slot.");
        return;
      }
      setMediaList((prev) => [...prev, data.media as SiteMedia]);
      setNewLabel("");
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
          {showAddForm ? "Batal" : "+ Tambah Slot Media Baru"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSlot}
          className="flex flex-wrap gap-3 rounded-card border border-line bg-white p-4 shadow-card items-end"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-ink/50 block mb-1">
              Nama media (mis. "Banner Promo Lebaran")
            </label>
            <input
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
          </div>
          {addError && <p className="text-sm text-red-600 basis-full">{addError}</p>}
          <button
            type="submit"
            disabled={addLoading}
            className="rounded-full bg-wa px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {addLoading ? "Menyimpan..." : "Buat Slot"}
          </button>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaList.map((m) => (
          <MediaCard key={m.slug} media={m} onUpdated={handleUpdated} onDeleted={handleDeleted} />
        ))}
        {mediaList.length === 0 && (
          <p className="text-sm text-ink/50 col-span-full text-center py-8">
            Belum ada slot media.
          </p>
        )}
      </div>
    </div>
  );
}
