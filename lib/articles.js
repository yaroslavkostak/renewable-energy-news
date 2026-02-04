import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

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
    };
  });
  articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (category) return articles.filter((a) => a.category === category);
  return articles;
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
    content,
  };
}
