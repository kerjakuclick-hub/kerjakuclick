// GANTI ISI components/ServiceSelect.tsx Anda dengan file ini.
//
// Perubahan: teks tiap opsi (dan teks tombol saat sudah dipilih) sekarang
// menampilkan detail layanan (unit/pcs/tipe rumah + durasi), bukan cuma
// nama & harga. Contoh: "Setrika Fast (Rp40.000) — 20 Pcs / Paket, 1 Jam".
//
// Detail diambil generik dari field `unit` & `duration` di lib/services.ts
// (bukan di-hardcode per layanan di sini) supaya varian baru otomatis ikut
// tampil lengkap. Satu pengecualian: untuk kategori "Les Private", field
// `unit`-nya sudah terkandung dalam `name` (mis. "Mengaji — 1x Pertemuan"),
// jadi untuk kategori itu cuma `duration` yang ditambahkan supaya teksnya
// tidak dobel ("...1x Pertemuan — 1x Pertemuan, 2 Jam").
//
// Catatan: Cuci Motor & Cuci Mobil TIDAK diminta detail tambahan secara
// eksplisit, tapi karena field unit/duration untuk keduanya sudah ada &
// valid di lib/services.ts ("1 Motor"/"1 Jam", "1 Mobil"/"2 Jam"), detail
// itu ikut tampil juga lewat logic generik ini -- konsisten dengan seluruh
// kategori lain, dan datanya memang benar. Kalau ternyata tidak mau
// ditampilkan untuk 2 layanan ini, tinggal beri tahu saya.

"use client";

import { useEffect, useRef, useState } from "react";
import { services, formatRupiah, serviceCategories, type ServiceVariant } from "@/lib/services";

interface ServiceSelectProps {
  id?: string;
  value: string;
  onChange: (name: string) => void;
}

function formatServiceLabel(s: ServiceVariant): string {
  const details = s.category === "Les Private" ? [s.duration] : [s.unit, s.duration];
  return `${s.name} (${formatRupiah(s.price)}) — ${details.join(", ")}`;
}

export default function ServiceSelect({ id, value, onChange }: ServiceSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selected = services.find((s) => s.name === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bridge"
      >
        <span className={selected ? "" : "text-white/40"}>
          {selected ? formatServiceLabel(selected) : "Pilih jenis layanan"}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-white shadow-lg"
        >
          {serviceCategories.map((category) => (
            <div key={category}>
              <p className="sticky top-0 bg-paper px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-ink/50">
                {category}
              </p>
              {services
                .filter((s) => s.category === category)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={value === s.name}
                    onClick={() => {
                      onChange(s.name);
                      setOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-bay-deep/10 ${
                      value === s.name ? "bg-bay-deep/10 font-medium text-bay-deep" : "text-ink"
                    }`}
                  >
                    {formatServiceLabel(s)}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
