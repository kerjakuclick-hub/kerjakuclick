// FILE BARU (25 September 2026): ajakan install aplikasi kerjaku.click untuk
// PELANGGAN di website publik (beranda, pesan, AkunKU, dst).
//   - Android / desktop Chrome: muncul begitu Chrome menyatakan aplikasi
//     bisa di-install (event beforeinstallprompt, ditangkap di
//     components/ServiceWorkerRegister.tsx) -> tombol "Install".
//   - iPhone (Safari): tidak ada tombol install otomatis dari Apple, jadi
//     ditampilkan panduan "Bagikan -> Tambah ke Layar Utama".
//   - TIDAK tampil di dasbor mitra/admin (sudah punya kartu install sendiri
//     -- components/InstallAppCard.tsx), di halaman login/maintenance, di
//     subdomain admin, atau kalau sudah dibuka sebagai aplikasi.
//   - Kalau ditutup, tidak muncul lagi selama 7 hari.
//   - Posisi kiri bawah, menyisakan ruang tombol chat (kanan bawah).

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const HIDDEN_PREFIXES = ["/mitra", "/admin", "/login", "/maintenance", "/auth", "/daftar-mitra"];
const DISMISS_KEY = "kk-public-install-dismissed-at";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 4000; // beri waktu pengunjung melihat hero dulu

type Mode = "prompt" | "ios" | null;

export default function PublicInstallBanner() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>(null);
  const [ready, setReady] = useState(false);

  const hiddenPath = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(p + "/")
  );

  useEffect(() => {
    if (hiddenPath) return;
    if (window.location.hostname.startsWith("admin.")) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (standalone) return;

    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (at && Date.now() - at < DISMISS_DAYS * 86_400_000) return;
    } catch {}

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);

    if (window.__kkInstallPrompt) setMode("prompt");
    else if (isIos) setMode("ios");

    const onAvail = () => setMode("prompt");
    const onInstalled = () => setMode(null);
    window.addEventListener("kk-install-available", onAvail);
    window.addEventListener("kk-installed", onInstalled);

    const t = setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => {
      clearTimeout(t);
      window.removeEventListener("kk-install-available", onAvail);
      window.removeEventListener("kk-installed", onInstalled);
    };
  }, [hiddenPath]);

  async function install() {
    const prompt = window.__kkInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    window.__kkInstallPrompt = undefined;
    setMode(null);
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setMode(null);
  }

  if (hiddenPath || !ready || !mode) return null;

  return (
    <div
      role="dialog"
      aria-label="Install aplikasi kerjaku.click"
      className="fixed bottom-4 left-3 right-20 z-40 flex items-center gap-3 rounded-card border border-ink/10 bg-white p-3 text-ink shadow-xl sm:left-5 sm:right-auto sm:w-[22rem]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">Install aplikasi kerjaku.click</p>
        {mode === "prompt" ? (
          <p className="mt-0.5 text-xs leading-snug text-ink/65">
            Pesan jasa & cek pesanan langsung dari layar HP.
          </p>
        ) : (
          <p className="mt-0.5 text-xs leading-snug text-ink/65">
            Ketuk <strong>Bagikan</strong> (ikon kotak dengan panah) lalu{" "}
            <strong>Tambah ke Layar Utama</strong>.
          </p>
        )}
      </div>
      {mode === "prompt" && (
        <button
          onClick={install}
          className="shrink-0 rounded-full bg-bridge px-4 py-2 text-xs font-bold text-ink transition hover:brightness-105"
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Tutup"
        className="-mr-1 shrink-0 self-start rounded p-1 text-sm leading-none text-ink/40 hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
