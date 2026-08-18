// GANTI ISI components/Footer.tsx Anda dengan file ini.
// Link kontak diisi data asli dari identitas perusahaan (bukan "#" kosong
// seperti hasil mentah Stitch).

export default function Footer() {
  return (
    <footer className="bg-[#12202A] mt-16">
      <div className="max-w-[1200px] mx-auto px-6 py-16 flex flex-col md:flex-row justify-between items-start gap-10">
        <div className="space-y-3 max-w-sm">
          <div className="font-semibold text-[#F5B324]">kerjaku.click</div>
          <p className="text-white/70 text-sm">
            Penyedia jasa tenaga kerja harian terpercaya untuk area Kota Palu
            dan sekitarnya. Membantu memudahkan urusan rumah tangga Anda.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
          <div className="space-y-3">
            <p className="text-white font-bold text-sm">Layanan</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#services" className="text-white/70 hover:text-[#F5B324] transition-colors">
                  Setrika
                </a>
              </li>
              <li>
                <a href="#services" className="text-white/70 hover:text-[#F5B324] transition-colors">
                  Bersih Rumah
                </a>
              </li>
              <li>
                <a href="#services" className="text-white/70 hover:text-[#F5B324] transition-colors">
                  Cuci Kendaraan
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-white font-bold text-sm">Hubungi Kami</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://instagram.com/kerjaku.click"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#F5B324] transition-colors"
                >
                  Instagram @kerjaku.click
                </a>
              </li>
              <li>
                <a
                 href="https://wa.me/6281145504178"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#F5B324] transition-colors"
                >
                  WA: +62 811-4550-4178
                </a>
              </li>
              <li>
                <a
                  href="mailto:suport@kerjaku.click"
                  className="text-white/70 hover:text-[#F5B324] transition-colors"
                >
                  suport@kerjaku.click
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-3 col-span-2 sm:col-span-1">
            <p className="text-white font-bold text-sm">Lokasi</p>
            <p className="text-white/70 text-sm">Kota Palu, Sulawesi Tengah</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-2">
        <p className="text-white/60 text-xs text-center md:text-left">
          © {new Date().getFullYear()} PT. Kerjaku Bangun Negeri. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
