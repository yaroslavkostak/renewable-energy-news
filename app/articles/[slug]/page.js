import Link from 'next/link';
import { getArticleSlugs, getArticleBySlug, CATEGORY_LABELS, tagToSlug } from '../../../lib/articles';
import ReactMarkdown from 'react-markdown';
import ArticleImage from '../ArticleImage';
import { getSiteBaseUrl } from '../../layout';

const TOC_SKIP = ['inhaltsübersicht', 'häufige fragen'];

function extractH2FromContent(content) {
  if (!content) return [];
  const re = /^## (.+)$/gm;
  const out = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const title = m[1].trim();
    const lower = title.toLowerCase();
    if (TOC_SKIP.some((s) => lower.includes(s))) continue;
    out.push({ title, slug: tagToSlug(title) });
  }
  return out;
}

function contentWithoutTocBlock(content) {
  if (!content) return content;
  return content.replace(/^## Inhaltsübersicht\n\n[\s\S]*?(?=\n## |\n$|$)/m, '').trim();
}

/** Split body: first part = first H2 + first paragraph, rest = remainder. */
function splitBodyAfterFirstParagraph(content) {
  if (!content || !content.includes('\n\n')) return { firstPart: content || '', restPart: '' };
  const first = content.indexOf('\n\n');
  const second = content.indexOf('\n\n', first + 2);
  if (second === -1) return { firstPart: content, restPart: '' };
  return {
    firstPart: content.slice(0, second + 2),
    restPart: content.slice(second + 2),
  };
}

function getTextFromChildren(children) {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  const arr = Array.isArray(children) ? children : [children];
  return arr.map((c) => {
    if (typeof c === 'string') return c;
    if (c?.props?.children) return getTextFromChildren(c.props.children);
    return '';
  }).join('');
}

export function generateStaticParams() {
  const slugs = getArticleSlugs().map((f) => f.replace(/\.md$/, ''));
  if (slugs.length === 0) return [{ slug: '_no_articles_yet' }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const slug = params?.slug;
  if (!slug || slug === '_no_articles_yet') return {};
  const article = getArticleBySlug(slug);
  if (!article) return {};
  const rawTime =
    article.time && typeof article.time === 'string' ? article.time.replace('.', ':') : '';
  const timeNorm = /^\d{1,2}:\d{2}$/.test(rawTime) ? `${rawTime}:00` : rawTime || null;
  const dateTime =
    article.date && timeNorm
      ? `${article.date}T${timeNorm}`
      : article.date
        ? `${article.date}T12:00:00`
        : null;
  const baseUrl = getSiteBaseUrl().replace(/\/$/, '');
  return {
    title: article.title,
    description: article.description || undefined,
    alternates: {
      canonical: `${baseUrl}/articles/${slug}/`,
    },
    openGraph: {
      title: article.title,
      description: article.description || undefined,
      type: 'article',
      ...(dateTime && { publishedTime: dateTime }),
    },
  };
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
    ? new Date(article.date + 'T12:00:00').toLocaleDateString('de-AT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const timeStr = article.time ? `, ${article.time} Uhr` : '';

  const tocHeadingsRaw = extractH2FromContent(article.content);
  const tocHeadings = tocHeadingsRaw.filter((h, i, arr) => arr.findIndex((x) => x.slug === h.slug) === i);
  const bodyContent = contentWithoutTocBlock(article.content);
  const { firstPart, restPart } = splitBodyAfterFirstParagraph(bodyContent);
  const showToc = tocHeadings.length >= 3;

  const markdownComponents = {
    h2: ({ children, ...props }) => {
      const id = tagToSlug(getTextFromChildren(children));
      return id ? <h2 id={id} {...props}>{children}</h2> : <h2 {...props}>{children}</h2>;
    },
    a: ({ href, children, node, position, ..._rest }) => (
      <a href={href} rel="nofollow noopener noreferrer" target="_blank">
        {children}
      </a>
    ),
  };

  return (
    <>
      <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
      <article>
        <header className="article-header">
          <h1>{article.title}</h1>
          <div className="article-meta">
            {dateStr}{timeStr}
          </div>
          {article.image && (
            <ArticleImage
              src={article.image}
              alt={article.imageAlt || article.title || ''}
              attribution={article.imageAttribution}
            />
          )}
        </header>
        <div className="article-body">
          <ReactMarkdown components={markdownComponents}>{firstPart}</ReactMarkdown>
          {showToc && (
            <details className="article-toc-accordion">
              <summary className="article-toc-accordion-summary">Inhaltsübersicht</summary>
              <nav className="article-toc" aria-label="Inhaltsverzeichnis">
                <ul className="article-toc-list">
                  {tocHeadings.map(({ title, slug }) => (
                    <li key={slug}>
                      <a href={`#${slug}`} className="article-toc-link">{title}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>
          )}
          {restPart ? (
            <ReactMarkdown components={markdownComponents}>{restPart}</ReactMarkdown>
          ) : null}
        </div>
        <footer className="article-footer">
          {Array.isArray(article.tags) && article.tags.length > 0 && (
            <div className="article-tags">
              <span className="article-footer-label">Beliebte Themen / Keywords:</span>{' '}
              {article.tags.map((tag) => (
                <Link key={tag} href={`/?tag=${tagToSlug(tag)}`} className="article-tag">
                  #{' '}{tag}
                </Link>
              ))}
            </div>
          )}
          <div className="article-category">
            <span className="article-footer-label">Erscheint in:</span>{' '}
            <Link href="/">Hauptseite</Link>
            {article.category && CATEGORY_LABELS[article.category] && (
              <>
                <span aria-hidden="true"> · </span>
                <Link href={`/?cat=${article.category}`}>
                  {CATEGORY_LABELS[article.category]}
                </Link>
              </>
            )}
          </div>
        </footer>
      </article>
    </>
  );
}
