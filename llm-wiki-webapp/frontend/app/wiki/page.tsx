import Link from "next/link";
import { getAllWikiPages } from "@/lib/wiki";

export const metadata = {
  title: "Wiki 목록 | LLM Wiki",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "AI에이전트": "🤖",
  "창업": "🚀",
  "자동화": "⚙️",
  "콘텐츠": "✍️",
  "개발": "💻",
  "독서노트": "📖",
  "좋은글": "✨",
  "리서치": "🔍",
  "나": "🙋",
  "성공": "🏆",
};

export default function WikiListPage() {
  const pages = getAllWikiPages();

  // 카테고리별 그룹핑
  const grouped: Record<string, typeof pages> = {};
  for (const page of pages) {
    if (!grouped[page.category]) grouped[page.category] = [];
    grouped[page.category].push(page);
  }

  const categoryOrder = ["AI에이전트", "창업", "자동화", "콘텐츠", "개발", "좋은글", "독서노트", "리서치", "나", "성공"];
  const sortedCategories = [
    ...categoryOrder.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <Link href="/" className="text-sm font-black tracking-tight text-indigo-400 uppercase">
          LLM Wiki
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800">
            대시보드
          </Link>
          <Link href="/wiki" className="text-xs font-semibold text-indigo-400 px-3 py-1.5 rounded-lg bg-indigo-500/10">
            Wiki 목록
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">Wiki 목록</h1>
          <p className="text-sm text-zinc-500">총 {pages.length}개 페이지</p>
        </div>

        <div className="space-y-10">
          {sortedCategories.map((category) => {
            const catPages = grouped[category];
            const emoji = CATEGORY_EMOJI[category] ?? "📄";
            return (
              <section key={category}>
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 pb-2 border-b border-zinc-800">
                  <span>{emoji}</span>
                  <span>{category}</span>
                  <span className="ml-1 text-zinc-600">({catPages.length})</span>
                </h2>
                <ul className="space-y-2">
                  {catPages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={`/wiki/${encodeURIComponent(page.slug)}`}
                        className="group flex items-start gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-800/60 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {page.title}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{page.excerpt}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {page.created && (
                            <span className="text-xs text-zinc-600">{page.created.slice(0, 10)}</span>
                          )}
                          {page.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs text-indigo-500/70 font-mono">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
