// 승인 단계 진행: 원장님 승인 → (사전심의 대상이면) 심의필 번호 → 게시 완료(URL). 관문 규칙은 lib/shared/workflow.ts.
import { getClinic, handle, HttpError } from "@/lib/server/core";
import { getPost, saveApproval } from "@/lib/server/posts";
import { gate, type Stage } from "@/lib/shared/workflow";

type Ctx = { params: Promise<{ id: string }> };
type Body = { rel?: string; to?: Stage | "reset"; by?: string; reviewNo?: string; url?: string; note?: string };

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const b = (await req.json()) as Body;
  if (!b.rel || !b.to) throw new HttpError(400, "원고와 단계가 필요합니다");
  const clinic = getClinic(id);
  const post = getPost(id, b.rel);
  const a = post.approval;
  const now = new Date().toISOString();

  if (b.to === "reset") {
    a.stage = a.check?.ok && a.check.hash === post.hash ? "checked" : "draft";
    delete a.approvedBy; delete a.approvedAt; delete a.approvedHash; delete a.reviewNo; delete a.reviewAt;
    a.history.push({ at: now, action: "승인 취소", note: b.note });
  } else {
    const blocked = gate(post, b.to);
    if (blocked) throw new HttpError(409, blocked);
    if (b.to === "approved") {
      if (!b.by?.trim()) throw new HttpError(400, "승인한 사람을 적어 주세요");
      Object.assign(a, { stage: "approved", approvedBy: b.by.trim(), approvedAt: now, approvedHash: post.hash });
      a.history.push({ at: now, action: "원장님 승인", note: b.by.trim() });
    } else if (b.to === "reviewed") {
      if (!b.reviewNo?.trim()) throw new HttpError(400, "심의필 번호를 적어 주세요");
      Object.assign(a, { stage: "reviewed", reviewNo: b.reviewNo.trim(), reviewAt: now });
      a.history.push({ at: now, action: "심의 완료", note: b.reviewNo.trim() });
    } else if (b.to === "published") {
      const url = b.url?.trim() || "";
      if (!/^https?:\/\//.test(url)) throw new HttpError(400, "게시한 글 주소(https://…)를 적어 주세요");
      Object.assign(a, { stage: "published", postedUrl: url, postedAt: now });
      a.history.push({ at: now, action: "게시 완료", note: url });
    } else {
      throw new HttpError(400, "알 수 없는 단계");
    }
  }
  saveApproval(clinic.dir, b.rel, a);
  return Response.json(a);
});
