import Link from "next/link";
import Dashboard from "@/components/Dashboard";

export const metadata = {
  title: "Wiki 현황 대시보드 | LLM Wiki",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <Link
          href="/"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          ← 수집창으로
        </Link>
        <h1 className="text-sm font-black tracking-tight text-white">
          Wiki 현황 대시보드
        </h1>
        <div className="w-24" />
      </header>

      <Dashboard />
    </div>
  );
}
