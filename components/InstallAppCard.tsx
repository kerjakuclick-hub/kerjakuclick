// FILE BARU (25 September 2026): kartu "Install Aplikasi" di dasbor Mitra &
// Admin.
//   - Kalau Chrome menyatakan aplikasi BISA di-install -> tombol "Install
//     Aplikasi" (memunculkan dialog install resmi Chrome).
//   - Kalau belum bisa -> panduan singkat + "Info teknis" (manifest yang
//     terbaca, status service worker, browser) supaya penyebabnya bisa
//     dicek dari screenshot HP.
//   - Tidak tampil sama sekali kalau halaman sudah dibuka SEBAGAI aplikasi
//     (mode standalone), atau setelah ditutup pengguna.

"use client";

import { useEffect, useState } from "react";

type Diag = {
  manifest: string;
  sw: string;
  browser: string;
};

export default function InstallAppCard({ appName }: { appName: string }) {
  const [visible, setVisible] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showDiag, setShowDiag] = useState(false);
  const [diag, setDiag] = useState<Diag | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("kk-install-dismissed") === "1";
    } catch {}
    if (standalone || dismissed) return;
    setVisible(true);
    setCanInstall(Boolean(window.__kkInstallPrompt));
    setInstalled(Boolean(window.__kkInstalled));

    const onAvail = () => setCanInstall(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener("kk-install-available", onAvail);
    window.addEventListener("kk-installed", onInstalled);

    // Info teknis untuk pengecekan.
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const ua = navigator.userAgent;
    const chrome = ua.match(/Chrome\/(\d+)/)?.[1];
    const browser = /SamsungBrowser/.test(ua)
      ? "Samsung Internet (gunakan Chrome)"
      : /HeyTapBrowser|OPR|MiuiBrowser|UCBrowser|Firefox/.test(ua)
        ? "Bukan Chrome (gunakan Chrome)"
        : chrome
          ? `Chrome ${chrome}`
          : "Tidak dikenali";
    const update = (sw: string) =>
      setDiag({ manifest: link?.getAttribute("href") ?? "(tidak ada)", sw, browser });
    if (!("serviceWorker" in navigator)) {
      update("tidak didukung browser");
    } else {
      update(navigator.serviceWorker.controller ? "aktif" : "terdaftar, aktif setelah refresh");
      navigator.serviceWorker.getRegistration("/").then((reg) => {
        if (!reg) update("belum terdaftar");
        else if (navigator.serviceWorker.controller) update("aktif");
      });
    }

    return () => {
      window.removeEventListener("kk-install-available", onAvail);
      window.removeEventListener("kk-installed", onInstalled);
    };
  }, []);

  async function install() {
    const prompt = window.__kkInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    window.__kkInstallPrompt = undefined;
    setCanInstall(false);
    if (choice?.outcome === "accepted") setInstalled(true);
  }

  function dismiss() {
    try {
      localStorage.setItem("kk-install-dismissed", "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-6 rounded-card border border-line bg-white p-4 text-sm text-ink shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">📲 Install aplikasi {appName}</p>
          {installed ? (
            <p className="mt-1 text-ink/70">
              Aplikasi sudah ter-install. Buka dari ikon {appName} di layar HP.
            </p>
          ) : canInstall ? (
            <p className="mt-1 text-ink/70">Buka dasbor langsung dari layar HP, tanpa buka browser.</p>
          ) : (
            <p className="mt-1 text-ink/70">
              Di Chrome: ketuk menu <strong>⋮</strong> → <strong>Instal aplikasi</strong>. Kalau
              yang muncul malah <strong>Buka aplikasi</strong> / nama aplikasi lain, hapus dulu
              aplikasi &quot;Kerjaku.click&quot; lama di HP, lalu muat ulang halaman ini.
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="-mr-1 -mt-1 rounded p-1 text-ink/40 hover:text-ink"
        >
          ✕
        </button>
      </div>

      {canInstall && !installed && (
        <button
          onClick={install}
          className="mt-3 rounded-full bg-bridge px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-105"
        >
          Install Aplikasi
        </button>
      )}

      {!canInstall && !installed && diag && (
        <div className="mt-2">
          <button
            onClick={() => setShowDiag((v) => !v)}
            className="text-xs font-medium text-bay underline underline-offset-2"
          >
            {showDiag ? "Sembunyikan info teknis" : "Info teknis"}
          </button>
          {showDiag && (
            <ul className="mt-2 space-y-0.5 rounded-lg bg-paper px-3 py-2 font-mono text-[11px] text-ink/70">
              <li>manifest: {diag.manifest}</li>
              <li>service worker: {diag.sw}</li>
              <li>browser: {diag.browser}</li>
              <li>prompt install Chrome: belum diterima</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
