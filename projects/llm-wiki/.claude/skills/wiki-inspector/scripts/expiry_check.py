"""만료된 Wiki 페이지를 archived/ 폴더로 이동한다."""

import sys
import os
import shutil
import re
from datetime import date


def parse_expires(filepath: str) -> str | None:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    m = re.search(r"^expires:\s*(.+)$", content, re.MULTILINE)
    if not m:
        return None
    val = m.group(1).strip()
    return None if val == "never" else val


def archive_expired(wiki_dir: str, dry_run: bool = True) -> list[str]:
    today = date.today()
    archived = []
    archive_dir = os.path.join(wiki_dir, "기타", "archived")

    for root, _, files in os.walk(wiki_dir):
        if "archived" in root:
            continue
        for fname in files:
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(root, fname)
            expires_str = parse_expires(fpath)
            if not expires_str:
                continue
            try:
                exp_date = date.fromisoformat(expires_str)
                if exp_date < today:
                    if not dry_run:
                        os.makedirs(archive_dir, exist_ok=True)
                        shutil.move(fpath, os.path.join(archive_dir, fname))
                    archived.append(fpath)
            except ValueError:
                pass

    return archived


if __name__ == "__main__":
    wiki_dir = sys.argv[1] if len(sys.argv) > 1 else "wiki/wiki"
    dry_run = "--execute" not in sys.argv

    expired = archive_expired(wiki_dir, dry_run=dry_run)
    mode = "DRY RUN" if dry_run else "EXECUTED"

    if expired:
        print(f"[{mode}] 만료 페이지 {len(expired)}개:")
        for p in expired:
            print(f"  → {p}")
        if dry_run:
            print("\n실제 이동하려면 --execute 옵션 추가")
    else:
        print("만료된 페이지 없음")
