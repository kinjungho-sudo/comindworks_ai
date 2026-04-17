import subprocess
import os

WIKI_ROOT = os.environ.get(
    "WIKI_ROOT",
    os.path.join(os.path.dirname(__file__), "../../../../wiki")
)
REPO_ROOT = os.environ.get(
    "REPO_ROOT",
    os.path.join(os.path.dirname(__file__), "../../../..")
)


def git_push(title: str, category: str) -> bool:
    try:
        subprocess.run(["git", "add", "."], cwd=REPO_ROOT, check=True)
        subprocess.run(
            ["git", "commit", "-m", f"wiki: {category} - {title}"],
            cwd=REPO_ROOT,
            check=True,
        )
        subprocess.run(["git", "push", "origin", "master"], cwd=REPO_ROOT, check=True)
        return True
    except subprocess.CalledProcessError:
        return False
