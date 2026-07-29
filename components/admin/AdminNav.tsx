import Link from "next/link";

export default function AdminNav({ adminName }: { adminName: string }) {
  return (
    <header className="border-b border-line bg-bay-deep">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="font-display text-lg font-bold text-white">
            kerjaku<span className="text-bridge">.click</span>{" "}
            <span className="text-sm font-normal text-white/50">Admin</span>
          </Link>
          <nav className="flex gap-5 text-sm font-medium text-white/80">
            <Link href="/admin" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/admin/mitra" className="hover:text-white">
              Mitra
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70">{adminName}</span>
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
