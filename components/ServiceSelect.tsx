// FILE BARU: components/ServiceSelect.tsx
//
// Menggantikan <select> native untuk "Pilihan Jasa". Alasan: dropdown
// native (<select>+<option>) dirender OS/browser masing-masing dengan cara
// berbeda-beda — terbukti dari testing Anda, Firefox menampilkan warna teks
// opsi dengan benar, tapi Chrome tidak (opsi tidak terbaca kecuali sedang
// di-hover). Ini keterbatasan bawaan <select>, bukan sesuatu yang bisa
// diperbaiki 100% lewat CSS untuk semua browser sekaligus.
//
// Komponen ini dirender pakai <div>/<button> biasa (bukan elemen native
// browser), jadi tampilannya — termasuk warna teks dan shadow — dijamin
// identik di semua browser karena kita yang mengatur semuanya lewat CSS
// biasa, bukan bergantung pada rendering internal browser.

"use client";

import { useEffect, useRef, useState } from "react";
import { services, formatRupiah, serviceCategories } from "@/lib/services";

interface ServiceSelectProps {
  id?: string;
  value: string;
  onChange: (name: string) => void;
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
          {selected ? `${selected.name} (${formatRupiah(selected.price)})` : "Pilih jenis layanan"}
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
                    {s.name} ({formatRupiah(s.price)})
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
