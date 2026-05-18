import Link from "next/link";
import { getWikiStats } from "@/lib/wiki";
import RecentList from "@/components/RecentList";

export const metadata = {
  title: "Wiki 현황 대시보드 | LLM Wiki",
};

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: string;
  accent: string;
}) {
  return (
    <div className="bg-zinc-800 rounded-2xl p-5 border border-zinc-700/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
            {label}
          </p>
          <p className={`text-3xl font-black tabular-nums ${accent}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <span className="text-2xl opacity-70">{icon}</span>
      </div>
    </div>
  );
}

function CategoryBar({
  category,
  count,
  max,
}: {
  category: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-zinc-400 truncate text-right">
        {category}
      </span>
      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-xs text-zinc-400 tabular-nums text-right">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const data = getWikiStats();

  const statCards = [
    { label: "전체 페이지", value: data.total, icon: "📚", accent: "text-white" },
    { label: "이번 주 추가", value: data.this_week, icon: "✨", accent: "text-indigo-400" },
    {
      label: "만료 예정",
      value: data.expiring,
      icon: "⏰",
      accent: data.expiring > 0 ? "text-amber-400" : "text-white",
    },
    {
      label: "모순 감지",
      value: data.conflicts,
      icon: "⚠️",
      accent: data.conflicts > 0 ? "text-red-400" : "text-white",
    },
  ];

  const categoryEntries = Object.entries(data.categories).sort(([, a], [, b]) => b - a);
  const maxCount = categoryEntries[0]?.[1] ?? 1;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <Link
          href="/"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          ← 수집창으로
        </Link>
        <h1 className="text-sm font-black tracking-tight text-white">Wiki 현황 대시보드</h1>
        <Link
          href="/wiki"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          Wiki 목록 →
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">📚 LLM Wiki 대시보드</h1>
          <p className="text-zinc-500 text-sm mt-1">내 자료 + 내 생각 + 내 일기가 쌓인 AI 도서관</p>
        </div>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">통계</h2>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        {categoryEntries.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              카테고리별
            </h2>
            <div className="bg-zinc-800 rounded-2xl p-5 border border-zinc-700/50 space-y-3">
              {categoryEntries.map(([cat, cnt]) => (
                <CategoryBar key={cat} category={cat} count={cnt} max={maxCount} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
            최근 추가
          </h2>
          <div className="bg-zinc-800 rounded-2xl border border-zinc-700/50 py-2">
            <RecentList
              items={data.recent.map((r) => ({
                slug: r.slug,
                title: r.title,
                category: r.category,
              }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
