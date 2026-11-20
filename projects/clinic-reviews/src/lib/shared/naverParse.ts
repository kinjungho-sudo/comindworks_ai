// 네이버 플레이스(스마트플레이스) 리뷰 목록을 통째로 복사한 글자 → 리뷰 한 건씩으로 나누기.
// 붙여 넣기(방법 ①)와 "새 리뷰 가져오기" 버튼(방법 ②)이 같은 함수를 쓴다.
// 화면 구조가 바뀌면 틀릴 수 있으므로, 결과는 항상 미리보기 표에서 사람이 확인·수정한 뒤 저장한다.

export type ParsedReview = { date: string; author: string; text: string; reply: string; keywords: string[] };

// 리뷰가 아닌 화면 글자 (버튼·메뉴·통계)
const NOISE = new RegExp(
  "^(" +
    [
      "더보기", "접기", "펼치기", "팔로우", "팔로잉", "반응 남기기", "반응", "영수증", "예약", "결제내역", "주문",
      "답글 ?(쓰기|달기|등록|수정|삭제)?", "신고(하기)?", "수정", "삭제", "번역(보기)?", "원문 보기", "전체보기",
      "사진 ?\\d+(장)?", "리뷰 ?\\d+", "팔로워 ?\\d+", "\\d+번째 방문", "\\+\\d+", "이전", "다음", "공유", "저장",
      "방문자 ?리뷰.*", "블로그 ?리뷰.*", "최신순", "추천순", "내가 쓴 리뷰", "리뷰 관리", "답글 (안 단|미등록) 리뷰.*",
      "방문일", "작성일", "인증 수단", "방문 (인증|확인)", "재방문", "평일|주말", "(오전|오후|저녁|점심)(에 방문)?", "대기 시간 바로 입장|\\d+분 이내",
      "예약 후 이용|예약 없이 이용", "일상|친구|혼자|가족|연인", "목적", "동행", "더보기 ?›?", "›", "…",
    ].join("|") +
    ")$",
);
// 네이버 키워드 리뷰(자주 보이는 것). 리뷰 본문이 아니라 고르는 칩이라 따로 모은다.
const KEYWORD = /^(친절해요|설명을 잘해줘요|설명이 자세해요|시설이 깔끔해요|진료가 꼼꼼해요|꼼꼼해요|주차하기 편해요|대기시간이 짧아요|과잉진료가 없어요|치료 효과가 좋아요|효과가 좋아요|전문적이에요|상담이 자세해요|청결해요|인테리어가 멋져요|가격이 합리적이에요|재방문 의사 있어요|아프지 않게 해줘요|시술이 꼼꼼해요|위치가 좋아요|접근성이 좋아요|예약이 편해요|직원이 친절해요|원장님이 친절해요|매장이 청결해요|잘 알려줘요|만족스러워요)$/;
const DATE_RE = /^(?:(?:방문일|작성일|방문|작성)\s*)?(\d{2,4}\.)?\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(?:\(?[월화수목금토일]\)?(?:요일)?)?(?:\s*(?:방문|작성))?$/;
const REPLY_HEAD = /^(사장님|대표님|병원|업체)?\s*(답글|답변|댓글)(\s*\d{2,4}\.\d{1,2}\.\d{1,2}\.?.*)?$|^사장님$/;

export function parseDate(line: string, today = new Date()): string | null {
  const m = line.trim().match(DATE_RE);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let year: number;
  if (m[1]) {
    const y = Number(m[1].replace(".", ""));
    year = y < 100 ? 2000 + y : y;
  } else {
    // 연도가 없으면 올해, 오늘보다 미래면 작년
    year = today.getFullYear();
    if (month > today.getMonth() + 1 || (month === today.getMonth() + 1 && day > today.getDate())) year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function clean(lines: string[]) {
  return lines.map((l) => l.replace(/ /g, " ").replace(/\s+/g, " ").trim()).filter((l) => l && !NOISE.test(l));
}

/** 한 덩어리(리뷰 1건 후보)에서 작성자·본문·답글·키워드를 뽑는다 */
function digest(block: string[], datePos: "trail" | "lead"): Omit<ParsedReview, "date"> | null {
  const keywords: string[] = [];
  const body: string[] = [];
  const reply: string[] = [];
  let inReply = false;
  for (const l of block) {
    if (REPLY_HEAD.test(l)) { inReply = true; continue; }
    if (KEYWORD.test(l)) { keywords.push(l); continue; }
    (inReply ? reply : body).push(l);
  }
  if (!body.length) return null;
  // 작성자: 앞부분의 짧은 한 줄(닉네임). 본문이 한 줄뿐이면 작성자 없음으로 둔다.
  let author = "";
  if (body.length >= 2 && body[0].length <= 20 && !/[.!?。]$/.test(body[0])) author = body.shift()!;
  const text = body.join("\n").trim();
  if (text.length < 2) return null;
  void datePos;
  return { author, text, reply: reply.join("\n").trim(), keywords };
}

/**
 * 날짜 줄을 경계로 리뷰를 나눈다.
 * - 공개 화면: [닉네임, 본문, 키워드…, 방문일 날짜] → 날짜가 리뷰 "끝"
 * - 관리자 화면: [닉네임, 날짜, 본문, 답글…] → 날짜가 리뷰 "앞"
 * 첫 날짜 줄 앞에 본문이 있으면 "끝" 방식으로 본다.
 */
export function parseNaverText(raw: string, today = new Date()): ParsedReview[] {
  const lines = clean(raw.split(/\r?\n/));
  const dateIdx = lines.map((l, i) => (parseDate(l, today) ? i : -1)).filter((i) => i >= 0);
  if (!dateIdx.length) {
    // 날짜가 하나도 없으면 빈 줄로 나뉜 덩어리를 한 건씩 (날짜는 사람이 채움)
    return raw
      .split(/\n\s*\n/)
      .map((b) => digest(clean(b.split(/\r?\n/)), "trail"))
      .filter((x): x is Omit<ParsedReview, "date"> => x !== null)
      .map((x) => ({ ...x, date: "" }));
  }
  const firstContent = lines.slice(0, dateIdx[0]).filter((l) => !KEYWORD.test(l));
  const trail = firstContent.length >= 2; // 첫 날짜 앞에 닉네임+본문이 있으면 날짜가 끝
  const out: ParsedReview[] = [];
  if (trail) {
    let start = 0;
    for (const di of dateIdx) {
      const d = digest(lines.slice(start, di), "trail");
      if (d) out.push({ ...d, date: parseDate(lines[di], today)! });
      start = di + 1;
    }
  } else {
    for (let k = 0; k < dateIdx.length; k++) {
      const di = dateIdx[k];
      const next = k + 1 < dateIdx.length ? dateIdx[k + 1] : lines.length;
      // 관리자 화면은 날짜 바로 앞 줄이 닉네임인 경우가 많다 → 다음 리뷰의 닉네임은 다음 날짜 직전 줄
      const end = k + 1 < dateIdx.length ? next - 1 : next;
      const nick = di > 0 && !parseDate(lines[di - 1], today) && lines[di - 1].length <= 20 ? lines[di - 1] : "";
      const d = digest(lines.slice(di + 1, end), "lead");
      if (d) out.push({ ...d, author: nick || d.author, date: parseDate(lines[di], today)! });
    }
  }
  return out;
}
