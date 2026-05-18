import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllWikiPages, getWikiPageBySlug } from "@/lib/wiki";
import WikiContent from "@/components/WikiContent";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const pages = getAllWikiPages();
  return pages.map((p) => ({ slug: encodeURIComponent(p.slug) }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = getWikiPageBySlug(decodeURIComponent(slug));
  if (!page) return { title: "Not Found | LLM Wiki" };
  return { title: `${page.title} | LLM Wiki` };
}

export default async function WikiDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getWikiPageBySlug(decodeURIComponent(slug));
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <Link
          href="/wiki"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          ← Wiki 목록
        </Link>
        <span className="text-sm font-black tracking-tight text-indigo-400 uppercase">
          LLM Wiki
        </span>
        <div className="w-24" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* 메타 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
              {page.category}
            </span>
            {page.created && (
              <span className="text-xs text-zinc-500">{String(page.created).slice(0, 10)}</span>
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white leading-snug mb-3">
            {page.title}
          </h1>
          {page.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {page.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          {page.source && page.source !== "직접입력" && (
            <p className="mt-3 text-xs text-zinc-600">
              출처:{" "}
              {page.source.startsWith("http") ? (
                <a
                  href={page.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:underline break-all"
                >
                  {page.source}
                </a>
              ) : (
                <span>{page.source}</span>
              )}
            </p>
          )}
        </div>

        <hr className="border-zinc-800 mb-8" />

        {/* 본문 — react-markdown으로 안전하게 렌더링 */}
        <WikiContent content={page.content} />
      </main>
    </div>
  );
}
