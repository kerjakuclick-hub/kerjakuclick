type WhatsAppPreviewProps = {
  message: string;
  compact?: boolean;
};

export default function WhatsAppPreview({ message, compact = false }: WhatsAppPreviewProps) {
  const lines = message.split("\n");

  return (
    <div
      className={`w-full max-w-sm rounded-card border border-line bg-white shadow-card overflow-hidden ${
        compact ? "" : ""
      }`}
      aria-label="Pratinjau pesan WhatsApp yang akan terkirim"
    >
      <div className="flex items-center gap-2 bg-bay-deep px-4 py-3">
        <div className="h-8 w-8 rounded-full bg-wa/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-wa" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm0 18c-1.65 0-3.19-.47-4.5-1.28l-.32-.19-3 .79.8-2.93-.21-.3A7.94 7.94 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Kerjakuclick</p>
          <p className="text-[11px] text-white/70 leading-tight">Operator · online</p>
        </div>
      </div>

      <div className="bg-[#DDE8E4] px-4 py-5 min-h-[168px]">
        <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2.5 shadow-sm">
          <p className="font-mono text-[12.5px] leading-relaxed text-ink whitespace-pre-wrap break-words">
            {lines.map((line, i) => (
              <span key={i} className={i === 0 ? "font-semibold text-bay-deep" : ""}>
                {line}
                {i < lines.length - 1 ? "\n" : ""}
              </span>
            ))}
          </p>
          <p className="mt-1 text-right text-[10px] text-ink/40">terkirim ✓✓</p>
        </div>
      </div>
    </div>
  );
}
