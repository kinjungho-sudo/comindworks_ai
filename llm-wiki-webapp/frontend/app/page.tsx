"use client";

import { useState } from "react";
import Link from "next/link";
import CollectForm from "@/components/CollectForm";
import StatusStream from "@/components/StatusStream";
import RecentList from "@/components/RecentList";

type StepStatus = "pending" | "processing" | "done" | "error";

interface Step {
  step: string;
  status: StepStatus;
  message?: string;
  title?: string;
  category?: string;
  page?: string;
}

interface RecentItem {
  slug: string;
  title: string;
  category?: string;
  timestamp?: string;
}

const INITIAL_STEPS: Step[] = [
  { step: "scraping", status: "pending" },
  { step: "wiki_generate", status: "pending" },
  { step: "saving", status: "pending" },
  { step: "git_push", status: "pending" },
];

export default function HomePage() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [isLoading, setIsLoading] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  const handleSubmit = async (type: string, content: string) => {
    setIsLoading(true);
    setSteps(INITIAL_STEPS);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/collect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, content }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let completedItem: RecentItem | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as Step;
            setSteps((prev) =>
              prev.map((s) =>
                s.step === event.step
                  ? { ...s, ...event }
                  : s
              )
            );

            // 완료 이벤트에서 최근 항목 추가용 데이터 수집
            if (event.step === "complete" && event.status === "done" && event.title) {
              completedItem = {
                slug: event.page ?? content,
                title: event.title,
                category: event.category,
                timestamp: new Date().toISOString(),
              };
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }

      if (completedItem) {
        setRecentItems((prev) => [completedItem!, ...prev].slice(0, 10));
      }
    } catch (err) {
      console.error("수집 오류:", err);
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "processing" ? { ...s, status: "error" } : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const hasActivity = steps.some((s) => s.status !== "pending");

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <span className="text-sm font-black tracking-tight text-indigo-400 uppercase">
          LLM Wiki
        </span>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          대시보드 →
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 space-y-8">
        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white">
            LLM Wiki
          </h1>
          <p className="text-sm text-zinc-500">
            내 자료 + 내 생각 + 내 일기가 쌓이는 AI 도서관
          </p>
        </div>

        {/* Collect Form */}
        <CollectForm onSubmit={handleSubmit} isLoading={isLoading} />

        {/* Status Stream (활동 있을 때만 표시) */}
        {hasActivity && <StatusStream steps={steps} />}

        {/* Recent Items */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
            최근 수집
          </h2>
          <div className="rounded-2xl bg-zinc-900 border border-zinc-700 py-2">
            <RecentList items={recentItems} />
          </div>
        </section>
      </main>
    </div>
  );
}
