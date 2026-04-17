"use client";

import { useState } from "react";

interface CollectFormProps {
  onSubmit: (type: string, content: string) => void;
  isLoading: boolean;
}

type TabType = "url" | "text" | "file";

const TABS: { id: TabType; label: string; placeholder: string }[] = [
  {
    id: "url",
    label: "URL",
    placeholder: "https://example.com/article",
  },
  {
    id: "text",
    label: "텍스트",
    placeholder: "수집할 텍스트 내용을 입력하세요...",
  },
  {
    id: "file",
    label: "파일",
    placeholder: "파일 경로 또는 내용을 입력하세요...",
  },
];

export default function CollectForm({ onSubmit, isLoading }: CollectFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>("url");
  const [content, setContent] = useState("");

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setContent("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isLoading) return;
    onSubmit(activeTab, content.trim());
  };

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="w-full rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-xl">
      {/* 탭 전환 */}
      <div className="flex gap-1 mb-6 bg-zinc-800 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-indigo-500 text-white shadow-md"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {activeTab === "text" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={currentTab.placeholder}
            rows={5}
            disabled={isLoading}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        ) : (
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={currentTab.placeholder}
            disabled={isLoading}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}

        <button
          type="submit"
          disabled={isLoading || !content.trim()}
          className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold rounded-xl py-3 px-6 text-sm transition-all duration-200 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              처리 중...
            </>
          ) : (
            "수집 시작"
          )}
        </button>
      </form>
    </div>
  );
}
