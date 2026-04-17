"use client";

interface RecentItem {
  slug: string;
  title: string;
  category?: string;
  timestamp?: string; // ISO date string
}

interface RecentListProps {
  items: RecentItem[];
}

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";

  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "방금";
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins}분 전`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}시간 전`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return `${days}일 전`;
}

const CATEGORY_COLORS: Record<string, string> = {
  AI: "bg-indigo-500/20 text-indigo-300",
  자동화: "bg-violet-500/20 text-violet-300",
  비즈니스: "bg-emerald-500/20 text-emerald-300",
  개발: "bg-sky-500/20 text-sky-300",
  나: "bg-amber-500/20 text-amber-300",
};

function getCategoryColor(category?: string): string {
  if (!category) return "bg-zinc-700/50 text-zinc-400";
  return CATEGORY_COLORS[category] ?? "bg-zinc-700/50 text-zinc-400";
}

export default function RecentList({ items }: RecentListProps) {
  const displayItems = items.slice(0, 5);

  if (displayItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-zinc-500 text-sm">
        아직 수집한 항목이 없습니다
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {displayItems.map((item) => {
        const relTime = formatRelativeTime(item.timestamp);
        return (
          <li
            key={item.slug}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 transition-colors group"
          >
            {/* Bullet */}
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 group-hover:bg-indigo-400 transition-colors" />

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate leading-snug">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.category && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${getCategoryColor(item.category)}`}
                  >
                    {item.category}
                  </span>
                )}
                {relTime && (
                  <span className="text-[11px] text-zinc-500">{relTime}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
