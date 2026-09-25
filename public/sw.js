/* kerjaku.click service worker (25 September 2026)
 *
 * Tujuan UTAMA: memenuhi syarat "bisa di-install" Chrome di HP Android untuk
 * aplikasi Mitra, Admin, dan Pelanggan. SENGAJA TIDAK menyimpan cache
 * halaman/data apa pun -- semua request tetap langsung ke server, jadi saldo,
 * tugas, dan pesanan selalu data terbaru.
 *
 * Satu-satunya tambahan: kalau HP sedang offline saat membuka halaman,
 * tampilkan pesan singkat "sedang offline" alih-alih layar error Chrome.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const OFFLINE_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline — kerjaku.click</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#EEF2EE;color:#12202A;font-family:system-ui,sans-serif;text-align:center;padding:24px}
button{margin-top:16px;background:#F5B324;border:0;padding:10px 20px;font-weight:700;border-radius:8px}</style>
</head><body><div><h1 style="font-size:20px">Anda sedang offline</h1>
<p>Periksa koneksi internet, lalu coba lagi.</p>
<button onclick="location.reload()">Coba lagi</button></div></body></html>`;

self.addEventListener("fetch", (event) => {
  // Hanya navigasi halaman (bukan API, gambar, atau POST) -- request lain
  // dibiarkan berjalan normal tanpa campur tangan service worker.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        })
    )
  );
});
