// 네이버 리뷰 붙여 넣기 해석 시험 (가상 리뷰). 실행: node --test tests/
import assert from "node:assert/strict";
import test from "node:test";
import { parseDate, parseNaverText } from "../src/lib/shared/naverParse.ts";

const TODAY = new Date(2026, 10, 20); // 2026-11-20

test("날짜 읽기", () => {
  assert.equal(parseDate("11.18.화", TODAY), "2026-11-18");
  assert.equal(parseDate("방문일 2026.11.03.", TODAY), "2026-11-03");
  assert.equal(parseDate("24.12.31.화", TODAY), "2024-12-31");
  assert.equal(parseDate("12.25.목", TODAY), "2025-12-25"); // 올해 12월은 아직 안 옴 → 작년
  assert.equal(parseDate("친절해요", TODAY), null);
});

test("공개 화면 형식 (날짜가 리뷰 끝)", () => {
  const raw = `가상닉네임1
리뷰 12
사진 3
팔로우
원장님이 꼼꼼하게 봐 주셨어요.
다음에도 올게요
더보기
친절해요
진료가 꼼꼼해요
+2
방문일
11.18.화
2번째 방문
영수증
반응 남기기
가상닉네임2
리뷰 1
대기가 너무 길었어요
방문일
11.15.토
1번째 방문
영수증`;
  const r = parseNaverText(raw, TODAY);
  assert.equal(r.length, 2);
  assert.deepEqual(
    { a: r[0].author, d: r[0].date, t: r[0].text, k: r[0].keywords },
    { a: "가상닉네임1", d: "2026-11-18", t: "원장님이 꼼꼼하게 봐 주셨어요.\n다음에도 올게요", k: ["친절해요", "진료가 꼼꼼해요"] },
  );
  assert.equal(r[1].author, "가상닉네임2");
  assert.equal(r[1].text, "대기가 너무 길었어요");
  assert.equal(r[1].date, "2026-11-15");
});

test("관리자 화면 형식 (날짜가 앞, 사장님 답글 포함)", () => {
  const raw = `가상A
2026.11.19.
레이저 받고 물집이 생겼어요. 연락 부탁드려요
답글 쓰기
가상B
2026.11.17.
주차 되나요?
사장님 답글
문의 남겨 주셔서 감사합니다.
수정
삭제`;
  const r = parseNaverText(raw, TODAY);
  assert.equal(r.length, 2);
  assert.equal(r[0].author, "가상A");
  assert.equal(r[0].text, "레이저 받고 물집이 생겼어요. 연락 부탁드려요");
  assert.equal(r[0].reply, "");
  assert.equal(r[1].author, "가상B");
  assert.equal(r[1].text, "주차 되나요?");
  assert.equal(r[1].reply, "문의 남겨 주셔서 감사합니다.");
});

test("날짜가 없으면 빈 줄로 나눔", () => {
  const r = parseNaverText("가상C\n좋았어요 감사합니다\n\n가상D\n설명이 짧았어요", TODAY);
  assert.equal(r.length, 2);
  assert.equal(r[0].date, "");
  assert.equal(r[1].text, "설명이 짧았어요");
});
