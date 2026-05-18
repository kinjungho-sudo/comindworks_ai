import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Vercel 빌드 시 monorepo 루트 기준으로 wiki/ 폴더를 탐색
const WIKI_ROOT = path.join(process.cwd(), "..", "..", "wiki", "wiki");

export interface WikiPage {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  source: string;
  created: string;
  expires: string;
  type: string;
  excerpt: string;
}

export interface WikiPageDetail extends WikiPage {
  content: string; // raw markdown (react-markdown으로 렌더링)
}

function getCategoryDirs(): string[] {
  if (!fs.existsSync(WIKI_ROOT)) return [];
  return fs
    .readdirSync(WIKI_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);
}

export function getAllWikiPages(): WikiPage[] {
  const pages: WikiPage[] = [];
  const categories = getCategoryDirs();

  for (const category of categories) {
    const catDir = path.join(WIKI_ROOT, category);
    let files: string[];
    try {
      files = fs.readdirSync(catDir).filter((f) => f.endsWith(".md"));
    } catch {
      continue;
    }

    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const fullPath = path.join(catDir, file);
      let raw: string;
      try {
        raw = fs.readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }

      let data: Record<string, unknown> = {};
      let content = raw;
      try {
        const parsed = matter(raw);
        data = parsed.data;
        content = parsed.content;
      } catch {
        // YAML 파싱 실패 시 frontmatter 없이 처리
      }
      const titleFromContent =
        content.split("\n").find((l) => l.startsWith("# "))?.replace(/^#\s+/, "") ?? file;

      pages.push({
        slug,
        title: String(data.title ?? titleFromContent),
        category: String(data.category ?? category),
        tags: Array.isArray(data.tags) ? data.tags : [],
        source: String(data.source ?? ""),
        created: String(data.created ?? ""),
        expires: String(data.expires ?? ""),
        type: String(data.type ?? ""),
        excerpt:
          content
            .replace(/^#+.*/gm, "")
            .replace(/\[\[.*?\]\]/g, "")
            .trim()
            .slice(0, 120) + "…",
      });
    }
  }

  return pages.sort((a, b) => (b.created > a.created ? 1 : -1));
}

export function getWikiPageBySlug(slug: string): WikiPageDetail | null {
  const categories = getCategoryDirs();

  for (const category of categories) {
    const catDir = path.join(WIKI_ROOT, category);
    const filePath = path.join(catDir, `${slug}.md`);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf-8");
    let data: Record<string, unknown> = {};
    let content = raw;
    try {
      const parsed = matter(raw);
      data = parsed.data;
      content = parsed.content;
    } catch {
      // YAML 파싱 실패 시 frontmatter 없이 처리
    }
    const titleFromContent =
      content.split("\n").find((l) => l.startsWith("# "))?.replace(/^#\s+/, "") ?? slug;

    return {
      slug,
      title: String(data.title ?? titleFromContent),
      category: String(data.category ?? category),
      tags: Array.isArray(data.tags) ? data.tags : [],
      source: String(data.source ?? ""),
      created: String(data.created ?? ""),
      expires: String(data.expires ?? ""),
      type: String(data.type ?? ""),
      excerpt: content.trim().slice(0, 120) + "…",
      content,
    };
  }

  return null;
}

export function getWikiStats() {
  const pages = getAllWikiPages();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeek = pages.filter((p) => {
    if (!p.created) return false;
    return new Date(p.created) >= oneWeekAgo;
  }).length;

  const expiring = pages.filter((p) => {
    if (!p.expires || p.expires === "never") return false;
    const exp = new Date(p.expires);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return exp <= thirtyDaysLater && exp >= now;
  }).length;

  const categories: Record<string, number> = {};
  for (const p of pages) {
    categories[p.category] = (categories[p.category] ?? 0) + 1;
  }

  return {
    total: pages.length,
    this_week: thisWeek,
    expiring,
    conflicts: 0,
    categories,
    recent: pages.slice(0, 10).map((p) => ({ slug: p.slug, title: p.title, category: p.category })),
  };
}
