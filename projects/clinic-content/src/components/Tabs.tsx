"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["posts", "원고 · 점검 · 승인"],
  ["prices", "시술가 시세 (내부)"],
] as const;

export default function Tabs({ clinic }: { clinic: string }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map(([seg, label]) => {
        const on = path.startsWith(`/c/${clinic}/${seg}`);
        return (
          <Link key={seg} href={`/c/${clinic}/${seg}`}
            className={`whitespace-nowrap px-3 py-2 text-sm ${on ? "border-b-2 border-[var(--accent)] font-semibold" : "mute"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
