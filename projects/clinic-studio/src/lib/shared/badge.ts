// 홈페이지 리뷰 배지: 리뷰 "원문"은 절대 넣지 않고, 채널별 평점·리뷰 수와 원래 페이지 링크만 보여 준다.
// 이유: 리뷰 원문을 병원 홈페이지에 싣는 것은 치료경험담 광고(의료법 제56조 제2항 제2호)가 될 수 있다.

export type Channel = { count?: number | null; rating?: number | null; url?: string };
export type Badge = {
  asOf: string; // 숫자를 확인한 날 (YYYY-MM-DD)
  naver: Channel; // 네이버 플레이스는 별점이 없어 리뷰 수만
  kakao: Channel;
  google: Channel;
  confirmed: { done: boolean; by?: string; at?: string; note?: string }; // 심의기구·법률 확인 여부
};

export const EMPTY_BADGE: Badge = { asOf: "", naver: {}, kakao: {}, google: {}, confirmed: { done: false } };

const HOSTS: Record<"naver" | "kakao" | "google", RegExp> = {
  naver: /^https:\/\/(m\.)?(map|place|pcmap)\.naver\.com\/|^https:\/\/naver\.me\//,
  kakao: /^https:\/\/(place\.)?map\.kakao\.com\/|^https:\/\/kko\.to\//,
  google: /^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.app\.goo\.gl\/|^https:\/\/g\.page\//,
};

export function validateBadge(b: Badge): string[] {
  const errs: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.asOf)) errs.push("기준일을 2026-11-20 형식으로 적어 주세요");
  for (const k of ["naver", "kakao", "google"] as const) {
    const c = b[k];
    if (c.url && !HOSTS[k].test(c.url)) errs.push(`${NAME[k]} 링크는 ${NAME[k]} 장소 페이지 주소여야 합니다`);
    if (c.count != null && (!Number.isInteger(c.count) || c.count < 0)) errs.push(`${NAME[k]} 리뷰 수는 0 이상 정수`);
    if (k !== "naver" && c.rating != null && (c.rating < 0 || c.rating > 5)) errs.push(`${NAME[k]} 평점은 0~5`);
    if (k === "naver" && c.rating != null) errs.push("네이버 플레이스는 별점이 없습니다(리뷰 수만)");
  }
  return errs;
}

export const NAME = { naver: "네이버", kakao: "카카오맵", google: "구글" } as const;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** 홈페이지에 그대로 붙여 넣는 HTML 조각 (외부 스크립트·글꼴 없음) */
export function badgeSnippet(b: Badge): string {
  const items = (["naver", "kakao", "google"] as const)
    .filter((k) => b[k].url && (b[k].count != null || b[k].rating != null))
    .map((k) => {
      const c = b[k];
      const parts = [
        c.rating != null ? `★ ${c.rating.toFixed(1)}` : "",
        c.count != null ? `리뷰 ${c.count.toLocaleString("ko-KR")}건` : "",
      ].filter(Boolean);
      return `<a class="cmw-rb-item" href="${esc(c.url!)}" target="_blank" rel="nofollow noopener noreferrer"><span class="cmw-rb-ch">${NAME[k]}</span><span class="cmw-rb-v">${parts.join(" · ")}</span><span class="cmw-rb-go">보기 ›</span></a>`;
    });
  if (!items.length) return "";
  return `<!-- 리뷰 배지 (clinic-studio 생성, ${esc(b.asOf)} 기준) — 리뷰 원문은 싣지 않음 -->
<div class="cmw-rb" role="group" aria-label="온라인 리뷰 현황">
<style>.cmw-rb{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:14px/1.4 -apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}.cmw-rb-item{display:inline-flex;gap:6px;align-items:center;padding:8px 12px;border:1px solid #ddd5cb;border-radius:999px;background:#fff;color:#2b2622;text-decoration:none}.cmw-rb-item:hover{border-color:#a8937b}.cmw-rb-ch{font-weight:700}.cmw-rb-go{color:#8a7c6d;font-size:12px}.cmw-rb-asof{color:#8a7c6d;font-size:12px}@media (prefers-color-scheme:dark){.cmw-rb-item{background:#221f1b;color:#ece6de;border-color:#3a342d}}</style>
${items.join("\n")}
<span class="cmw-rb-asof">${esc(b.asOf)} 기준 · 각 플랫폼에서 직접 확인하세요</span>
</div>`;
}
