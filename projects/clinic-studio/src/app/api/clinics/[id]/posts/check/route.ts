// 발행 전 점검: final_check.py --json (의료광고 → GEO → 출처). 결과를 승인 기록에 남긴다.
import path from "node:path";
import { ENGINES, getClinic, handle, HttpError, parseJsonOutput, runPython } from "@/lib/server/core";
import { getPost, saveApproval } from "@/lib/server/posts";

type Ctx = { params: Promise<{ id: string }> };

type FinalCheck = {
  ok: boolean;
  gates: { name: string; ok: boolean; detail: string }[];
  report: string;
  sheet: string;
  [k: string]: unknown;
};

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const { rel } = (await req.json()) as { rel?: string };
  if (!rel) throw new HttpError(400, "원고 경로가 없습니다");
  const clinic = getClinic(id);
  const post = getPost(id, rel);
  const r = await runPython(ENGINES.finalCheck, [rel, "--project", ".", "--json"], { cwd: clinic.dir, timeoutMs: 240_000 });
  const result = parseJsonOutput<FinalCheck>(r, "발행 전 점검");
  const now = new Date().toISOString();
  const a = post.approval;
  const summary = result.gates.map((g) => `${g.name.replace(/^\d\.\s*/, "")} ${g.ok ? "통과" : "미달"}`).join(" · ");
  a.check = {
    at: now,
    ok: result.ok,
    hash: post.hash,
    summary,
    report: path.relative(clinic.dir, path.resolve(clinic.dir, result.report)),
    sheet: path.relative(clinic.dir, path.resolve(clinic.dir, result.sheet)),
  };
  // 점검을 다시 하면 승인·심의는 처음부터 (원고가 바뀌었을 수 있으므로). 게시 완료 기록은 지우지 않는다.
  if (a.stage !== "published") a.stage = result.ok ? "checked" : "draft";
  a.history.push({ at: now, action: result.ok ? "점검 통과" : "점검 미달", note: summary });
  saveApproval(clinic.dir, rel, a);
  return Response.json({ result, approval: a });
});
