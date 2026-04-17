"use client";

interface Step {
  step: string;
  status: "pending" | "processing" | "done" | "error";
  page?: string;
  title?: string;
  category?: string;
  message?: string;
}

interface StatusStreamProps {
  steps: Step[];
}

const STEP_LABELS: Record<string, string> = {
  scraping: "스크래핑",
  wiki_generate: "Wiki 페이지 생성",
  saving: "저장 중",
  git_push: "Git push",
  complete: "완료",
};

function StatusIcon({ status }: { status: Step["status"] }) {
  if (status === "processing") {
    return (
      <svg
        className="animate-spin h-5 w-5 text-indigo-400 flex-shrink-0"
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
    );
  }

  if (status === "done") {
    return <span className="text-lg flex-shrink-0">✅</span>;
  }

  if (status === "error") {
    return <span className="text-lg flex-shrink-0">❌</span>;
  }

  // pending
  return (
    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
      <span className="w-4 h-4 rounded-full border-2 border-zinc-600 inline-block" />
    </span>
  );
}

function stepTextColor(status: Step["status"]): string {
  switch (status) {
    case "done":
      return "text-zinc-100";
    case "processing":
      return "text-indigo-300";
    case "error":
      return "text-red-400";
    default:
      return "text-zinc-500";
  }
}

export default function StatusStream({ steps }: StatusStreamProps) {
  if (steps.length === 0) return null;

  const completeStep = steps.find((s) => s.step === "complete" && s.status === "done");

  return (
    <div className="w-full rounded-2xl bg-zinc-800 border border-zinc-700 p-5 shadow-xl">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
        진행 상태
      </h2>

      <ol className="flex flex-col gap-3">
        {steps.map((step, idx) => (
          <li key={`${step.step}-${idx}`} className="flex items-start gap-3">
            <StatusIcon status={step.status} />

            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className={`text-sm font-semibold leading-tight ${stepTextColor(step.status)}`}
              >
                {STEP_LABELS[step.step] ?? step.step}
              </span>

              {step.message && (
                <span className="text-xs text-zinc-500 leading-snug truncate">
                  {step.message}
                </span>
              )}

              {step.page && step.status === "done" && (
                <span className="text-xs text-zinc-400 font-mono truncate">
                  {step.page}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {/* 완료 배너 */}
      {completeStep && (
        <div className="mt-5 rounded-xl bg-zinc-700/60 border border-zinc-600 px-4 py-3 flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">
            저장 완료
          </p>
          {completeStep.title && (
            <p className="text-sm font-semibold text-zinc-100 leading-snug">
              {completeStep.title}
            </p>
          )}
          {completeStep.category && (
            <p className="text-xs text-zinc-400">
              카테고리:{" "}
              <span className="text-indigo-300 font-medium">
                {completeStep.category}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
