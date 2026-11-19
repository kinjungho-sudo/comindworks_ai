// 답글 한 개 검사 (의료법 제19조·제27조 제3항·제56조) — review_care.py check-stdin
import path from "node:path";
import { ENGINES, handle, HttpError, parseJsonOutput, runPython } from "@/lib/server/core";

export const POST = handle(async (req: Request) => {
  const b = (await req.json()) as { text?: string; cat?: string };
  if (!b.text?.trim()) throw new HttpError(400, "답글이 비어 있습니다");
  const r = await runPython(ENGINES.reviewCare, ["check-stdin"], {
    cwd: path.dirname(ENGINES.reviewCare),
    input: JSON.stringify({ text: b.text, cat: b.cat }),
  });
  return Response.json(parseJsonOutput(r, "답글 검사"));
});
