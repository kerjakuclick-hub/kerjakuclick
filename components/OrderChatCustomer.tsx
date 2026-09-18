// FILE BARU: components/OrderChatCustomer.tsx
//
// Chat Pesanan sisi PELANGGAN (Bagian 7.2/8.2) -- dipakai di app/riwayat/
// page.tsx, satu instance per pesanan yang statusnya sudah "assigned" ke
// atas (belum ada gunanya chat sebelum ada mitra yang ditugaskan).
//
// Beda dari components/shared/OrderChat.tsx (mitra/admin): pelanggan
// BUKAN Supabase Auth user jadi tidak bisa subscribe Realtime langsung ke
// tabel order_messages (RLS tabel itu memang sengaja tidak punya policy
// untuk pelanggan, lihat migrasi 025). Komponen ini pakai
// app/api/customer/orders/[id]/messages/route.ts (service-role, sudah
// verifikasi sesi + kecocokan nomor HP) dan di-poll tiap beberapa detik
// selagi panel chat terbuka -- cukup untuk volume chat pesanan rumahan,
// tidak perlu infrastruktur realtime tambahan untuk pelanggan.
//
// REFAKTOR (18 September 2026) -- supaya klien tidak perlu buka /riwayat
// dulu untuk chat (lihat components/FloatingChatLauncher.tsx, tombol
// melayang di semua halaman publik), isi panel chat (daftar pesan + input)
// dipisah jadi `OrderChatCustomerPanel` (named export) tanpa
// header/tombol buka-tutup sendiri -- supaya bisa dipakai ULANG oleh
// FloatingChatLauncher dengan headernya sendiri, tanpa duplikasi logic
// fetch/poll/kirim pesan. `OrderChatCustomer` (default export) TETAP ada
// persis seperti sebelumnya (tombol toggle per kartu di /riwayat) supaya
// pemanggilnya tidak perlu berubah.
//
// BARU (18 September 2026) -- fitur "Bagikan Lokasi" (migrasi
// 026_order_messages_location.sql): tombol "📍" di sebelah kotak teks,
// pakai Geolocation API browser (lib/location.ts) lalu kirim pesan dengan
// messageType="location" ke route.ts -- dirender sebagai kartu tautan
// Google Maps (components/shared/LocationMessageCard.tsx).

"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderMessage } from "@/lib/types";
import { LOCATION_MESSAGE_BODY, getBrowserLocation } from "@/lib/location";
import LocationMessageCard from "./shared/LocationMessageCard";

const POLL_MS = 6000;

/**
 * Isi panel chat (daftar pesan + kotak input + tombol bagikan lokasi) --
 * TANPA header/tombol buka-tutup sendiri, supaya pemanggil (OrderChatCustomer
 * di bawah, atau FloatingChatLauncher) bebas membungkusnya dengan header
 * masing-masing. Di-mount = mulai polling; di-unmount = berhenti polling
 * (menggantikan gating `if (!open) return` versi lama di dalam useEffect,
 * sekarang pemanggil yang mengatur kapan komponen ini dipasang).
 */
export function OrderChatCustomerPanel({
  orderId,
  customerName,
}: {
  orderId: number;
  customerName: string;
}) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/messages`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendPayload(payload: {
    body: string;
    messageType?: "text" | "location";
    lat?: number;
    lng?: number;
  }) {
    const res = await fetch(`/api/customer/orders/${orderId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Gagal mengirim pesan.");
      return false;
    }
    setMessages((prev) => [...prev, data.message]);
    return true;
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const ok = await sendPayload({ body });
      if (ok) setDraft("");
    } finally {
      setSending(false);
    }
  }

  async function handleShareLocation() {
    if (sharingLocation) return;
    setSharingLocation(true);
    setError(null);
    try {
      const { lat, lng } = await getBrowserLocation();
      await sendPayload({ body: LOCATION_MESSAGE_BODY, messageType: "location", lat, lng });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membagikan lokasi.");
    } finally {
      setSharingLocation(false);
    }
  }

  return (
    <>
      <div className="max-h-56 space-y-2 overflow-y-auto p-3">
        {!loaded && <p className="text-xs text-white/40">Memuat chat...</p>}
        {loaded && messages.length === 0 && (
          <p className="text-xs text-white/40">
            Belum ada pesan. Gunakan chat ini untuk koordinasi jadwal dengan mitra Anda -- bukan
            lewat nomor WA pribadi.
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_type === "customer";
          if (m.sender_type === "system") {
            return (
              <p key={m.id} className="text-center text-[11px] italic text-white/40">
                {m.body}
              </p>
            );
          }
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${
                  isMine ? "bg-wa text-white" : "bg-white/10 text-white"
                }`}
              >
                <p className="mb-0.5 text-[10px] font-semibold text-white/60">
                  {m.sender_type === "mitra" ? "Mitra" : m.sender_type === "admin" ? "Admin" : customerName}{" "}
                  · {m.sender_name}
                </p>
                {m.message_type === "location" && m.location_lat !== null && m.location_lng !== null ? (
                  <LocationMessageCard lat={m.location_lat} lng={m.location_lng} tone="dark" />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={handleShareLocation}
          disabled={sharingLocation}
          title="Bagikan lokasi Anda saat ini"
          className="shrink-0 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          {sharingLocation ? "..." : "📍"}
        </button>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Tulis pesan..."
          disabled={sending}
          className="flex-1 rounded-lg border border-white/20 bg-transparent px-2.5 py-1.5 text-xs text-white placeholder:text-white/30"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-lg bg-wa px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {sending ? "..." : "Kirim"}
        </button>
      </div>
      {error && <p className="px-2 pb-2 text-xs text-red-300">{error}</p>}
    </>
  );
}

/** Tombol toggle "💬 Chat Pesanan" per kartu pesanan di app/riwayat/page.tsx
 *  -- perilaku TIDAK berubah dari versi sebelumnya, cuma isinya sekarang
 *  dipakai dari OrderChatCustomerPanel supaya tidak dobel logic dengan
 *  FloatingChatLauncher. */
export default function OrderChatCustomer({
  orderId,
  customerName,
}: {
  orderId: number;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full border border-white/30 px-4 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
      >
        💬 Chat Pesanan
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-white/15 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-xs font-medium text-white/80">Chat Pesanan</p>
        <button onClick={() => setOpen(false)} className="text-xs text-white/50 underline">
          Tutup
        </button>
      </div>
      <OrderChatCustomerPanel orderId={orderId} customerName={customerName} />
    </div>
  );
}
