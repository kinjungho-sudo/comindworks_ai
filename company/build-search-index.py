#!/usr/bin/env python3
"""Build a simple JSON search index for CoMind Works company markdown files."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path('/Users/macmini/Downloads/comindworks_ai/company')
OUT = ROOT / 'search-index.json'
INCLUDE_DIRS = ['01_daily','02_meetings','03_decisions','04_files','05_improvements','06_approvals','07_automations','09_DR']


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith('---\n'):
        return {}, text
    end = text.find('\n---\n', 4)
    if end == -1:
        return {}, text
    raw = text[4:end]
    body = text[end+5:]
    meta = {}
    current_key = None
    for line in raw.splitlines():
        if not line.strip():
            continue
        if re.match(r'^[A-Za-z_][\w-]*:', line):
            k, v = line.split(':', 1)
            current_key = k.strip()
            v = v.strip()
            if v:
                meta[current_key] = v
            else:
                meta[current_key] = []
        elif line.strip().startswith('- ') and current_key:
            if not isinstance(meta.get(current_key), list):
                meta[current_key] = [meta.get(current_key)] if meta.get(current_key) else []
            meta[current_key].append(line.strip()[2:].strip())
        elif current_key and line.startswith('  '):
            # keep nested yaml as plain searchable text
            meta[current_key] = (str(meta.get(current_key, '')) + ' ' + line.strip()).strip()
    return meta, body


def first_heading(body: str) -> str:
    for line in body.splitlines():
        if line.startswith('# '):
            return line[2:].strip()
    return ''


def main() -> int:
    docs = []
    for d in INCLUDE_DIRS:
        base = ROOT / d
        if not base.exists():
            continue
        for p in base.rglob('*.md'):
            if p.name.endswith('-template.md') or p.name.endswith('template.md'):
                continue
            text = p.read_text(encoding='utf-8', errors='ignore')
            meta, body = parse_frontmatter(text)
            title = meta.get('title') or first_heading(body) or p.stem
            searchable_parts = [p.name, str(title), body]
            for key in ['aliases','keywords','participants','related_project','type','date','slug','source']:
                val = meta.get(key)
                if isinstance(val, list):
                    searchable_parts.extend(map(str, val))
                elif val:
                    searchable_parts.append(str(val))
            docs.append({
                'path': str(p),
                'relative_path': str(p.relative_to(ROOT)),
                'title': title,
                'type': meta.get('type') or d,
                'date': meta.get('date'),
                'aliases': meta.get('aliases', []),
                'keywords': meta.get('keywords', []),
                'participants': meta.get('participants', []),
                'search_text': '\n'.join(searchable_parts)[:50000],
            })
    OUT.write_text(json.dumps({'root': str(ROOT), 'count': len(docs), 'docs': docs}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'wrote {OUT} docs={len(docs)}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
