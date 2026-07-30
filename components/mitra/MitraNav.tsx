import Link from "next/link";
import { formatRupiah } from "@/lib/services";

export default function MitraNav({
  mitraName,
  walletBalance,
}: {
  mitraName: string;
  walletBalance: number;
}) {
  return (
    <header className="border-b border-line bg-bay-deep">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/mitra" className="font-display text-lg font-bold text-white">
          kerjaku<span className="text-bridge">.click</span>{" "}
          <span className="text-sm font-normal text-white/50">Mitra</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-white/50">{mitraName}</p>
            <p className="font-display text-sm font-semibold text-bridge">
              {formatRupiah(walletBalance)}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
