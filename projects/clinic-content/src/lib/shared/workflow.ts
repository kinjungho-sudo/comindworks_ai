// 서버·화면 공용: 원고 승인 단계와 게시 관문 규칙.

export type Stage = "draft" | "checked" | "approved" | "reviewed" | "published";

export const STAGE_LABEL: Record<Stage, string> = {
  draft: "초안",
  checked: "점검 통과",
  approved: "원장님 승인",
  reviewed: "심의 완료",
  published: "게시 완료",
};

export type CheckRecord = { at: string; ok: boolean; hash: string; summary: string; report: string; sheet: string };

export type Approval = {
  stage: Stage;
  check?: CheckRecord;
  approvedBy?: string;
  approvedAt?: string;
  approvedHash?: string;
  reviewNo?: string; // 심의필 번호
  reviewAt?: string;
  postedUrl?: string;
  postedAt?: string;
  history: { at: string; action: string; note?: string }[];
};

export type Post = {
  rel: string; // 병원 폴더 기준 경로
  folder: string;
  title: string;
  platform: string;
  format: string;
  status: string;
  hash: string;
  markers: number;
  naverBundle: boolean;
  approval: Approval;
  stale: boolean; // 점검·승인 뒤 원고가 바뀜
};

/** 의료법 제57조 제1항·시행령 제24조: 이용자 10만 명 이상 매체(네이버·인스타·유튜브 등)는 사전심의 대상 */
export function needsPreReview(platform: string) {
  return /naver|insta|youtube|facebook|tiktok|kakao/i.test(platform);
}

export function channelNote(platform: string) {
  if (needsPreReview(platform)) return "사전심의 대상 매체 (의료법 제57조 제1항·시행령 제24조) — 심의필 번호가 있어야 게시";
  if (/homepage/i.test(platform)) return "병원 자체 홈페이지 — 사전심의 대상 아님 (제56조 금지 내용은 적용)";
  return "채널 미표기 — 원고 frontmatter에 platform을 적어 주세요";
}

/** 다음 단계로 갈 수 있는지와, 막힌 이유 */
export function gate(post: Pick<Post, "platform" | "hash" | "markers" | "approval">, to: Stage): string | null {
  const a = post.approval;
  if (to === "approved") {
    if (!a.check?.ok) return "발행 전 점검을 먼저 통과해야 합니다";
    if (a.check.hash !== post.hash) return "점검 뒤 원고가 바뀌었습니다. 다시 점검하세요";
    if (post.markers > 0) return `채워지지 않은 [원장님 확인] 자리표시가 ${post.markers}곳 남아 있습니다`;
  }
  if (to === "reviewed") {
    if (!needsPreReview(post.platform)) return "이 채널은 사전심의 대상이 아닙니다";
    if (a.stage !== "approved") return "원장님 승인 뒤에 심의 결과를 입력합니다";
    if (a.approvedHash !== post.hash) return "승인 뒤 원고가 바뀌었습니다. 다시 점검·승인하세요";
  }
  if (to === "published") {
    if (a.approvedHash !== post.hash) return "승인한 원고와 지금 원고가 다릅니다";
    if (needsPreReview(post.platform) && a.stage !== "reviewed") return "사전심의 대상 매체입니다. 심의필 번호를 먼저 입력하세요";
    if (!needsPreReview(post.platform) && a.stage !== "approved") return "원장님 승인이 먼저입니다";
  }
  return null;
}
