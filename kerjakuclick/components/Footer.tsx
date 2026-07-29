export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg font-semibold text-white">Kerjakuclick</p>
            <p className="mt-2 text-sm">Jasa tenaga kerja ke rumah Anda. Sekali klik.</p>
            <p className="mt-4 text-xs text-white/50">
              PT. Kerjaku Bangun Negeri
              <br />
              Sertifikat PT, NIB &amp; Izin Tata Ruang lengkap
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Hubungi Kami</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="https://wa.me/6288245185778" className="hover:text-bridge">
                  Customer Service (WA): +62 882-4518-5778
                </a>
              </li>
              <li>
                <a href="https://wa.me/6288245185778" className="hover:text-bridge">
                  Kemitraan (WA): +62 882-4518-5778
                </a>
              </li>
              <li>
                <a href="mailto:suport@kerjaku.click" className="hover:text-bridge">
                  suport@kerjaku.click
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Tautan</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="https://instagram.com/kerjaku.click" className="hover:text-bridge">
                  Instagram @kerjaku.click
                </a>
              </li>
              <li>
                <a href="#layanan" className="hover:text-bridge">
                  Layanan &amp; Tarif
                </a>
              </li>
              <li>
                <a href="#pesan" className="hover:text-bridge">
                  Pesan Sekarang
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 text-xs text-white/40">
          © {new Date().getFullYear()} Kerjakuclick — PT. Kerjaku Bangun Negeri. Area layanan saat ini:
          Kota Palu.
        </p>
      </div>
    </footer>
  );
}
