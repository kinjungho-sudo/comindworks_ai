#!/usr/bin/env python3
"""참고 문헌 검사기 — 글에 단 출처가 진짜 있고, 적은 서지와 같고, 본문 인용 번호와 맞는지 확인한다.

사용:
    python3 cite_check.py <원고.md> [--json] [--sheet <대조표.md>] [--offline]

검사 항목
    C1  본문 [n]에 해당하는 참고 문헌이 있는가                 (없으면 block)
    C2  참고 문헌이 본문에서 한 번이라도 인용되는가             (안 되면 warn)
    C3  링크가 열리는가                                         (404·410이면 block, 사이트가 봇을 막으면 warn)
    C4  PubMed·PMC·DOI 문헌: 실제 제목·제1저자·연도가 적은 서지와 같은가 (다르면 block)
    C5  철회(retracted) 논문인가                                (철회면 block)
--sheet: 문헌마다 "그 문헌을 인용한 본문 문장 + 실제 초록"을 나란히 적은 대조표를 만든다.
         초록이 본문 주장을 실제로 받치는지는 사람(또는 심의 시뮬레이션 에이전트)이 이 표로 판단한다.

PubMed는 NCBI E-utilities(공개 API, 초당 3회 이하)로 조회한다. 개인 정보는 보내지 않는다.
종료 코드: block이 있으면 1.
"""
import difflib, html, json, re, sys, time, urllib.error, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

UA = "Mozilla/5.0 (compatible; CoMindWorks-CiteCheck/1.0; reference verification)"
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
TOOL = "tool=comindworks-citecheck"
REF_HEAD = re.compile(r"^(\*\*참고\s*문헌\*\*|#+\s*참고\s*문헌|\*\*출처\*\*|#+\s*출처)\s*$")
REF_LINE = re.compile(r"^\s*(\d+)\.\s+(.*)$")
LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
CITE = re.compile(r"\[(\d+(?:\s*[,–-]\s*\d+)*)\](?!\()")
_last = [0.0]


def http(url, accept=None, method="GET"):
    """(상태 코드, 최종 주소, 본문). 네트워크 실패는 상태 0."""
    wait = 0.4 - (time.time() - _last[0])
    if "ncbi.nlm.nih.gov" in url and wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, **({"Accept": accept} if accept else {})})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.geturl(), r.read(400_000).decode("utf-8", errors="ignore") if method == "GET" else ""
    except urllib.error.HTTPError as e:
        return e.code, url, ""
    except Exception as e:  # 타임아웃, DNS 등
        return 0, url, str(e)


def norm(s):
    return re.sub(r"[^0-9a-z가-힣]+", " ", html.unescape(s).lower()).strip()


def split_doc(text):
    lines = text.splitlines()
    start = 0
    if text.startswith("---"):
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                start = i + 1
                break
    ref_at = next((i for i in range(start, len(lines)) if REF_HEAD.match(lines[i].strip())), len(lines))
    return lines, start, ref_at


def parse_refs(lines, ref_at):
    refs = {}
    for i in range(ref_at + 1, len(lines)):
        m = REF_LINE.match(lines[i])
        if not m:
            if refs and lines[i].strip().startswith(("※", "---", "#")):
                break
            continue
        n, body = int(m.group(1)), m.group(2)
        lk = LINK.search(body)
        refs[n] = {"n": n, "line": i + 1, "text": lk.group(1) if lk else body, "url": lk.group(2) if lk else ""}
    return refs


def expand(token):
    nums = []
    for part in re.split(r"\s*,\s*", token):
        a = re.split(r"\s*[–-]\s*", part)
        nums += list(range(int(a[0]), int(a[-1]) + 1)) if len(a) == 2 else [int(a[0])]
    return nums


def cited_sentences(lines, start, ref_at):
    """번호 → [(행, 문장)]."""
    out = {}
    for i in range(start, ref_at):
        line = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", lines[i])
        for sent in re.split(r"(?<=[.?!])\s+(?=\S)", line):
            for m in CITE.finditer(sent):
                clean = re.sub(r"\s+", " ", CITE.sub("", re.sub(r"[*>#|]", " ", sent))).strip()
                for n in expand(m.group(1)):
                    if (i + 1, clean) not in out.setdefault(n, []):
                        out[n].append((i + 1, clean))
    return out


CLAIM = re.compile(r"\d|효과|부작용|연구|보고|원인|위험|개선|감소|증가|줄어|늘어|도움|예방|악화|흔해|드물|생길\s*수|나타날\s*수|유지|회복|재발|자극|염증|색소|콜라겐|피지|호르몬|자외선")
SKIP = re.compile(r"^(#|!\[|>\s*\*\*작성|\||-{3,}|※)|원장님 확인|추후 기입|개인에 따라|진단이나 치료를 대신|AI의 도움|AI로 만든")


def uncited_claims(lines, start, ref_at):
    """인용 번호 없이 의학 사실을 말하는 문장 [(행, 문장)]. 근거 없는 주장 후보."""
    out = []
    for i in range(start, ref_at):
        raw = lines[i].strip()
        if not raw or SKIP.search(raw):
            continue
        line = re.sub(r"!\[[^\]]*\]\([^)]*\)|\[([^\]]+)\]\(https?://[^)]+\)", r"\1", raw)
        for sent in re.split(r"(?<=[.?!])\s+(?=\S)", line):
            sent = re.sub(r"\s+", " ", re.sub(r"[*>#]|^\s*[-\d]+[.)]\s", " ", sent)).strip()
            if len(sent) >= 15 and not CITE.search(sent) and CLAIM.search(sent) and not sent.endswith("?"):
                out.append((i + 1, sent))
    return out


def ids_from_url(url):
    m = re.search(r"pubmed\.ncbi\.nlm\.nih\.gov/(\d+)", url)
    if m:
        return {"pmid": m.group(1)}
    m = re.search(r"(PMC\d+)", url)
    if m:
        return {"pmc": m.group(1)}
    m = re.search(r"doi\.org/(10\.[^\s?#]+)", url)
    if m:
        return {"doi": m.group(1)}
    return {}


def pmc_to_pmid(pmc):
    st, _, body = http(f"{EUTILS}/esummary.fcgi?db=pmc&id={pmc[3:]}&retmode=json&{TOOL}")
    try:
        r = json.loads(body)["result"][pmc[3:]]
        return next((a["value"] for a in r.get("articleids", []) if a["idtype"] == "pmid"), None)
    except Exception:
        return None


def doi_to_pmid(doi):
    st, _, body = http(f"{EUTILS}/esearch.fcgi?db=pubmed&term={urllib.request.quote(doi)}[doi]&retmode=json&{TOOL}")
    try:
        ids = json.loads(body)["esearchresult"]["idlist"]
        return ids[0] if len(ids) == 1 else None
    except Exception:
        return None


def pubmed_meta(pmid):
    st, _, body = http(f"{EUTILS}/esummary.fcgi?db=pubmed&id={pmid}&retmode=json&{TOOL}")
    if st != 200:
        return None
    try:
        r = json.loads(body)["result"][pmid]
    except Exception:
        return None
    if "error" in r:
        return None
    return {"pmid": pmid, "title": r.get("title", "").strip().strip('"'), "journal": r.get("source", ""),
            "year": (re.search(r"\d{4}", r.get("pubdate", "")) or [""])[0],
            "first_author": (r.get("authors") or [{}])[0].get("name", ""),
            "pubtype": r.get("pubtype", [])}


def pubmed_abstract(pmid):
    st, _, body = http(f"{EUTILS}/efetch.fcgi?db=pubmed&id={pmid}&retmode=xml&{TOOL}")
    try:
        root = ET.fromstring(body)
    except Exception:
        return ""
    parts = []
    for a in root.iter("AbstractText"):
        label = a.get("Label")
        txt = "".join(a.itertext()).strip()
        parts.append(f"{label}: {txt}" if label else txt)
    return "\n".join(parts)


def compare(ref_text, meta):
    """적은 서지와 실제 메타데이터 비교 → 문제 목록."""
    probs = []
    rt, title = norm(ref_text), norm(meta["title"])
    words = [w for w in title.split() if len(w) > 2]
    hit = sum(w in rt for w in words) / max(len(words), 1)
    ratio = difflib.SequenceMatcher(None, title, rt).find_longest_match(0, len(title), 0, len(rt)).size / max(len(title), 1)
    if hit < 0.75 and ratio < 0.6:
        probs.append(f"제목 불일치 — 실제: {meta['title']}")
    last = norm(meta["first_author"]).split(" ")[0] if meta["first_author"] else ""
    if last and last not in rt:
        probs.append(f"제1저자 불일치 — 실제: {meta['first_author']}")
    if meta["year"] and meta["year"] not in ref_text:
        probs.append(f"연도 불일치 — 실제: {meta['year']}")
    return probs


def check(path, offline=False, want_abstract=False):
    text = Path(path).read_text(encoding="utf-8")
    lines, start, ref_at = split_doc(text)
    refs = parse_refs(lines, ref_at)
    cites = cited_sentences(lines, start, ref_at)
    findings = []
    card = bool(re.search(r'^format:\s*"?card', text, re.M))  # 카드형: 본문 번호 인용 없이 글 끝에 문헌만 둔다

    def add(sev, cid, n, msg):
        findings.append({"severity": sev, "id": cid, "ref": n, "message": msg})

    if not refs:
        add("warn", "C0", None, "참고 문헌 섹션이 없음 (근거 문헌 없이 의학 정보를 쓰지 않는다)")
    for n in sorted(cites):
        if n not in refs:
            add("block", "C1", n, f"본문 [{n}]에 해당하는 참고 문헌이 없음 ({cites[n][0][0]}행)")
    for n, r in sorted(refs.items()):
        r["cited_by"] = cites.get(n, [])
        if not r["cited_by"] and not card:
            add("warn", "C2", n, "본문에서 인용하지 않은 참고 문헌")
        if not r["url"]:
            add("warn", "C3", n, "링크 없음 — 독자와 심의자가 원문을 확인할 수 없음")
        if offline or not r["url"]:
            continue
        ids = ids_from_url(r["url"])
        pmid = ids.get("pmid") or (pmc_to_pmid(ids["pmc"]) if "pmc" in ids else None) or \
            (doi_to_pmid(ids["doi"]) if "doi" in ids else None)
        if ids and not pmid and "doi" not in ids and "pmc" not in ids:
            pmid = None
        if pmid:
            meta = pubmed_meta(pmid)
            if not meta:
                r["status"] = "PubMed 없음"
                add("block", "C4", n, f"PubMed {pmid}가 존재하지 않음")
                continue
            r["meta"] = meta
            for p in compare(r["text"], meta):
                add("block", "C4", n, p)
            if any("Retract" in t for t in meta["pubtype"]) or meta["title"].lower().startswith("retracted"):
                add("block", "C5", n, "철회된 논문 (Retracted Publication)")
            if want_abstract:
                r["abstract"] = pubmed_abstract(pmid)
            r["status"] = "PubMed 확인"
            continue
        st, final, _ = http(r["url"])
        r["status"] = f"HTTP {st}" if st else "접속 실패"
        if st in (404, 410):
            add("block", "C3", n, f"링크가 없는 페이지 (HTTP {st})")
        elif st == 0 or st >= 400:
            add("warn", "C3", n, f"자동으로 열리지 않음 ({r['status']}) — 사이트가 봇을 막는 경우가 많으니 브라우저로 확인")
    claims = uncited_claims(lines, start, ref_at)
    if claims and not card:
        add("warn", "C6", None, f"인용 번호 없는 의학 주장 {len(claims)}문장 — 대조표 끝에서 출처를 달거나 지운다")
    return {"file": str(path), "refs": refs, "findings": findings, "uncited": claims, "card": card,
            "block": sum(f["severity"] == "block" for f in findings),
            "warn": sum(f["severity"] == "warn" for f in findings)}


def sheet(result):
    out = [f"# 출처 대조표 — {Path(result['file']).name}\n",
           "_문헌마다 그 문헌을 인용한 본문 문장과 실제 초록을 나란히 놓았다. "
           "각 문장 앞 칸에 판정을 적는다: ✅ 초록·원문이 받침 / ⚠️ 일부만 받침(표현 낮추기) / ❌ 받치지 않음(문장 삭제나 다른 문헌). "
           "초록에 없는 내용은 원문 본문을 열어 확인한다._\n"]
    for n, r in sorted(result["refs"].items()):
        meta = r.get("meta")
        out.append(f"## [{n}] {r['text']}\n")
        out.append(f"- 링크: {r['url'] or '없음'} · 상태: {r.get('status', '미확인')}")
        if meta:
            out.append(f"- 실제 서지: {meta['first_author']} · {meta['title']} · {meta['journal']} {meta['year']} · "
                       f"유형 {', '.join(meta['pubtype'])}")
        probs = [f["message"] for f in result["findings"] if f["ref"] == n]
        if probs:
            out.append("- **문제:** " + " / ".join(probs))
        out.append("\n**이 문헌을 인용한 본문 문장**\n")
        out += [f"- [ ] ({ln}행) {s}" for ln, s in r.get("cited_by", [])] or ["- (없음)"]
        if r.get("abstract"):
            ab = r["abstract"] if len(r["abstract"]) < 2500 else r["abstract"][:2500] + " …"
            out.append("\n**초록 (PubMed)**\n\n> " + ab.replace("\n", "\n> "))
        elif meta is None:
            out.append("\n_논문 DB 문헌이 아니라 초록을 자동으로 가져오지 않았다. 링크를 열어 해당 내용을 확인한다._")
        out.append("")
    claims = result.get("uncited", [])
    if claims:
        out.append("## 인용 번호 없는 의학 주장\n")
        out.append("_카드형 글은 본문에 번호를 달지 않으므로 이 문장들을 위 문헌 중 어디서 받치는지 직접 짝지어 확인한다. "
                   "글 끝 참고 문헌 어디에도 근거가 없으면 문장을 지우거나 문헌을 추가한다._\n" if result.get("card") else
                   "_번호를 단 글인데 출처 없이 의학 사실을 말하는 문장이다. 출처 번호를 달거나, 일반 상식이면 그대로 둔다._\n")
        out += [f"- [ ] ({ln}행) {s} → 문헌: ___" for ln, s in claims]
        out.append("")
    return "\n".join(out) + "\n"


def report(result):
    print(f"\n== 참고 문헌 검사: {result['file']}")
    print(f"   결과: {'문제 있음 (block 수정 필요)' if result['block'] else '통과'}  |  "
          f"문헌 {len(result['refs'])}건 · block {result['block']} · warn {result['warn']}\n")
    for n, r in sorted(result["refs"].items()):
        mark = "✗" if any(f["ref"] == n and f["severity"] == "block" for f in result["findings"]) else "·"
        print(f" {mark} [{n:>2}] {r.get('status', '오프라인'):<12} 인용 {len(r.get('cited_by', []))}곳  {r['text'][:70]}")
    if result["findings"]:
        print()
    for f in result["findings"]:
        tag = "BLOCK" if f["severity"] == "block" else "warn "
        print(f" [{tag}] {f['id']} {'[' + str(f['ref']) + '] ' if f['ref'] else ''}{f['message']}")
    print("\n ※ 이 검사는 '문헌이 실재하고 서지가 맞는지'까지다. 본문 주장을 문헌이 실제로 받치는지는 대조표로 확인한다.")


def main(argv):
    files = [a for a in argv if not a.startswith("--")]
    sheet_path = argv[argv.index("--sheet") + 1] if "--sheet" in argv else None
    if sheet_path in files:
        files.remove(sheet_path)
    if not files:
        print(__doc__)
        return 2
    res = check(files[0], offline="--offline" in argv, want_abstract=bool(sheet_path))
    if sheet_path:
        Path(sheet_path).parent.mkdir(parents=True, exist_ok=True)
        Path(sheet_path).write_text(sheet(res), encoding="utf-8")
    if "--json" in argv:
        res["refs"] = {str(k): v for k, v in res["refs"].items()}
        print(json.dumps(res, ensure_ascii=False, indent=1))
    else:
        report(res)
        if sheet_path:
            print(f" 대조표: {sheet_path}")
    return 1 if res["block"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
