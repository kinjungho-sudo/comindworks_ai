import Link from "next/link";
import OurPicker from "./OurPicker";
import type { Clinic } from "@/lib/data";

export default function Header({ clinic, date, hospitals, back }: { clinic: Clinic; date: string; hospitals: string[]; back?: { href: string; label: string } }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-[color-mix(in_srgb,var(--panel)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href={`/c/${clinic.id}?date=${date}`} className="text-base font-bold">시술가 시세</Link>
        <span className="mute text-sm">{clinic.area} · {date} 조사</span>
        {back && <Link href={back.href} className="fg2 text-sm underline underline-offset-2">← {back.label}</Link>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {clinic.dates.length > 1 && [...clinic.dates].reverse().slice(0, 5).map((d) => (
            <Link key={d} href={`?date=${d}`} className={`btn !px-3 !py-1 text-xs ${d === date ? "btn-on" : ""}`}>{d.slice(5)}</Link>
          ))}
          <OurPicker slug={clinic.id} hospitals={hospitals} />
        </div>
      </div>
    </header>
  );
}
