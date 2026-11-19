#!/usr/bin/env python3
"""발행 전 마무리 점검 — 원고 한 편을 의료광고 → GEO → 출처 순서로 한 번에 검사하고 보고서 한 장을 만든다.

사용 (병원 폴더에서):
    python3 <스킬>/scripts/final_check.py output/<폴더>/<원고>.md [--project .] [--offline]

만드는 파일 (병원 폴더 docs/reviews/):
    <날짜>_<글 폴더>_final-check.md   판정·관문별 결과·사람이 할 일
    <날짜>_<글 폴더>_sources.md       출처 대조표 (본문 문장 ↔ 실제 초록)

관문
    1. 의료광고 검사 (medad_check)  block 0 이어야 통과
    2. GEO 점검 (geo_check)          85점 이상
    3. 출처 검사 (cite_check)        문헌 실재·서지 일치·인용 번호 일치, block 0
    4. 출처 대조표 판정              사람·심의 시뮬레이션이 표를 채운다 (자동 판정 안 함)
병원 폴더에 tools/medad_check.py·tools/geo_check.py가 있으면 그것을, 없으면 스킬의 것을 쓴다.
종료 코드: 자동 관문(1~3) 중 하나라도 미달이면 1.
"""
import json, re, subprocess, sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import cite_check  # noqa: E402

CHANNELS = {  # frontmatter platform → 사전심의 안내 (references/medical-ad-law.md 3장)
    "naver": "네이버 블로그 → **사전심의 대상** (의료법 제57조 제1항 제4호·시행령 제24조 제1항 제4호). 심의필 번호를 받아 글에 표기한 뒤 게시",
    "instagram": "인스타그램 → **사전심의 대상** (제57조 제1항 제5호·시행령 제24조 제2항)",
    "youtube": "유튜브 → **사전심의 대상** (제57조 제1항 제4·5호·시행령 제24조)",
    "homepage": "병원 자체 홈페이지 → 사전심의 대상 매체 아님. 제56조 금지 내용은 그대로 적용",
}


def tool(project, name):
    p = Path(project) / "tools" / name
    return (p, True) if p.is_file() else (HERE / name, False)


def run_json(cmd):
    out = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(out.stdout), out.returncode
    except json.JSONDecodeError:
        return None, out.returncode


def frontmatter(text):
    fm = {}
    if text.startswith("---"):
        for line in text[3:text.find("\n---", 3)].splitlines():
            m = re.match(r"(\w+):\s*\"?(.*?)\"?\s*$", line)
            if m:
                fm[m.group(1)] = m.group(2)
    return fm


def main(argv):
    files = [a for a in argv if not a.startswith("--")]
    project = argv[argv.index("--project") + 1] if "--project" in argv else "."
    if project in files:
        files.remove(project)
    if not files:
        print(__doc__)
        return 2
    post = Path(files[0])
    text = post.read_text(encoding="utf-8")
    fm = frontmatter(text)
    slug = post.stem if post.stem.upper() not in ("POSTING", "INDEX", "README") else post.parent.name
    today = date.today().isoformat()
    rev = Path(project) / "docs" / "reviews"
    rev.mkdir(parents=True, exist_ok=True)
    sheet_path = rev / f"{today}_{slug}_sources.md"
    report_path = rev / f"{today}_{slug}_final-check.md"

    # 1) 의료광고
    medad, local = tool(project, "medad_check.py")
    cmd = [sys.executable, str(medad), str(post), "--json"] + ([] if local else ["--project", project])
    md_json, _ = run_json(cmd)
    md_f = next(iter(md_json.values())) if md_json else []
    md_block = [f for f in md_f if f["severity"] == "block"]
    md_warn = [f for f in md_f if f["severity"] == "warn"]
    rules = json.loads((medad.parent / "medad_rules.json").read_text(encoding="utf-8"))

    # 2) GEO
    geo, _ = tool(project, "geo_check.py")
    g_json, _ = run_json([sys.executable, str(geo), str(post), "--json"])
    g = next(iter(g_json.values())) if g_json else {"score": 0, "items": []}
    g_miss = [i for i in g["items"] if not i["ok"]]

    # 3) 출처
    c = cite_check.check(post, offline="--offline" in argv, want_abstract=True)
    sheet_path.write_text(cite_check.sheet(c), encoding="utf-8")

    gates = [
        ("1. 의료광고 검사", not md_block, f"block {len(md_block)} · warn {len(md_warn)}"),
        ("2. GEO 점검", g["score"] >= 85, f"{g['score']}점 (85점 이상)"),
        ("3. 출처 검사", c["block"] == 0, f"문헌 {len(c['refs'])}건 · block {c['block']} · warn {c['warn']}"),
    ]
    ok = all(x[1] for x in gates)
    L = [f"# 발행 전 마무리 점검 — {fm.get('title', post.name)}\n",
         f"- 원고: `{post}` · 점검일 {today} · 채널 `{fm.get('platform', '미표기')}`",
         f"- 판정: **{'자동 관문 통과 → 대조표 판정·원장님 확인·사전심의로' if ok else '수정 필요 (아래 미달 관문부터)'}**\n",
         "| 관문 | 결과 | 내용 |", "|---|---|---|"]
    L += [f"| {n} | {'통과' if p else '**미달**'} | {d} |" for n, p, d in gates]
    L.append("| 4. 출처 대조표 판정 | 사람·에이전트 | " + f"`{sheet_path.name}`의 문장마다 ✅/⚠️/❌ |\n")

    L.append("## 1. 의료광고 검사\n")
    if not md_f:
        L.append("- 걸린 표현 없음\n")
    for f in md_block + md_warn:
        L.append(f"- **{'BLOCK' if f['severity'] == 'block' else 'warn'}** {f['line']}행 {f['title']} — `{f['excerpt']}`")
        L += [f"  - 조문: {t}" for t in f.get("cite_text", [])] or ([f"  - 근거: {f['law']}"] if f.get("law") else [])
    L.append("\n## 2. GEO 점검 미달 항목\n")
    L += [f"- {i['id']}: {i['detail']}" for i in g_miss] or ["- 없음"]
    L.append("\n## 3. 출처 검사\n")
    for n, r in sorted(c["refs"].items()):
        L.append(f"- [{n}] {r.get('status', '오프라인')} · 인용 {len(r.get('cited_by', []))}곳 · {r['text'][:90]}")
    L += [f"- **{f['severity'].upper()}** {f['id']} {('[' + str(f['ref']) + '] ') if f['ref'] else ''}{f['message']}"
          for f in c["findings"]]
    L.append(f"\n출처 대조표: [{sheet_path.name}]({sheet_path.name}) — 본문 문장과 실제 초록을 나란히 놓았다. "
             "❌가 하나라도 있으면 그 문장을 지우거나 다른 문헌을 찾는다.\n")
    L.append("## 4. 사람이 할 일\n")
    ch = CHANNELS.get(fm.get("platform", "").split("-")[0], "채널 미표기 → frontmatter `platform`에 naver·homepage 등을 적는다")
    L.append(f"- [ ] 사전심의: {ch}")
    L.append("- [ ] 출처 대조표의 모든 문장 판정 (심의 시뮬레이션 에이전트에 대조표를 함께 넘기면 된다)")
    markers = sorted(set(re.findall(r"\[원장님 확인:[^\]]*\]", text)))
    L += [f"- [ ] 원장님 확인: {m[8:-1].strip()}" for m in markers]
    L += [f"- [ ] {item}" for item in rules.get("manual_checklist", [])]
    L.append("\n_자동 검사는 1차 거름망이며 사전심의·법률 검토를 대신하지 않는다._")
    report_path.write_text("\n".join(L) + "\n", encoding="utf-8")

    print(f"\n== 발행 전 마무리 점검: {post}")
    for n, p, d in gates:
        print(f"   {'통과' if p else '미달'}  {n:<12} {d}")
    print(f"   판정: {'자동 관문 통과' if ok else '수정 필요'}  (원장님 확인 {len(markers)}곳 남음)")
    print(f"   보고서: {report_path}\n   대조표: {sheet_path}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
