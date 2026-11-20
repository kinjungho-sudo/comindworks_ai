import Link from "next/link";
import type { Clinic } from "@/lib/data";

export default function Header({ clinic, date, back }: { clinic: Clinic; date: string; back?: { href: string; label: string } }) {
  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href={`/c/${clinic.id}?date=${date}`} className="font-bold">시술가 시세</Link>
        <span className="mute text-sm">{clinic.label} · {clinic.area}</span>
        {back && <Link href={back.href} className="link text-sm">← {back.label}</Link>}
        <div className="ml-auto flex items-center gap-2">
          {clinic.dates.length > 1 && (
            <nav className="flex flex-wrap gap-1 text-sm" aria-label="조사일">
              {[...clinic.dates].reverse().slice(0, 6).map((d) => (
                <Link key={d} href={`?date=${d}`} className={`tag ${d === date ? "tag-info" : "tag-mute"}`}>{d}</Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
