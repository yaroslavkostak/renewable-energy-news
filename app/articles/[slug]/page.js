import Link from 'next/link';
import { getArticleSlugs, getArticleBySlug } from '../../../lib/articles';
import ReactMarkdown from 'react-markdown';

export function generateStaticParams() {
  const slugs = getArticleSlugs().map((f) => f.replace(/\.md$/, ''));
  if (slugs.length === 0) return [{ slug: '_no_articles_yet' }];
  return slugs.map((slug) => ({ slug }));
}

export default function ArticlePage({ params }) {
  const slug = params?.slug;
  if (slug === '_no_articles_yet') {
    return (
      <div>
        <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
        <p>Noch keine Artikel vorhanden.</p>
      </div>
    );
  }
  const article = slug ? getArticleBySlug(slug) : null;

  if (!article) {
    return (
      <div>
        <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
        <p>Artikel nicht gefunden.</p>
      </div>
    );
  }

  const dateStr = article.date
    ? new Date(article.date).toLocaleDateString('de-AT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <>
      <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
      <article>
        <header className="article-header">
          <h1>{article.title}</h1>
          <div className="article-meta">
            {dateStr}
            {article.sourceName && ` · ${article.sourceName}`}
          </div>
          {article.image && (
            <div style={{ marginTop: 16 }}>
              <img src={article.image} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
              {article.imageAttribution && (
                <p className="image-attribution">{article.imageAttribution}</p>
              )}
            </div>
          )}
        </header>
        <div className="article-body">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </article>
    </>
  );
}
