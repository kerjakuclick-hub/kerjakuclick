import { buildCsLink } from "@/lib/whatsapp";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="#" className="font-display text-xl font-bold tracking-tight">
          <span className="text-ink">kerjaku</span>
          <span className="text-bay-light">.click</span>
        </a>

        <a
          href={buildCsLink("Halo cs")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-wa px-4 py-2 font-body text-sm font-semibold text-white shadow-card transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bay-deep"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm0 18c-1.65 0-3.19-.47-4.5-1.28l-.32-.19-3 .79.8-2.93-.21-.3A7.94 7.94 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8Z" />
          </svg>
          Chat CS
        </a>
      </div>
    </header>
  );
}
