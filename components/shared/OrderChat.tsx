// FILE BARU: components/shared/OrderChat.tsx
//
// Chat Pesanan in-app (Bagian 7.2 "Komunikasi Ter-mediasi" & 8.2 "Hybrid
// WA + In-App", migrasi 025_order_messages_trust_safety.sql). Dipakai oleh
// DUA sisi yang sama-sama Supabase Auth user (RLS di tabel order_messages
// sudah membatasi datanya masing-masing):
//   - components/mitra/TaskList.tsx (role="mitra")
//   - components/admin/OrdersFeed.tsx (role="admin")
// Sisi PELANGGAN TIDAK memakai komponen ini -- pelanggan bukan Supabase
// Auth user, jadi dia pakai components/OrderChatCustomer.tsx yang lewat
// app/api/customer/orders/[id]/messages/route.ts (service-role + polling).
//
// Kenapa realtime (bukan polling) di sini: mitra & admin sudah punya sesi
// Supabase Auth aktif dan RLS mengizinkan subscribe langsung ke perubahan
// order_messages milik order yang relevan -- pola yang sama persis dengan
// subscription "orders-live"/"invoices-live" yang sudah ada di
// OrdersFeed.tsx & TaskList.tsx.
//
// BARU (18 September 2026) -- fitur "Bagikan Lokasi" (migrasi
// 026_order_messages_location.sql): tombol "📍" di sebelah kotak teks,
// pakai Geolocation API browser (lib/location.ts) lalu insert baris chat
// dengan message_type='location' -- dirender sebagai kartu tautan Google
// Maps (components/shared/LocationMessageCard.tsx), bukan gelembung teks
// biasa.

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderMessage } from "@/lib/types";
import { LOCATION_MESSAGE_BODY, getBrowserLocation } from "@/lib/location";
import LocationMessageCard from "./LocationMessageCard";

const SENDER_LABEL: Record<OrderMessage["sender_type"], string> = {
  mitra: "Mitra",
  admin: "Admin",
  customer: "Klien",
  system: "Sistem",
};

export default function OrderChat({
  orderId,
  role,
  currentUserId,
  currentUserName,
  initialMessages = [],
}: {
  orderId: number;
  role: "mitra" | "admin";
  currentUserId: string;
  currentUserName: string;
  initialMessages?: OrderMessage[];
}) {
  const [messages, setMessages] = useState<OrderMessage[]>(initialMessages);
  const [loaded, setLoaded] = useState(initialMessages.length > 0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    if (!loaded) {
      supabase
        .from("order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) setMessages(data as OrderMessage[]);
          setLoaded(true);
        });
    }

    const channel = supabase
      .channel(`order-messages-${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const newRow = payload.new as OrderMessage;
          setMessages((prev) => (prev.some((m) => m.id === newRow.id) ? prev : [...prev, newRow]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /** Insert baris chat baru (teks ATAU lokasi) -- disatukan di sini supaya
   *  handleSend & handleShareLocation tidak duplikasi kode insert Supabase. */
  async function insertMessage(payload: {
    body: string;
    message_type: "text" | "location";
    location_lat?: number;
    location_lng?: number;
  }) {
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("order_messages")
      .insert({
        order_id: orderId,
        sender_type: role,
        sender_id: currentUserId,
        sender_name: currentUserName,
        body: payload.body,
        message_type: payload.message_type,
        location_lat: payload.location_lat ?? null,
        location_lng: payload.location_lng ?? null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as OrderMessage]));
    }
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await insertMessage({ body, message_type: "text" });
      setDraft("");
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
      await insertMessage({
        body: LOCATION_MESSAGE_BODY,
        message_type: "location",
        location_lat: lat,
        location_lng: lng,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membagikan lokasi.");
    } finally {
      setSharingLocation(false);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-line bg-paper">
      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {!loaded && <p className="text-xs text-ink/40">Memuat chat...</p>}
        {loaded && messages.length === 0 && (
          <p className="text-xs text-ink/40">
            Belum ada pesan. Gunakan chat ini untuk koordinasi jadwal & pertanyaan seputar pesanan
            ini.
          </p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_type === role && m.sender_id === currentUserId;
          const isSystem = m.sender_type === "system";
          if (isSystem) {
            return (
              <p key={m.id} className="text-center text-[11px] italic text-ink/40">
                {m.body}
              </p>
            );
          }
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${
                  isMine ? "bg-bay-deep text-white" : "bg-white text-ink border border-line"
                }`}
              >
                <p className={`mb-0.5 text-[10px] font-semibold ${isMine ? "text-white/70" : "text-ink/50"}`}>
                  {SENDER_LABEL[m.sender_type]} · {m.sender_name}
                </p>
                {m.message_type === "location" && m.location_lat !== null && m.location_lng !== null ? (
                  <LocationMessageCard lat={m.location_lat} lng={m.location_lng} tone={isMine ? "dark" : "light"} />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                )}
                <p className={`mt-0.5 text-[10px] ${isMine ? "text-white/50" : "text-ink/30"}`}>
                  {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-line p-2">
        <button
          type="button"
          onClick={handleShareLocation}
          disabled={sharingLocation}
          title="Bagikan lokasi Anda saat ini"
          className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-bay-light/10 disabled:opacity-50"
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
          className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-xs"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-lg bg-wa px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {sending ? "..." : "Kirim"}
        </button>
      </div>
      {error && <p className="px-2 pb-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
