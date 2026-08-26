// GANTI ISI components/YoutubeSection.tsx Anda dengan file ini.
//
// Pola "opsi 3" yang disepakati: tampilkan thumbnail ringan dulu (JPG
// statis dari YouTube, tidak memuat player JS sama sekali) — begitu
// diklik, BARU iframe video-nya dimuat & langsung diputar di tempat
// (tidak pindah ke YouTube).
//
// TODO: tambahkan video ke-3 ("Wajib Tahu! cara pakai aplikasi mitra...")
// kalau mau ditampilkan juga — tinggal kirim linknya, tambah 1 baris ke
// VIDEOS di bawah.

"use client";

import { useState } from "react";

const CHANNEL_URL = "https://youtube.com/@Kerjakuclick";

interface YoutubeVideo {
  id: string; // ID video, bagian setelah youtu.be/ atau ?v= (sebelum tanda &/?)
  title: string;
}

const VIDEOS: YoutubeVideo[] = [
  { id: "LQ_uWHM5-18", title: "Di Balik Layar Kerjaku.click" },
  { id: "SOGejLZtvkY", title: "Jasa Panggilan ke Rumah Anda, Sekali Klik!" },
];

function VideoCard({ video }: { video: YoutubeVideo }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-xl shadow-lg"
      aria-label={`Putar video: ${video.title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
        alt={video.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-left text-sm font-medium text-white">
        {video.title}
      </p>
    </button>
  );
}

export default function YoutubeSection() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#12202A] md:text-3xl">
          Kenali Kerjaku.click Lebih Dekat
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-[#3f484d]">
          Lihat langsung cerita di balik layar dan bagaimana kami bekerja lewat channel YouTube
          kami.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {VIDEOS.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      <div className="mt-8 text-center">
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5V8.5L15.8 12Z" />
          </svg>
          Kunjungi Channel YouTube Kami
        </a>
      </div>
    </section>
  );
}
