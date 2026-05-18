"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

// [[위키링크]] → `위키링크` 코드 표시로 변환
function preprocessMarkdown(md: string): string {
  return md.replace(/\[\[([^\]]+)\]\]/g, (_, p: string) => `\`${p}\``);
}

export default function WikiContent({ content }: Props) {
  return (
    <div className="prose prose-invert prose-zinc max-w-none
      prose-headings:font-black prose-headings:tracking-tight
      prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
      prose-p:text-zinc-300 prose-p:leading-relaxed
      prose-li:text-zinc-300
      prose-code:text-indigo-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-code:text-sm prose-code:font-mono
      prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700
      prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-white
      prose-table:text-sm prose-th:text-zinc-300 prose-td:text-zinc-400
      prose-hr:border-zinc-800
      prose-blockquote:border-indigo-500 prose-blockquote:text-zinc-400"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {preprocessMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
