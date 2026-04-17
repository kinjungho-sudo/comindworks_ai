"use client";

import { useEffect, useState } from "react";
import RecentList from "./RecentList";

interface DashboardData {
  total: number;
  this_week: number;
  expiring: number;
  conflicts: number;
  categories: Record<string, number>;
  recent: Array<{ slug: string; title: string }>;
}

interface StatCard {
  label: string;
  value: number;
  icon: string;
  accent: string;
}

function StatCardItem({ label, value, icon, accent }: StatCard) {
  return (
    <div className="bg-zinc-800 rounded-2xl p-5 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors">
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
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-xs text-zinc-400 tabular-nums text-right">
        {count}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
    fetch(`${apiBase}/api/dashboard`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DashboardData>;
      })
      .then((json) => {
        setData(json);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm">대시보드 불러오는 중…</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
        <div className="bg-zinc-800 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-red-400 text-sm font-medium mb-1">
            데이터를 불러오지 못했습니다
          </p>
          <p className="text-zinc-500 text-xs">{error ?? "데이터 없음"}</p>
        </div>
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      label: "전체 페이지",
      value: data.total,
      icon: "📚",
      accent: "text-white",
    },
    {
      label: "이번 주 추가",
      value: data.this_week,
      icon: "✨",
      accent: "text-indigo-400",
    },
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

  const categoryEntries = Object.entries(data.categories).sort(
    ([, a], [, b]) => b - a
  );
  const maxCount = categoryEntries[0]?.[1] ?? 1;

  const recentWithTimestamp = data.recent.map((item) => ({
    ...item,
    category: undefined,
    timestamp: undefined,
  }));

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            📚 LLM Wiki 대시보드
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            내 자료 + 내 생각 + 내 일기가 쌓인 AI 도서관
          </p>
        </div>

        {/* Stats — 2×2 grid */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
            통계
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card) => (
              <StatCardItem key={card.label} {...card} />
            ))}
          </div>
        </section>

        {/* Category bar chart */}
        {categoryEntries.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              카테고리별
            </h2>
            <div className="bg-zinc-800 rounded-2xl p-5 border border-zinc-700/50 space-y-3">
              {categoryEntries.map(([cat, cnt]) => (
                <CategoryBar
                  key={cat}
                  category={cat}
                  count={cnt}
                  max={maxCount}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent items */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
            최근 추가
          </h2>
          <div className="bg-zinc-800 rounded-2xl border border-zinc-700/50 py-2">
            <RecentList items={recentWithTimestamp} />
          </div>
        </section>
      </div>
    </div>
  );
}
