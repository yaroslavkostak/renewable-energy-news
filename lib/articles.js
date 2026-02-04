import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { tagToSlug as tagToSlugFn } from './tagSlug.js';

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

/** Anzeigenamen für Kategorien (Hauptseite = alle, keine eigene Kategorie) */
export const CATEGORY_LABELS = {
  austria: 'Österreich',
  germany: 'Deutschland / DACH',
  global: 'Global',
  science: 'Wissenschaft',
};

export { tagToSlugFn as tagToSlug };

export function getArticleSlugs() {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md'));
}

export function getArticlesList(category = null) {
  const slugs = getArticleSlugs();
  const articles = slugs.map((filename) => {
    const fullPath = path.join(ARTICLES_DIR, filename);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(raw);
    const slug = filename.replace(/\.md$/, '');
    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || '',
      category: data.category || 'global',
      sourceName: data.sourceName || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  });
  articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (category) return articles.filter((a) => a.category === category);
  return articles;
}

/** Top-Tags aus allen Artikeln für Beliebte Themen (Name, slug, count). */
export function getPopularTags(limit = 15) {
  const articles = getArticlesList();
  const countBySlug = new Map();
  const nameBySlug = new Map();
  for (const a of articles) {
    for (const tag of a.tags || []) {
      const slug = tagToSlugFn(tag);
      if (!slug) continue;
      countBySlug.set(slug, (countBySlug.get(slug) || 0) + 1);
      if (!nameBySlug.has(slug)) nameBySlug.set(slug, tag);
    }
  }
  const sorted = [...countBySlug.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  return sorted.map(([slug, count]) => ({ slug, name: nameBySlug.get(slug) || slug, count }));
}

export function getArticleBySlug(slug) {
  const fullPath = path.join(ARTICLES_DIR, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;
  const raw = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || '',
    category: data.category || 'global',
    sourceName: data.sourceName || '',
    sourceUrl: data.sourceUrl || '',
    image: data.image || '',
    imageAttribution: data.imageAttribution || '',
    imageDescription: data.imageDescription || '',
    imageAlt: data.imageAlt || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    content,
  };
}
