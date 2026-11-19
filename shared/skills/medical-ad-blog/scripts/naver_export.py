#!/usr/bin/env python3
"""원고(.md)를 네이버 블로그 스마트에디터에 옮기기 좋은 묶음으로 내보낸다.

사용법: python3 naver_export.py <원고.md> [--out <폴더>]   (기본 출력: 원고 폴더/naver)

만드는 것:
  copy.html     스마트에디터에 붙여 넣을 본문. 사진 자리는 노란 상자로 표시
  preview.html  사진까지 들어간 미리보기(검토용)
  images/       올릴 순서대로 번호를 붙인 사진 (01_..., 02_...)
  POSTING.md    제목·태그·사진 순서·발행 전 확인 목록

발행은 하지 않는다. 자리표시([원장님 확인], [추후 기입])가 남아 있으면 POSTING.md 맨 위에 경고를 적는다.
"""
import html
import re
import shutil
import sys
from pathlib import Path

MARKER_RE = re.compile(r"\[(추후 기입|원장님 확인|의료진 확인)[^\]]*\]")
IMG_RE = re.compile(r"^!\[([^\]]*)\]\(([^)]+)\)\s*$")

CSS = """
body{max-width:720px;margin:24px auto;padding:0 16px;font-family:"Apple SD Gothic Neo","Noto Sans KR",sans-serif;
     font-size:16px;line-height:1.8;color:#222;background:#fff}
h2{font-size:21px;margin:36px 0 12px;padding-top:8px;border-top:1px solid #eee}
blockquote{margin:16px 0;padding:12px 16px;background:#FFF6EC;border-left:4px solid #E4572E}
blockquote p{margin:4px 0}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:15px}
th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
th{background:#FAF3EA}
.ph{background:#FFF07A;padding:0 4px}
.photo{margin:16px 0;padding:14px;border:2px dashed #E4A11B;background:#FFFBEA;text-align:center;font-weight:700}
.cap{color:#666;font-size:14px;text-align:center;margin-top:4px}
img{max-width:100%;display:block;margin:16px auto 4px}
.refs{font-size:14px}
hr{border:0;border-top:1px solid #ddd;margin:32px 0}
"""


def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)\*(?!\*)", r"<em>\1</em>", t)
    t = MARKER_RE.sub(lambda m: f'<span class="ph">{m.group(0)}</span>', t)
    return t


def parse(md_text):
    fm = {}
    body = md_text
    if md_text.startswith("---"):
        end = md_text.find("\n---", 3)
        for line in md_text[3:end].splitlines():
            m = re.match(r"(\w+):\s*(.*)$", line)
            if m:
                fm[m.group(1)] = m.group(2).strip().strip('"')
        body = md_text[end + 4:]
    return fm, body.strip("\n").splitlines()


def render(lines, photos, mode):
    out, i, n = [], 0, 0
    in_refs = False
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1
            continue
        if s.startswith("# "):           # 제목은 스마트에디터 제목 칸에 따로 넣는다
            i += 1
            continue
        if s.startswith("## "):
            out.append(f"<h2>{inline(s[3:])}</h2>")
            i += 1
            continue
        if s == "---":
            out.append("<hr>")
            i += 1
            continue
        m = IMG_RE.match(s)
        if m:
            n += 1
            alt, src = m.group(1), m.group(2)
            name = photos[n - 1][1]
            if mode == "copy":
                out.append(f'<div class="photo">[사진 {n} 올리기: {name}]</div>')
            else:
                out.append(f'<img src="images/{name}" alt="{html.escape(alt)}">')
            i += 1
            continue
        if s.startswith(">"):
            block = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                block.append(lines[i].strip()[1:].strip())
                i += 1
            parts, items = [], []
            for b in block:
                if b.startswith("- "):
                    items.append(f"<li>{inline(b[2:])}</li>")
                else:
                    if items:
                        parts.append("<ul>" + "".join(items) + "</ul>")
                        items = []
                    parts.append(f"<p>{inline(b)}</p>")
            if items:
                parts.append("<ul>" + "".join(items) + "</ul>")
            out.append("<blockquote>" + "".join(parts) + "</blockquote>")
            continue
        if s.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(lines[i].strip())
                i += 1
            cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows]
            head, data = cells[0], [r for r in cells[1:] if not re.match(r"^:?-+:?$", r[0])]
            t = "<table><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr>"
            for r in data:
                t += "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
            out.append(t + "</table>")
            continue
        if re.match(r"^(- |\d+\. )", s):
            ordered = bool(re.match(r"^\d+\. ", s))
            items = []
            while i < len(lines) and re.match(r"^(- |\d+\. )", lines[i].strip()):
                items.append(re.sub(r"^(- |\d+\. )", "", lines[i].strip()))
                i += 1
            tag = "ol" if ordered else "ul"
            cls = ' class="refs"' if in_refs else ""
            out.append(f"<{tag}{cls}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
            continue
        if s.startswith("*") and s.endswith("*") and not s.startswith("**"):
            out.append(f'<p class="cap">{inline(s)}</p>')
            i += 1
            continue
        if s.startswith("**참고 문헌**"):
            in_refs = True
        out.append(f"<p>{inline(s)}</p>")
        i += 1
    return "\n".join(out)


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    src = Path(args[0]).resolve()
    out = Path(argv[argv.index("--out") + 1]).resolve() if "--out" in argv else src.parent / "naver"
    fm, lines = parse(src.read_text(encoding="utf-8"))
    photos = []
    for line in lines:
        m = IMG_RE.match(line.strip())
        if m:
            p = (src.parent / m.group(2)).resolve()
            photos.append((p, f"{len(photos) + 1:02d}_{p.name}", m.group(1)))
    (out / "images").mkdir(parents=True, exist_ok=True)
    for p, name, _ in photos:
        if not p.is_file():
            print(f"사진이 없습니다: {p}", file=sys.stderr)
            return 2
        shutil.copy2(p, out / "images" / name)
    title = fm.get("title", src.stem)
    for mode, fname in (("copy", "copy.html"), ("preview", "preview.html")):
        body = render(lines, [(p, n) for p, n, _ in photos], mode)
        note = ("<p style='color:#B5462A;font-size:14px'>이 화면 전체를 복사해 스마트에디터 본문에 붙여 넣고, "
                "노란 점선 상자 자리에 같은 번호의 사진을 올린 뒤 상자 글자는 지우세요.</p>") if mode == "copy" else ""
        (out / fname).write_text(
            f"<!doctype html><html lang='ko'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            f"<title>{html.escape(title)}</title><style>{CSS}</style></head><body>{note}{body}</body></html>",
            encoding="utf-8")
    full_markers = [m.group(0) for m in MARKER_RE.finditer(src.read_text(encoding="utf-8"))]
    markers = list(dict.fromkeys(full_markers))
    tags = re.findall(r'"([^"]+)"', fm.get("tags", ""))
    lines_out = [f"# 네이버 게시 준비: {title}", ""]
    if full_markers:
        lines_out += [f"> **아직 발행하지 마세요.** 채워지지 않은 자리표시 {len(full_markers)}곳이 남아 있습니다. "
                      "원장님 확인을 받아 원고를 고친 뒤 이 묶음을 다시 만드세요.", ""]
    lines_out += ["## 1. 제목 칸", "", f"```\n{title}\n```", "",
                  "## 2. 본문", "", "`copy.html`을 브라우저로 열어 전체 선택 → 복사 → 스마트에디터 본문에 붙여 넣기.",
                  "붙여 넣은 뒤 표가 깨지지 않았는지, 굵은 글씨·인용 상자가 살아 있는지 확인하세요.", "",
                  "## 3. 사진 (순서대로)", ""]
    for _, name, alt in photos:
        lines_out.append(f"- `images/{name}` — 대체 텍스트(사진 설명): {alt}")
    lines_out += ["", "사진을 올린 뒤 사진 설명 칸에 위 대체 텍스트를 넣고, 사람 일러스트 아래 고지 문구가 그대로 있는지 확인하세요.",
                  "대표 사진(썸네일)은 1번 사진을 권합니다.", "",
                  "## 4. 태그", "", " ".join(f"#{t}" for t in tags), "",
                  "## 5. 발행 전 확인", "",
                  "- [ ] 자리표시([원장님 확인], [추후 기입])가 하나도 없다",
                  "- [ ] 의료광고 사전 검사 block 0 (원고 수정 후 다시 실행)",
                  "- [ ] 사전심의를 받았다 — 네이버 블로그는 심의 대상(의료법 제57조 제1항 제4호·시행령 제24조 제1항 제4호). 심의필 번호를 글에 표기했다",
                  "- [ ] 병원 실명·지점명이 본문·태그·사진 파일명에 없다 (실명 비공개 방침)",
                  "- [ ] 댓글·공감 설정과 카테고리를 확인했다",
                  "- [ ] 발행은 사람이 직접 누른다", ""]
    if markers:
        lines_out += ["## 남은 자리표시", ""] + [f"- {m}" for m in markers]
    (out / "POSTING.md").write_text("\n".join(lines_out) + "\n", encoding="utf-8")
    print(f"내보냄: {out}  (사진 {len(photos)}장, 자리표시 {len(full_markers)}곳)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
